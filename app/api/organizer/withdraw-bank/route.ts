import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getEventEarnings, withdrawFromEarnings } from '@/lib/earnings'
import {
  addSecondaryBankDestination,
  getDecryptedBankDestination,
  type BankDestinationDetails,
} from '@/lib/firestore/payout-destinations'
import {
  consumePayoutDetailsChangeVerification,
  requireRecentPayoutDetailsChangeVerification,
} from '@/lib/firestore/payout'
import type { WithdrawalRequest } from '@/types/earnings'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { getRequiredPayoutProfileIdForEventCountry } from '@/lib/firestore/payout-profiles'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const haitiProfile = await getPayoutProfile(user.id, 'haiti')
    if (!haitiProfile) {
      return NextResponse.json(
        {
          error: 'Haiti payout profile required',
          message: 'Bank withdrawals are only available for organizers with a Haiti payout profile.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Payout profile not active',
          message: 'Please complete payout verification before requesting bank withdrawals.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.method !== 'bank_transfer') {
      return NextResponse.json(
        {
          error: 'Bank transfer not configured',
          message: 'Please configure Haiti payout method as Bank transfer to withdraw to a bank account.',
        },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { eventId, amount, bankDetails, bankDestinationId, saveDestination } = body

    // Validate inputs
    if (!eventId || !amount || (!bankDestinationId && !bankDetails)) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, amount, bankDetails or bankDestinationId' },
        { status: 400 }
      )
    }

    let resolvedBankDetails: BankDestinationDetails | null = null
    let resolvedDestinationId: string | null = null

    if (bankDestinationId) {
      resolvedDestinationId = String(bankDestinationId)

      // Identity-only + manual review: filing a withdrawal REQUEST no longer
      // requires the specific bank destination to be pre-"verified". No money
      // moves here — this only creates a `pending` withdrawal_request. An admin
      // verifies the destination and releases funds by hand, which is the actual
      // gate. (The profile still had to reach `active` via identity verification
      // upstream, and the destination must still exist — enforced by the 404
      // below.)
      resolvedBankDetails = await getDecryptedBankDestination({
        organizerId: user.id,
        destinationId: resolvedDestinationId,
      })

      if (!resolvedBankDetails) {
        return NextResponse.json({ error: 'Bank destination not found' }, { status: 404 })
      }
    } else {
      resolvedBankDetails = bankDetails as BankDestinationDetails

      if (!resolvedBankDetails?.accountNumber || !resolvedBankDetails?.bankName || !resolvedBankDetails?.accountHolder) {
        return NextResponse.json({ error: 'Incomplete bank details' }, { status: 400 })
      }

      // Using a new bank account requires OTP step-up.
      try {
        await requireRecentPayoutDetailsChangeVerification(user.id)
      } catch (e: any) {
        const message = String(e?.message || '')
        if (message.includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
          return NextResponse.json(
            {
              error: 'Verification required',
              code: 'PAYOUT_CHANGE_VERIFICATION_REQUIRED',
              requiresVerification: true,
              message:
                'For your security, confirm this new bank account with the code we email you before using it for withdrawals.',
            },
            { status: 403 }
          )
        }
        throw e
      }

      // Optionally save as a second account.
      if (saveDestination) {
        const created = await addSecondaryBankDestination({ organizerId: user.id, bankDetails: resolvedBankDetails })
        resolvedDestinationId = created.id
      }

      await consumePayoutDetailsChangeVerification(user.id)
    }

    // Minimum withdrawal amount (in cents)
    if (amount < 5000) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is $50.00' },
        { status: 400 }
      )
    }

    // Verify event ownership
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data()
    if (eventData?.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
    }

    // A cancelled event's takings are not the organizer's to withdraw: buyers are
    // being refunded from that same money. lib/events/cancel.ts sets this first,
    // precisely so this check can hold the line even if refunds are still running.
    if (eventData?.status === 'cancelled' || eventData?.payouts_frozen === true) {
      return NextResponse.json(
        { error: 'This event was cancelled — its earnings are reserved for refunds.', code: 'cancelled_event' },
        { status: 400 }
      )
    }

    // Event-based routing: US/CA events must use Stripe Connect.
    const requiredProfile = getRequiredPayoutProfileIdForEventCountry(eventData?.country)
    if (requiredProfile === 'stripe_connect') {
      return NextResponse.json(
        {
          error: 'Stripe Connect required',
          message: 'US/Canada events must withdraw via Stripe Connect. Bank withdrawals are not available for this event.',
        },
        { status: 400 }
      )
    }

    // Verify earnings and settlement status (normalized against event end time)
    const earnings = await getEventEarnings(String(eventId))
    if (!earnings) {
      return NextResponse.json({ error: 'No earnings found for this event' }, { status: 404 })
    }

    if (earnings.settlementStatus !== 'ready') {
      return NextResponse.json(
        { error: 'Earnings are not yet available for withdrawal' },
        { status: 400 }
      )
    }

    // Amount comes in cents, availableToWithdraw is also in cents
    const availableBalance = earnings.availableToWithdraw || 0
    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${(availableBalance / 100).toFixed(2)} ${earnings.currency || 'HTG'}` },
        { status: 400 }
      )
    }

    // Create withdrawal request. Preserve the event's real currency in the record;
    // a CAD/EUR event would withdraw via Stripe (not this Haiti bank rail), so never
    // silently rewrite CAD/EUR to HTG.
    const rawCurrency = String(earnings.currency || 'HTG').toUpperCase()
    const currency = (['USD', 'CAD', 'EUR'].includes(rawCurrency) ? rawCurrency : 'HTG') as 'HTG' | 'USD' | 'CAD' | 'EUR'

    const accountNumber = String(resolvedBankDetails.accountNumber)
    const maskedAccountNumber = accountNumber.length > 4 ? `****${accountNumber.slice(-4)}` : accountNumber

    const withdrawalRequest: WithdrawalRequest = {
      organizerId: user.id,
      eventId,
      amount,
      currency,
      method: 'bank',
      status: 'pending',
      bankDetails: {
        // Avoid storing full bank account number when it is saved as a destination.
        accountNumber: resolvedDestinationId ? maskedAccountNumber : accountNumber,
        bankName: String(resolvedBankDetails.bankName),
        accountHolder: String(resolvedBankDetails.accountHolder),
        swiftCode: resolvedBankDetails.swiftCode,
        routingNumber: resolvedBankDetails.routingNumber,
      },
      bankDestinationId: resolvedDestinationId || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const withdrawalRef = await adminDb
      .collection('withdrawal_requests')
      .add(withdrawalRequest)

    // Update earnings record (amount is already in cents)
    await withdrawFromEarnings(eventId, amount, withdrawalRef.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRef.id,
      message: 'Bank transfer withdrawal request submitted successfully'
    })
  } catch (err: any) {
    console.error('Bank withdrawal error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
