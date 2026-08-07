import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'
import { hasEventAccess } from '@/lib/events/access-guard'
import { FieldValue } from 'firebase-admin/firestore'
import { buildTierSoldIncrements, reserveInventoryAtomic } from '@/lib/tickets/inventory'

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

    // `tierId` is optional. When supplied (an event offering free AND paid tiers
    // side by side, where the buyer explicitly picked the free one) that exact
    // tier is validated and used. When absent the event's free/default tier is
    // resolved as before, so the plain free-event flow is unchanged.
    const { eventId, quantity = 1, tierId } = await request.json()
    console.log('Event ID:', eventId, 'Quantity:', quantity, 'Tier:', tierId || '(auto)')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Validate quantity
    const ticketQuantity = Math.min(Math.max(1, quantity), 10) // Max 10 tickets per claim
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
    let resolvedTierId = ''
    let resolvedTierName = ''

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

    if (tierId) {
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
      resolvedTierId = String(tier.id)
      resolvedTierName = String(tier.name || 'General Admission')
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
      resolvedTierId = String(onSaleFree.id)
      resolvedTierName = String(onSaleFree.name || 'General Admission')
    } else {
      // Legacy event with no tier docs at all: fall back to the event-level price.
      if (Number(event.ticket_price || 0) > 0) {
        return NextResponse.json({ error: 'This is not a free event' }, { status: 400 })
      }
      resolvedTierName = 'General Admission'
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
    const tierIncrements = buildTierSoldIncrements(
      resolvedTierId ? [{ tierId: resolvedTierId, quantity: ticketQuantity }] : []
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

    // Create tickets one at a time to ensure each gets a unique ID
    const createdTickets = []
    for (let i = 0; i < ticketQuantity; i++) {
      const ticketData = {
        event_id: eventId,
        attendee_id: user.id,
        attendee_name: user.full_name || user.email || 'Guest',
        status: 'valid',
        price_paid: 0,
        currency: event.currency || 'HTG',
        payment_method: 'free',
        purchased_at: FieldValue.serverTimestamp(),
        tier_name: resolvedTierName || 'General Admission',
        tier_id: resolvedTierId,
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
    return NextResponse.json({ 
      success: true, 
      tickets: createdTickets,
      count: ticketQuantity,
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
