// Shared ticket-fulfillment pipeline.
//
// Turns a PAID `pending_transactions` row (looked up by order_id) into issued tickets,
// updated inventory, earnings, and buyer notifications — exactly once.
//
// This generalizes the logic that the MonCash Button return handler performs after it has
// verified a payment, so other providers (e.g. Sogepay) can fulfill consistently without
// re-implementing currency handling, the idempotency claim, inventory increments, etc.
//
// IMPORTANT: callers MUST verify the payment with the provider BEFORE calling fulfillPaidOrder.
// This module does not talk to any payment gateway; it trusts that the order is paid.

import { createClient } from '@/lib/firebase-db/server'
import { adminDb } from '@/lib/firebase/admin'
import {
  buildTierSoldIncrements,
  reserveInventoryAtomic,
  releaseInventoryReservation,
} from '@/lib/tickets/inventory'
import { addTicketToEarnings } from '@/lib/earnings'
import { generateTicketQRCode } from '@/lib/qrcode'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { notifyTicketPurchase as notifyTicketPurchaseNotification } from '@/lib/notifications/helpers'
import { redeemPromoInTransaction } from '@/lib/promo-codes'

// Window after which a stuck "processing" claim is considered stale and may be re-claimed
// (e.g. if a previous fulfillment attempt crashed mid-way).
const FULFILLMENT_CLAIM_STALE_MS = 90_000

export type FulfillmentClaim =
  | { outcome: 'claimed' }
  | { outcome: 'already_completed'; ticketId: string | null }
  | { outcome: 'in_progress' }
  | { outcome: 'not_found' }

/**
 * Atomically claim a pending transaction (looked up by order_id) for fulfillment.
 * Uses a Firestore transaction so only ONE concurrent request creates tickets for a given
 * paid order. Prevents duplicate tickets / double-counted earnings when a return/callback is
 * hit more than once.
 */
export async function claimOrderForFulfillment(orderId: string): Promise<FulfillmentClaim> {
  const snap = await adminDb
    .collection('pending_transactions')
    .where('order_id', '==', orderId)
    .limit(1)
    .get()

  if (snap.empty) return { outcome: 'not_found' }
  const ref = snap.docs[0].ref

  return adminDb.runTransaction(async (tx: any) => {
    const doc = await tx.get(ref)
    if (!doc.exists) return { outcome: 'not_found' } as FulfillmentClaim

    const data = doc.data() || {}

    if (data.status === 'completed' && data.ticket_id) {
      return { outcome: 'already_completed', ticketId: String(data.ticket_id) } as FulfillmentClaim
    }

    if (data.status === 'processing' && data.fulfillment_started_at) {
      const startedAt = new Date(data.fulfillment_started_at).getTime()
      if (Number.isFinite(startedAt) && Date.now() - startedAt < FULFILLMENT_CLAIM_STALE_MS) {
        return { outcome: 'in_progress' } as FulfillmentClaim
      }
    }

    tx.update(ref, {
      status: 'processing',
      fulfillment_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return { outcome: 'claimed' } as FulfillmentClaim
  })
}

/**
 * Release a fulfillment claim so the order can be retried later (used when ticket creation
 * fails after the claim was taken).
 */
export async function releaseOrderClaim(orderId: string): Promise<void> {
  try {
    const snap = await adminDb
      .collection('pending_transactions')
      .where('order_id', '==', orderId)
      .limit(1)
      .get()
    if (snap.empty) return
    await snap.docs[0].ref.set(
      { status: 'pending', fulfillment_started_at: null, updated_at: new Date().toISOString() },
      { merge: true }
    )
  } catch (err) {
    console.error('[fulfillment] failed to release fulfillment claim', err)
  }
}

export interface FulfillPaidOrderResult {
  outcome:
    | 'fulfilled'
    | 'already_completed'
    | 'in_progress'
    | 'not_found'
    | 'ticket_creation_failed'
    | 'capacity_exceeded'
  ticketId: string | null
  /** Set when outcome === 'capacity_exceeded' so the caller can refund/flag the paid order. */
  capacity?: { reason?: string; tierId?: string | null; remaining?: number }
}

interface TierSelection {
  tierId?: string | null
  tierName?: string
  quantity: number
  unitPrice: number
  originalUnitPrice?: number
}

/**
 * Fulfill a paid order: create tickets, increment inventory, update earnings, notify the buyer,
 * and mark the pending transaction completed. Idempotent via claimOrderForFulfillment.
 *
 * @param params.orderId        The gateway order id stored on the pending transaction.
 * @param params.paymentMethod  Normalized payment-method label written onto tickets/earnings.
 * @param params.transactionId  Provider transaction id (used as payment_id; falls back to orderId).
 * @param params.payer          Optional payer identifier to persist for auditing.
 * @param params.logPrefix      Log namespace, e.g. "[sogepay]".
 */
export async function fulfillPaidOrder(params: {
  orderId: string
  paymentMethod: string
  transactionId?: string | null
  payer?: string | null
  logPrefix?: string
}): Promise<FulfillPaidOrderResult> {
  const { orderId, paymentMethod } = params
  const transactionId = params.transactionId || null
  const logPrefix = params.logPrefix || '[fulfillment]'

  const claim = await claimOrderForFulfillment(orderId)
  if (claim.outcome === 'already_completed') {
    return { outcome: 'already_completed', ticketId: claim.ticketId }
  }
  if (claim.outcome === 'in_progress') {
    return { outcome: 'in_progress', ticketId: null }
  }
  if (claim.outcome === 'not_found') {
    return { outcome: 'not_found', ticketId: null }
  }
  // claim.outcome === 'claimed': we own fulfillment for this order from here on.

  const supabase = await createClient()

  const { data: pendingTx } = await supabase
    .from('pending_transactions')
    .select('*')
    .eq('order_id', orderId)
    .single()

  if (!pendingTx) {
    await releaseOrderClaim(orderId)
    return { outcome: 'not_found', ticketId: null }
  }

  const { data: eventDetails } = await supabase
    .from('events')
    .select('*')
    .eq('id', pendingTx.event_id)
    .single()

  const { data: attendee } = await supabase
    .from('users')
    .select('*')
    .eq('id', pendingTx.user_id)
    .single()

  const tierSelections: TierSelection[] =
    Array.isArray(pendingTx.tier_selections) && pendingTx.tier_selections.length > 0
      ? pendingTx.tier_selections
      : [
          {
            tierId: pendingTx.tier_id || null,
            tierName: pendingTx.tier_name || 'General Admission',
            quantity: pendingTx.quantity || 1,
            unitPrice: (pendingTx.amount || 0) / Math.max(1, pendingTx.quantity || 1),
          },
        ]

  const eventCurrency =
    String(pendingTx.original_currency || pendingTx.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG'
  const chargedCurrency = String(pendingTx.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG'
  const fxRate = pendingTx.exchange_rate_used != null ? Number(pendingTx.exchange_rate_used) : null
  const fxBaseRate = pendingTx.exchange_rate_base != null ? Number(pendingTx.exchange_rate_base) : null
  const fxSpreadPercent =
    pendingTx.exchange_rate_spread_percent != null ? Number(pendingTx.exchange_rate_spread_percent) : null
  const fxProvider = pendingTx.exchange_rate_provider != null ? String(pendingTx.exchange_rate_provider) : null
  const fxFetchedAt = pendingTx.exchange_rate_fetched_at != null ? String(pendingTx.exchange_rate_fetched_at) : null

  // Authoritative oversell gate: atomically re-check capacity and reserve inventory BEFORE issuing
  // any tickets. Under load this is what actually prevents overselling (the initiate-time check is
  // only a fast-fail UX hint). If it refuses, the order is paid but can't be honored — mark it for
  // refund and do NOT create tickets.
  const tierIncrements = buildTierSoldIncrements(tierSelections)
  const reservation = await reserveInventoryAtomic({
    eventId: String(pendingTx.event_id),
    quantity: Number(pendingTx.quantity || 1),
    tierIncrements,
    logPrefix,
  })
  if (!reservation.ok) {
    console.error(`${logPrefix} capacity exceeded after payment — refusing to issue tickets`, {
      orderId,
      reason: reservation.reason,
      tierId: reservation.tierId,
      remaining: reservation.remaining,
    })
    await supabase
      .from('pending_transactions')
      .update({ status: 'failed', failure_reason: 'capacity_exceeded', needs_refund: true })
      .eq('order_id', orderId)
    return {
      outcome: 'capacity_exceeded',
      ticketId: null,
      capacity: { reason: reservation.reason, tierId: reservation.tierId, remaining: reservation.remaining },
    }
  }

  const createdTickets: any[] = []

  for (const selection of tierSelections) {
    const selectionQty = selection.quantity || 0
    for (let i = 0; i < selectionQty; i++) {
      const organizerUnitPrice = (() => {
        if (eventCurrency === 'USD') {
          const raw = selection.originalUnitPrice
          if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw
          const fallback = Number(pendingTx.original_amount || 0) / Math.max(1, pendingTx.quantity || 1)
          return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
        }
        return selection.unitPrice
      })()

      const ticketData = {
        event_id: pendingTx.event_id,
        attendee_id: pendingTx.user_id,
        attendee_name: attendee?.full_name || attendee?.email || 'Guest',
        price_paid: organizerUnitPrice,
        currency: eventCurrency,
        original_currency: eventCurrency,
        exchange_rate_used: fxRate,
        charged_amount: selection.unitPrice,
        charged_currency: chargedCurrency,
        payment_method: paymentMethod,
        payment_id: transactionId || orderId,
        status: 'valid',
        purchased_at: new Date().toISOString(),
        tier_name: selection.tierName || 'General Admission',
        tier_id: selection.tierId || '',
        start_datetime: eventDetails?.start_datetime || null,
        end_datetime: eventDetails?.end_datetime || null,
        event_date: eventDetails?.start_datetime || null,
        venue_name: eventDetails?.venue_name || null,
        city: eventDetails?.city || null,
      }

      const insertResult = await supabase.from('tickets').insert([ticketData]).select()

      if (insertResult.error) {
        console.error(`${logPrefix} failed to create ticket`, insertResult.error)
        // Return the inventory we reserved (above) and release the claim so a later retry can
        // re-reserve and re-attempt fulfillment for this paid order.
        await releaseInventoryReservation({
          eventId: String(pendingTx.event_id),
          quantity: Number(pendingTx.quantity || 1),
          tierIncrements,
          logPrefix,
        })
        await releaseOrderClaim(orderId)
        return { outcome: 'ticket_creation_failed', ticketId: null }
      }

      const createdTicket = insertResult.data?.[0]
      if (createdTicket) {
        await supabase.from('tickets').update({ qr_code_data: createdTicket.id }).eq('id', createdTicket.id)
        createdTicket.qr_code_data = createdTicket.id
        createdTickets.push(createdTicket)

        // Mirror into Firestore for organizer earnings and admin analytics.
        try {
          await adminDb.collection('tickets').doc(String(createdTicket.id)).set(
            {
              event_id: pendingTx.event_id,
              attendee_id: pendingTx.user_id,
              user_id: pendingTx.user_id,
              status: 'confirmed',
              ticket_type: selection.tierName || 'General Admission',
              tier_id: selection.tierId || '',
              price_paid: organizerUnitPrice,
              currency: eventCurrency,
              exchange_rate_used: fxRate,
              exchange_rate_base: fxBaseRate,
              exchange_rate_spread_percent: fxSpreadPercent,
              exchange_rate_provider: fxProvider,
              exchange_rate_fetched_at: fxFetchedAt,
              charged_amount: selection.unitPrice,
              charged_currency: chargedCurrency,
              payment_method: paymentMethod,
              payment_id: transactionId || orderId,
              purchased_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { merge: true }
          )
        } catch (e) {
          console.warn(`${logPrefix} failed to mirror ticket to Firestore`, {
            ticketId: createdTicket.id,
            message: (e as any)?.message,
          })
        }
      }
    }
  }

  // Redeem the promo code atomically (Firestore) — the SINGLE redemption point for any order
  // fulfilled through this shared pipeline (currently Sogepay). We hold the exclusive fulfillment
  // claim (claimOrderForFulfillment) from here on, so this runs exactly once per paid order.
  // pendingTx.promo_code_id is the resolved promo doc id, stamped at initiate only when a discount
  // was applied. If the "first N buyers" cap filled between initiate and confirm we keep the
  // issued tickets and only log the over-cap; redemption never throws.
  if (createdTickets.length > 0 && pendingTx.promo_code_id) {
    try {
      const redeem = await redeemPromoInTransaction({
        promoId: String(pendingTx.promo_code_id),
        qty: Number(pendingTx.quantity || createdTickets.length || 1),
        userId: pendingTx.user_id ? String(pendingTx.user_id) : null,
        eventId: pendingTx.event_id ? String(pendingTx.event_id) : null,
        discountApplied:
          pendingTx.promo_discount_total != null ? Number(pendingTx.promo_discount_total) : null,
      })
      if (redeem.capReached) {
        console.warn(`${logPrefix} promo cap reached at confirm; tickets kept, not over-counted`, {
          promoId: String(pendingTx.promo_code_id),
          eventId: pendingTx.event_id,
        })
      }
    } catch (promoErr) {
      console.error(`${logPrefix} promo redemption failed`, (promoErr as any)?.message)
    }
  }

  // Update Firestore earnings in event currency.
  try {
    const grossEventCents = Math.round(Number(pendingTx.original_amount || pendingTx.amount || 0) * 100)
    await addTicketToEarnings(pendingTx.event_id, grossEventCents, Number(pendingTx.quantity || 1), {
      currency: eventCurrency,
      paymentMethod,
      chargedAmountCents: Math.round(Number(pendingTx.amount || 0) * 100),
      fxRate,
      chargedCurrency,
    })
  } catch (e) {
    console.warn(`${logPrefix} failed to update earnings`, { message: (e as any)?.message })
  }

  const ticket = createdTickets[0]
    ? { ...createdTickets[0], event: eventDetails, attendee }
    : null

  // Mark the transaction completed.
  await supabase
    .from('pending_transactions')
    .update({
      status: 'completed',
      ticket_id: ticket?.id || null,
      transaction_id: transactionId || null,
      payer: params.payer || null,
    })
    .eq('order_id', orderId)

  // NOTE: inventory was already incremented up front by reserveInventoryAtomic (the oversell gate),
  // so we intentionally do NOT increment again here.

  // QR + buyer notifications (best-effort; never fail an already-paid order on notify errors).
  if (ticket?.id) {
    try {
      const qrCodeDataURL = await generateTicketQRCode(ticket.id)

      if (pendingTx.user_id && pendingTx.event_id && eventDetails?.title) {
        try {
          await notifyTicketPurchaseNotification(
            String(pendingTx.user_id),
            String(pendingTx.event_id),
            String(eventDetails.title),
            createdTickets.length || (pendingTx.quantity || 1)
          )
        } catch (error) {
          console.error(`${logPrefix} failed to send purchase notification`, error)
        }
      }

      if (ticket.attendee && ticket.event) {
        const quantity = pendingTx.quantity || 1
        const ticketWord = quantity > 1 ? `${quantity} tickets` : 'ticket'

        try {
          await sendEmail({
            to: ticket.attendee.email,
            subject: `Your ${ticketWord} for ${ticket.event.title}`,
            html: getTicketConfirmationEmail({
              attendeeName: ticket.attendee.full_name || 'Guest',
              eventTitle: ticket.event.title,
              eventDate: new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              eventVenue: `${ticket.event.venue_name}, ${ticket.event.city}`,
              ticketId: ticket.id,
              qrCodeDataURL,
            }),
          })
        } catch (error) {
          console.error(`${logPrefix} failed to send confirmation email`, error)
        }

        if (ticket.attendee.phone) {
          try {
            await sendWhatsAppMessage({
              to: ticket.attendee.phone,
              message: getTicketConfirmationWhatsApp(
                ticket.attendee.full_name || 'Guest',
                ticket.event.title,
                new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }),
                `${ticket.event.venue_name}, ${ticket.event.city}`,
                ticket.id
              ),
            })
          } catch (error) {
            console.error(`${logPrefix} failed to send WhatsApp confirmation`, error)
          }
        }
      }
    } catch (error) {
      console.error(`${logPrefix} post-fulfillment notification error`, error)
    }
  }

  return { outcome: 'fulfilled', ticketId: ticket?.id || null }
}
