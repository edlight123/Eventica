import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerBalance, getAvailableTicketsForPayout } from '@/lib/firestore/payout'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { gateHaitiWithdrawal, loadOrganizerReleaseContext } from '@/lib/payouts/withdrawal-gate'

const MINIMUM_PAYOUT = 5000 // $50.00 in cents

/** Platform cut applied by getAvailableTicketsForPayout when it totals a batch. */
const BATCH_PLATFORM_FEE_PERCENT = 10

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    // IDEMPOTENCY CHECK 1: Verify no pending/processing payout exists
    const existingPayoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .where('status', 'in', ['pending', 'processing'])
      .get()

    if (!existingPayoutsSnapshot.empty) {
      const existingPayout = existingPayoutsSnapshot.docs[0].data()
      return NextResponse.json(
        { 
          error: 'Payout already in progress',
          message: `You have a ${existingPayout.status} payout request for ${(existingPayout.amount / 100).toFixed(2)} ${existingPayout.currency || 'HTG'}. Please wait for it to be processed.`,
          existingPayoutId: existingPayoutsSnapshot.docs[0].id
        },
        { status: 400 }
      )
    }

    // Get current balance and available tickets
    const balance = await getOrganizerBalance(organizerId)
    const { tickets, totalAmount, periodStart, periodEnd } = await getAvailableTicketsForPayout(organizerId)

    // Validate minimum payout amount
    if (balance.available < MINIMUM_PAYOUT) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          message: `Minimum payout amount is $50.00. Current available balance: $${(balance.available / 100).toFixed(2)}`
        },
        { status: 400 }
      )
    }

    // Validate we have tickets (double-check against balance calculation)
    if (tickets.length === 0 || totalAmount === 0) {
      return NextResponse.json(
        { error: 'No available earnings to withdraw' },
        { status: 400 }
      )
    }

    // Get payout config
    const haitiProfile = await getPayoutProfile(organizerId, 'haiti')

    if (!haitiProfile) {
      return NextResponse.json(
        { error: 'Payout method not configured' },
        { status: 400 }
      )
    }

    if (haitiProfile.status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Payout account not active',
          message: 'Please complete verification before requesting a payout'
        },
        { status: 400 }
      )
    }

    /**
     * The payout release ladder, applied to this legacy BATCH path too.
     *
     * This route pays one lump sum assembled from many events' tickets, so the
     * ladder is evaluated per contributing event and the whole batch is refused if
     * any one of them is not releasable. It deliberately does NOT quietly drop the
     * offending event and pay a smaller amount: the recorded `ticketIds` are what
     * stops a ticket being paid twice, so the set that is judged has to be exactly
     * the set that is paid.
     *
     * In practice this adds three things the ticket filter in
     * getAvailableTicketsForPayout never checked: a cancelled or payout-frozen
     * event, the review signals (large first event, mostly-manual door, near-empty
     * room, admin high-risk flag), and the tier ladder. Its own event-ended + 7 day
     * filter is already stricter than any tier hold, so a plain hold is unlikely
     * here — but it is enforced rather than assumed.
     */
    const releaseContext = await loadOrganizerReleaseContext(organizerId)

    const byEvent = new Map<string, { event: any; grossMinor: number }>()
    for (const ticket of tickets) {
      const eventIdForTicket = String(ticket?.event_id || ticket?.event?.id || '')
      if (!eventIdForTicket) continue
      const grossMinor = Math.max(0, Math.round(Number(ticket?.price_paid || 0) * 100))
      const bucket = byEvent.get(eventIdForTicket) || { event: ticket?.event || {}, grossMinor: 0 }
      bucket.grossMinor += grossMinor
      byEvent.set(eventIdForTicket, bucket)
    }

    for (const [gatedEventId, bucket] of Array.from(byEvent.entries())) {
      // What this event contributes to the batch total, using the same net maths
      // getAvailableTicketsForPayout used to build `totalAmount`.
      const netMinor = Math.floor(bucket.grossMinor * (1 - BATCH_PLATFORM_FEE_PERCENT / 100))

      // An event that contributes no money to this batch (a free/RSVP show whose
      // tickets are in the set at zero) has nothing to release, so it must not be
      // able to block the paid events it is batched with.
      if (netMinor <= 0) continue

      const gate = await gateHaitiWithdrawal({
        eventId: gatedEventId,
        organizerId,
        eventData: bucket.event,
        grossMinor: bucket.grossMinor,
        // The batch only ever includes `valid` tickets, so refunded tickets are
        // already out of the gross above — subtracting them again would under-pay.
        refundedMinor: 0,
        currency: bucket.event?.currency || balance.currency || null,
        availableMinor: netMinor,
        requestedAmountMinor: netMinor,
        method: 'batch',
        context: releaseContext,
      })

      if (!gate.allowed) {
        return NextResponse.json({ ...gate.body, eventId: gatedEventId }, { status: gate.status })
      }
    }

    // Calculate next Friday at 5:00 PM (batched payout schedule)
    const now = new Date()
    const nextFriday = new Date(now)
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    nextFriday.setDate(now.getDate() + daysUntilFriday)
    nextFriday.setHours(17, 0, 0, 0)

    // IDEMPOTENCY SAFEGUARD: Store ticket IDs to prevent double-counting
    const ticketIds = tickets.map(t => t.id)

    // Create payout request with complete tracking
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc()

    const payout = {
      organizerId,
      amount: totalAmount,
      status: 'pending',
      method: haitiProfile.method,
      scheduledDate: nextFriday.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      
      // NEW: Idempotency & tracking fields
      requestedBy: organizerId,
      ticketIds,              // ✅ Prevents double-counting
      periodStart,
      periodEnd,
      currency: balance.currency,
    }

    await payoutRef.set(payout)

    return NextResponse.json({
      success: true,
      payout: {
        id: payoutRef.id,
        ...payout,
        ticketCount: tickets.length,
      },
    })
  } catch (error: any) {
    console.error('Error requesting payout:', error)
    return NextResponse.json(
      { error: 'Failed to request payout', message: error.message },
      { status: 500 }
    )
  }
}
