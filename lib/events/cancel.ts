import { adminDb } from '@/lib/firebase/admin'
import { sendEmail } from '@/lib/email'
import { processStripeRefund } from '@/lib/refunds'

/**
 * Cancelling an event is a MONEY operation, not a status flag.
 *
 * Before this existed, cancel wrote `status: 'cancelled'` from the mobile client
 * and nothing else: tickets stayed valid, buyers were never told, and the
 * organizer could still withdraw the takings for an event that never happened.
 *
 * One cancel does all of it, in an order chosen so a partial failure can't pay
 * out money for a dead event:
 *   1. mark the event cancelled  — withdrawals check this and refuse (see
 *      withdraw-bank / withdraw-moncash), so the freeze lands FIRST
 *   2. zero the event's withdrawable earnings
 *   3. refund every live ticket — card automatically, MonCash queued for an
 *      admin because Digicel has no refund API
 *   4. tell every buyer, in-app and by email
 *
 * Card refunds pull the money back OUT of the organizer's connected account
 * (reverse_transfer) rather than leaving the platform to absorb it.
 */

export type CancelActor = {
  id: string
  email?: string | null
  isAdmin: boolean
}

export type CancelOutcome = {
  eventId: string
  ticketsAffected: number
  refundsSucceeded: number
  refundsQueuedManual: number
  refundsFailed: number
  freeTicketsVoided: number
  notified: number
  failures: { ticketId: string; reason: string }[]
}

const LIVE_TICKET_STATUSES = ['valid', 'confirmed', 'active']

export async function cancelEventWithRefunds({
  eventId,
  actor,
  reason,
}: {
  eventId: string
  actor: CancelActor
  reason?: string | null
}): Promise<CancelOutcome> {
  const eventRef = adminDb.collection('events').doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) throw Object.assign(new Error('Event not found'), { status: 404 })

  const event = eventSnap.data() as any
  if (event?.status === 'cancelled') {
    throw Object.assign(new Error('Event is already cancelled'), { status: 409 })
  }

  const nowIso = new Date().toISOString()

  // 1. FREEZE FIRST. Both withdrawal routes reject a cancelled event, so even if
  // a later step throws, the takings can no longer leave.
  await eventRef.set(
    {
      status: 'cancelled',
      is_published: false,
      cancelled_at: nowIso,
      cancelled_by: actor.id,
      cancelled_by_admin: actor.isAdmin,
      cancellation_reason: reason || null,
      payouts_frozen: true,
      updated_at: nowIso,
    },
    { merge: true }
  )

  // 2. Nothing left to withdraw. Refunded tickets are already excluded when
  // earnings are derived from tickets, but the STORED doc is what withdrawals
  // read, so it has to be zeroed explicitly.
  try {
    await adminDb.collection('event_earnings').doc(eventId).set(
      {
        availableToWithdraw: 0,
        settlementStatus: 'cancelled',
        cancelledAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    )
  } catch (e) {
    console.error('[cancelEvent] failed to zero earnings', eventId, e)
  }

  // 3. Refund every live ticket.
  const ticketsSnap = await adminDb.collection('tickets').where('event_id', '==', eventId).get()

  const outcome: CancelOutcome = {
    eventId,
    ticketsAffected: 0,
    refundsSucceeded: 0,
    refundsQueuedManual: 0,
    refundsFailed: 0,
    freeTicketsVoided: 0,
    notified: 0,
    failures: [],
  }

  for (const doc of ticketsSnap.docs) {
    const ticket = doc.data() as any
    const status = String(ticket?.status || '').toLowerCase()
    if (!LIVE_TICKET_STATUSES.includes(status)) continue

    outcome.ticketsAffected += 1
    const price = Number(ticket?.price) || 0
    const method = String(ticket?.payment_method || '').toLowerCase()

    try {
      if (price <= 0) {
        // Free / RSVP — nothing to refund, but the ticket must stop being valid
        // so it can't be scanned at a door that no longer exists.
        await doc.ref.set(
          { status: 'cancelled', cancelled_at: nowIso, cancellation_reason: 'event_cancelled', updated_at: nowIso },
          { merge: true }
        )
        outcome.freeTicketsVoided += 1
      } else if (method === 'stripe' && ticket?.payment_intent_id) {
        const res = await processStripeRefund(ticket.payment_intent_id, price, {
          reverseTransfer: true,
          refundApplicationFee: true,
        })
        if (!res.success) throw new Error(res.error || 'Stripe refund failed')
        await doc.ref.set(
          {
            status: 'refunded',
            refund_status: 'approved',
            refund_amount: price,
            refund_id: res.refundId || null,
            refund_reason: 'event_cancelled',
            refund_processed_at: nowIso,
            updated_at: nowIso,
          },
          { merge: true }
        )
        outcome.refundsSucceeded += 1
      } else {
        // MonCash/NatCash: Digicel exposes no refund API, so this is queued for
        // an admin to pay out by hand. The ticket is void either way — the buyer
        // must not be able to enter while waiting for their money.
        await doc.ref.set(
          {
            status: 'refund_pending',
            refund_status: 'manual_required',
            refund_amount: price,
            refund_reason: 'event_cancelled',
            refund_requested_at: nowIso,
            updated_at: nowIso,
          },
          { merge: true }
        )
        await adminDb.collection('manual_refund_queue').add({
          ticketId: doc.id,
          eventId,
          eventTitle: event?.title || null,
          organizerId: event?.organizer_id || null,
          userId: ticket?.user_id || null,
          amount: price,
          currency: ticket?.currency || event?.currency || 'HTG',
          method: method || 'moncash',
          transactionId: ticket?.transaction_id || null,
          status: 'pending',
          createdAt: nowIso,
        })
        outcome.refundsQueuedManual += 1
      }
    } catch (e: any) {
      outcome.refundsFailed += 1
      outcome.failures.push({ ticketId: doc.id, reason: e?.message || 'unknown' })
      // Void the ticket regardless. A ticket that still scans for a cancelled
      // event is worse than one whose money is still being chased.
      try {
        await doc.ref.set(
          { status: 'refund_pending', refund_status: 'failed', refund_reason: 'event_cancelled', updated_at: nowIso },
          { merge: true }
        )
      } catch {}
    }

    // 4. Tell the buyer. Best-effort per ticket: a bounced email must not stop
    // the remaining refunds.
    const userId = ticket?.user_id
    if (userId) {
      try {
        await adminDb
          .collection('users')
          .doc(userId)
          .collection('notifications')
          .add({
            type: 'event_cancelled',
            title: `${event?.title || 'Event'} was cancelled`,
            message:
              price > 0
                ? 'Your ticket has been cancelled and your refund is on the way.'
                : 'Your registration has been cancelled.',
            eventId,
            ticketId: doc.id,
            isRead: false,
            createdAt: new Date(),
          })
        const userSnap = await adminDb.collection('users').doc(userId).get()
        const to = userSnap.data()?.email
        if (to) {
          await sendEmail({
            to,
            subject: `Cancelled: ${event?.title || 'your event'}`,
            html: cancellationEmailHtml({
              eventTitle: event?.title || 'your event',
              reason: reason || null,
              amount: price,
              currency: ticket?.currency || event?.currency || 'HTG',
              manual: outcome.refundsQueuedManual > 0 && price > 0 && method !== 'stripe',
            }),
          })
        }
        outcome.notified += 1
      } catch (e) {
        console.error('[cancelEvent] notify failed', doc.id, e)
      }
    }
  }

  return outcome
}

function cancellationEmailHtml({
  eventTitle,
  reason,
  amount,
  currency,
  manual,
}: {
  eventTitle: string
  reason: string | null
  amount: number
  currency: string
  manual: boolean
}) {
  const money = amount > 0 ? `${amount.toLocaleString()} ${currency}` : null
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#0A0A0A;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:1px;color:#A3A3A3;text-transform:uppercase;margin:0 0 8px">Tikèm</p>
    <h1 style="font-size:24px;margin:0 0 12px">${escapeHtml(eventTitle)} was cancelled</h1>
    ${reason ? `<p style="color:#A3A3A3;line-height:1.5;margin:0 0 16px">Reason: ${escapeHtml(reason)}</p>` : ''}
    ${
      money
        ? manual
          ? `<p style="line-height:1.5;margin:0 0 16px">Your ticket is cancelled and a refund of <strong>${money}</strong> is being processed. MonCash refunds are sent by hand, so allow a few business days.</p>`
          : `<p style="line-height:1.5;margin:0 0 16px">Your ticket is cancelled and <strong>${money}</strong> has been refunded to your original payment method. It can take 5–10 days to appear.</p>`
        : `<p style="line-height:1.5;margin:0 0 16px">Your free registration has been cancelled. Nothing was charged.</p>`
    }
    <p style="color:#A3A3A3;font-size:13px;line-height:1.5;margin:24px 0 0">If anything looks wrong, reply to this email and we'll sort it out.</p>
  </div></body></html>`
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}
