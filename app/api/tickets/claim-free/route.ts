import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'
import { hasEventAccess } from '@/lib/events/access-guard'
import { FieldValue } from 'firebase-admin/firestore'
import { buildTierSoldIncrements, reserveInventoryAtomic } from '@/lib/tickets/inventory'

/** Hard cap on how many free tickets one claim may issue, across all tiers. */
const MAX_FREE_TICKETS_PER_CLAIM = 10

/** One validated line of a claim: which tier, how many, and what to name the tickets. */
interface TierClaim {
  /** '' for a legacy event with no tier docs — those tickets carry no tier_id. */
  tierId: string
  tierName: string
  quantity: number
}

/**
 * Normalize and merge a `selections: [{ tierId, quantity }]` payload.
 * Duplicate tier ids are summed so "2 + 3 of the same tier" is one line of 5, and
 * non-positive / unparseable quantities are dropped rather than silently issued.
 */
function normalizeSelections(
  raw: unknown
): Array<{ tierId: string; quantity: number }> {
  if (!Array.isArray(raw)) return []
  const merged = new Map<string, number>()
  for (const entry of raw) {
    const tierId = String((entry as any)?.tierId ?? '').trim()
    const qty = Math.trunc(Number((entry as any)?.quantity ?? 0))
    if (!tierId || !Number.isFinite(qty) || qty <= 0) continue
    merged.set(tierId, (merged.get(tierId) || 0) + qty)
  }
  return Array.from(merged.entries()).map(([tierId, quantity]) => ({ tierId, quantity }))
}

/**
 * Sale-window / active / sold-out gate for a tier, mirroring the paid initiate
 * routes so a FREE tier is held to exactly the same rules as a paid one.
 */
function tierIsOnSale(tier: any, now: Date): { ok: true } | { ok: false; reason: string } {
  if (tier?.is_active === false) return { ok: false, reason: 'This ticket tier is not available.' }

  const salesStart = tier?.sales_start ? new Date(tier.sales_start) : null
  const salesEnd = tier?.sales_end ? new Date(tier.sales_end) : null

  if (salesStart && !Number.isNaN(salesStart.getTime()) && salesStart > now) {
    return { ok: false, reason: 'Ticket sales for this tier have not started yet.' }
  }
  if (salesEnd && !Number.isNaN(salesEnd.getTime()) && salesEnd < now) {
    return { ok: false, reason: 'Ticket sales for this tier have ended.' }
  }

  // 0 / missing total ⇒ unlimited (matches reserveInventoryAtomic's convention).
  const total = Number(tier?.total_quantity ?? tier?.quantity ?? 0)
  if (Number.isFinite(total) && total > 0) {
    const sold = Number(tier?.sold_quantity || 0)
    if (total - sold <= 0) return { ok: false, reason: 'This ticket tier is sold out.' }
  }

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    console.log('=== CLAIM FREE TICKET ===')
    console.log('User:', user?.id, user?.email)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TWO accepted payload shapes:
    //
    //  1. `{ eventId, tierId?, quantity? }` — the ORIGINAL shape. Mobile build 10
    //     is in testers' hands sending exactly this, so its behavior is frozen:
    //     one tier (explicit via `tierId`, or auto-resolved to the event's free
    //     tier), `quantity` clamped to 1..10.
    //  2. `{ eventId, selections: [{ tierId, quantity }] }` — the web selector has
    //     no single-tier enforcement, so a free cart can span several tiers and
    //     quantities. Each line is validated independently and the whole claim is
    //     reserved atomically (all-or-nothing).
    //
    // `selections` wins when present and non-empty; otherwise shape 1 runs verbatim.
    const { eventId, quantity = 1, tierId, selections } = await request.json()
    const requestedSelections = normalizeSelections(selections)
    const useSelections = requestedSelections.length > 0
    console.log(
      'Event ID:', eventId,
      'Quantity:', quantity,
      'Tier:', tierId || '(auto)',
      'Selections:', useSelections ? JSON.stringify(requestedSelections) : '(none)'
    )

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    if (Array.isArray(selections) && selections.length > 0 && !useSelections) {
      // Caller sent a selections array but every line was unusable.
      return NextResponse.json({ error: 'No valid ticket selections provided' }, { status: 400 })
    }

    // Validate quantity. For the selections shape the total across all tiers is
    // capped — and REFUSED rather than truncated, since silently trimming a
    // multi-tier cart would issue an order the buyer never asked for.
    const selectionsTotal = requestedSelections.reduce((sum, s) => sum + s.quantity, 0)
    if (useSelections && selectionsTotal > MAX_FREE_TICKETS_PER_CLAIM) {
      return NextResponse.json(
        { error: `You can claim at most ${MAX_FREE_TICKETS_PER_CLAIM} free tickets at a time.` },
        { status: 400 }
      )
    }
    const ticketQuantity = useSelections
      ? selectionsTotal
      : Math.min(Math.max(1, quantity), MAX_FREE_TICKETS_PER_CLAIM)
    console.log('Validated quantity:', ticketQuantity)

    // Fetch event details from Firestore
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    
    console.log('Event fetch result:', { exists: eventDoc.exists, id: eventDoc.id })

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const event = { id: eventDoc.id, ...eventDoc.data() } as any

    // Password-protected events: require a valid access grant before issuing tickets.
    if (!(await hasEventAccess(event, eventId, user.id))) {
      return NextResponse.json({ error: 'access_code_required' }, { status: 403 })
    }

    // Resolve WHICH tier is being claimed, and prove it is actually free.
    //
    // An event may offer a free tier alongside paid ones. `event.ticket_price` is
    // the LOWEST tier price, so it is 0 for such an event and cannot be used to
    // decide whether this claim is legitimate — that would let a buyer claim a
    // free ticket on any event whose cheapest tier happens to be 0. The tier's
    // OWN price is the authority, and it is held to the same sale-window /
    // is_active / sold-out gate as the paid routes.
    //
    // Both payload shapes end up as the same list of validated `TierClaim` lines.
    let claims: TierClaim[] = []

    let tierDocs: any[] = []
    try {
      const tiersSnap = await adminDb
        .collection('ticket_tiers')
        .where('event_id', '==', eventId)
        .get()
      tierDocs = tiersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
    } catch (tierErr) {
      console.warn('[claim-free] failed to load tiers', { message: (tierErr as any)?.message })
    }

    if (useSelections) {
      // Multi-tier claim. EVERY line is held to exactly the same gate as the
      // single-tier path: belongs to this event, its OWN price is 0, is_active,
      // inside the sale window, and not sold out. One bad line fails the claim —
      // partial issuance would charge the buyer's per-event free allowance for an
      // order they didn't get.
      const now = new Date()
      for (const sel of requestedSelections) {
        const tier = tierDocs.find((t: any) => String(t.id) === sel.tierId)
        if (!tier) {
          return NextResponse.json({ error: 'Ticket tier not found for this event' }, { status: 404 })
        }
        if (Number(tier.price || 0) > 0) {
          return NextResponse.json({ error: 'This ticket tier is not free' }, { status: 400 })
        }
        const onSale = tierIsOnSale(tier, now)
        if (!onSale.ok) {
          return NextResponse.json({ error: onSale.reason }, { status: 400 })
        }
        claims.push({
          tierId: String(tier.id),
          tierName: String(tier.name || 'General Admission'),
          quantity: sel.quantity,
        })
      }
    } else if (tierId) {
      // Explicit tier: it must belong to THIS event, be free, and be on sale.
      const tier = tierDocs.find((t: any) => String(t.id) === String(tierId))
      if (!tier) {
        return NextResponse.json({ error: 'Ticket tier not found for this event' }, { status: 404 })
      }
      if (Number(tier.price || 0) > 0) {
        return NextResponse.json({ error: 'This ticket tier is not free' }, { status: 400 })
      }
      const onSale = tierIsOnSale(tier, new Date())
      if (!onSale.ok) {
        return NextResponse.json({ error: onSale.reason }, { status: 400 })
      }
      claims = [{
        tierId: String(tier.id),
        tierName: String(tier.name || 'General Admission'),
        quantity: ticketQuantity,
      }]
    } else if (tierDocs.length > 0) {
      // No explicit tier: pick the event's free tier. If NO tier is free, the
      // event has nothing to give away — refuse rather than issuing a ticket for
      // a paid tier at no charge.
      const freeTiers = tierDocs
        .filter((t: any) => Number(t.price || 0) === 0)
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      if (freeTiers.length === 0) {
        return NextResponse.json({ error: 'This is not a free event' }, { status: 400 })
      }
      const onSaleFree = freeTiers.find((t: any) => tierIsOnSale(t, new Date()).ok)
      if (!onSaleFree) {
        const reason = tierIsOnSale(freeTiers[0], new Date())
        return NextResponse.json(
          { error: reason.ok ? 'No tickets available' : reason.reason },
          { status: 400 }
        )
      }
      claims = [{
        tierId: String(onSaleFree.id),
        tierName: String(onSaleFree.name || 'General Admission'),
        quantity: ticketQuantity,
      }]
    } else {
      // Legacy event with no tier docs at all: fall back to the event-level price.
      if (Number(event.ticket_price || 0) > 0) {
        return NextResponse.json({ error: 'This is not a free event' }, { status: 400 })
      }
      // Empty tierId — these tickets carry no tier and only count toward the
      // event-level tickets_sold (buildTierSoldIncrements skips them).
      claims = [{ tierId: '', tierName: 'General Admission', quantity: ticketQuantity }]
    }

    // Per-user dedup: never issue a second FREE ticket to the same user for the same
    // event (prevents refresh/double-click and scripted abuse from claiming unlimited
    // free inventory). Query by attendee_id only (single-field, auto-indexed) and
    // filter in memory — a user holds few tickets, so this avoids a composite index.
    //
    // Scoped to free tickets: on an event with free AND paid tiers, a buyer who
    // already PAID must not be told they "already claimed" the free tier, and their
    // paid ticket must not be returned as if it were the claim.
    const userTicketsSnap = await adminDb
      .collection('tickets')
      .where('attendee_id', '==', user.id)
      .get()
    const existing = userTicketsSnap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((t: any) => t.event_id === eventId && Number(t.price_paid ?? 0) === 0)
    if (existing.length > 0) {
      console.log('User already has free ticket(s) for event:', eventId, 'count:', existing.length)
      return NextResponse.json({
        success: true,
        tickets: existing,
        count: existing.length,
        message: 'You already claimed a ticket for this event.',
      })
    }

    // Atomic capacity gate + increment (same helper the paid paths use). Reserving BEFORE issuing
    // tickets serializes concurrent claims through a Firestore transaction so the event can't be
    // oversold, and the increment is done here (no separate non-atomic update below).
    //
    // ALL-OR-NOTHING for a multi-tier claim: one call with every tier increment, so
    // the whole order is checked and committed inside a single transaction. If any
    // one tier lacks capacity the buyer gets nothing and can retry, rather than
    // being left with a partial order that has already burned their one free claim
    // for this event.
    const tierIncrements = buildTierSoldIncrements(
      claims.map((c) => ({ tierId: c.tierId, quantity: c.quantity }))
    )
    const reservation = await reserveInventoryAtomic({
      eventId,
      quantity: ticketQuantity,
      tierIncrements,
      logPrefix: '[claim-free]',
    })
    if (!reservation.ok) {
      const remaining = Number(reservation.remaining ?? 0)
      if (remaining <= 0) {
        return NextResponse.json({ error: 'No tickets available' }, { status: 400 })
      }
      return NextResponse.json({
        error: `Only ${remaining} ticket${remaining !== 1 ? 's' : ''} remaining`,
      }, { status: 400 })
    }

    // Create tickets one at a time to ensure each gets a unique ID, tier by tier so
    // every ticket carries the tier it was actually claimed against.
    const createdTickets = []
    for (const claim of claims) {
      for (let i = 0; i < claim.quantity; i++) {
        const ticketData = {
          event_id: eventId,
          attendee_id: user.id,
          attendee_name: user.full_name || user.email || 'Guest',
          status: 'valid',
          price_paid: 0,
          currency: event.currency || 'HTG',
          payment_method: 'free',
          purchased_at: FieldValue.serverTimestamp(),
          tier_name: claim.tierName || 'General Admission',
          tier_id: claim.tierId,
          // Include event date fields for scanner
          start_datetime: event.start_datetime || null,
          end_datetime: event.end_datetime || null,
          event_date: event.start_datetime || null,
          venue_name: event.venue_name || null,
          city: event.city || null,
        }

        const ticketRef = await adminDb.collection('tickets').add(ticketData)

        // Now update with QR code data using the actual ticket ID
        await ticketRef.update({ qr_code_data: ticketRef.id })

        const createdTicketDoc = await ticketRef.get()
        const createdTicket = { id: createdTicketDoc.id, ...createdTicketDoc.data() }
        createdTickets.push(createdTicket)
        console.log('Created ticket:', createdTicket.id, 'with QR:', createdTicket.id)
      }
    }
    
    console.log('Created tickets:', createdTickets.length)

    // NOTE: inventory was already reserved/incremented atomically by reserveInventoryAtomic above,
    // so we intentionally do NOT increment tickets_sold again here.

    // Send in-app notification for free ticket claim
    try {
      await notifyTicketPurchase(
        user.id,
        eventId,
        event.title,
        ticketQuantity
      )
      
      // Notify organizer
      await notifyOrganizerTicketSale(
        event.organizer_id,
        eventId,
        event.title,
        ticketQuantity,
        0, // free event
        user.full_name
      )
    } catch (error) {
      console.error('Failed to send notification:', error)
      // Don't fail the claim if notification fails
    }

    console.log('=== SUCCESS ===')
    // `issued` says exactly what was created, per tier — a multi-tier claim's
    // caller must be able to see which tiers it actually got, not just a count.
    // Additive only: `success` / `tickets` / `count` / `message` keep the shape
    // and the wording shipped clients (mobile build 10) already parse.
    return NextResponse.json({
      success: true,
      tickets: createdTickets,
      count: ticketQuantity,
      issued: claims.map((c) => ({
        tierId: c.tierId || null,
        tierName: c.tierName,
        quantity: c.quantity,
      })),
      message: `${ticketQuantity} free ticket${ticketQuantity !== 1 ? 's' : ''} claimed successfully!`
    })
  } catch (error: any) {
    console.error('Claim free ticket error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to claim free ticket' },
      { status: 500 }
    )
  }
}
