import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getEventEarnings, getOrCreateEventEarnings, withdrawFromEarnings } from '@/lib/earnings'
import { moncashPrefundedTransfer } from '@/lib/moncash'
import type { WithdrawalRequest } from '@/types/earnings'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { getRequiredPayoutProfileIdForEventCountry } from '@/lib/firestore/payout-profiles'
import { fetchUsdToHtgRate } from '@/lib/currency'

const PREFUNDING_FEE_PERCENT = 0.03

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
          message: 'MonCash withdrawals are only available for organizers with a Haiti payout profile.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Payout profile not active',
          message: 'Please complete payout verification before requesting MonCash withdrawals.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.method !== 'mobile_money') {
      return NextResponse.json(
        {
          error: 'Mobile money not configured',
          message: 'Please configure Haiti payout method as Mobile money to withdraw via MonCash.',
        },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { eventId, amount, moncashNumber } = body

    // Validate inputs
    if (!eventId || !amount || !moncashNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, amount, moncashNumber' },
        { status: 400 }
      )
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

    // Event-based routing: US/CA events must use Stripe Connect.
    const requiredProfile = getRequiredPayoutProfileIdForEventCountry(eventData?.country)
    if (requiredProfile === 'stripe_connect') {
      return NextResponse.json(
        {
          error: 'Stripe Connect required',
          message: 'US/Canada events must withdraw via Stripe Connect. MonCash is not available for this event.',
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

    const currency = (String(earnings.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG') as 'HTG' | 'USD'

    // Check if instant MonCash (prefunding) is available and allowed.
    const [platformConfigDoc] = await Promise.all([
      adminDb.collection('config').doc('payouts').get(),
    ])

    const prefunding = platformConfigDoc.exists ? (platformConfigDoc.data() as any)?.prefunding : null
    const prefundingEnabled = Boolean(prefunding?.enabled)
    const prefundingAvailable = Boolean(prefunding?.available)

    const allowInstantMoncash = Boolean(haitiProfile?.allowInstantMoncash)

    const shouldUsePrefunding = prefundingEnabled && prefundingAvailable && allowInstantMoncash

    // MonCash transfers are executed in HTG. If earnings are in USD, we convert at withdrawal time.
    const usdToHtgRate = currency === 'USD' ? await fetchUsdToHtgRate() : 1

    const feeCents = shouldUsePrefunding ? Math.max(0, Math.round(Number(amount) * PREFUNDING_FEE_PERCENT)) : 0
    const payoutAmountCents = Math.max(0, Number(amount) - feeCents)

    const payoutAmountHtgCents = Math.max(0, Math.round((payoutAmountCents / 100) * usdToHtgRate * 100))

    // Pre-create withdrawal request ref so we can use it as MonCash `reference`.
    // This also makes retries safer (same request id is used throughout the flow).
    const withdrawalRef = adminDb.collection('withdrawal_requests').doc()
    const now = new Date()
    const nowIso = now.toISOString()

    const baseWithdrawalRequest: WithdrawalRequest = {
      organizerId: user.id,
      eventId,
      amount,
      currency,
      method: 'moncash',
      status: shouldUsePrefunding ? 'processing' : 'pending',
      moncashNumber,
      feeCents: feeCents || undefined,
      payoutAmountCents: payoutAmountCents || undefined,
      payoutCurrency: 'HTG',
      payoutAmountHtgCents: payoutAmountHtgCents || undefined,
      usdToHtgRateUsed: currency === 'USD' ? usdToHtgRate : undefined,
      prefundingUsed: shouldUsePrefunding || undefined,
      prefundingFeePercent: shouldUsePrefunding ? PREFUNDING_FEE_PERCENT : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (shouldUsePrefunding) {
      // For instant prefunding, reserve (debit) earnings first so we never end up
      // transferring money without deducting the organizer's available balance.
      const { ref: earningsRef } = await getOrCreateEventEarnings(String(eventId))

      await adminDb.runTransaction(async (tx: any) => {
        const [earningsSnap, withdrawalSnap] = await Promise.all([
          tx.get(earningsRef),
          tx.get(withdrawalRef),
        ])

        if (withdrawalSnap.exists) {
          // Defensive: this should not happen since we just created the ref.
          throw new Error('Withdrawal request already exists')
        }

        if (!earningsSnap.exists) {
          throw new Error('Earnings not found')
        }

        const earningsData = earningsSnap.data() as any
        const settlementStatus = String(earningsData?.settlementStatus || '')
        const availableToWithdraw = Math.max(0, Number(earningsData?.availableToWithdraw || 0) || 0)
        const withdrawnAmount = Math.max(0, Number(earningsData?.withdrawnAmount || 0) || 0)

        if (settlementStatus !== 'ready') {
          throw new Error('Earnings are not yet available for withdrawal')
        }

        if (availableToWithdraw < amount) {
          throw new Error(
            `Insufficient funds. Available: ${(availableToWithdraw / 100).toFixed(2)} ${currency}, Requested: ${(Number(amount) / 100).toFixed(2)} ${currency}`
          )
        }

        const remaining = Math.max(0, availableToWithdraw - Number(amount))
        const newWithdrawn = withdrawnAmount + Number(amount)

        tx.set(withdrawalRef, {
          ...baseWithdrawalRequest,
          status: 'processing',
          reservedAt: now,
          reservedCents: Number(amount),
          updatedAt: now,
        } satisfies WithdrawalRequest as any)

        tx.update(earningsRef, {
          availableToWithdraw: remaining,
          withdrawnAmount: newWithdrawn,
          settlementStatus: remaining === 0 ? 'locked' : 'ready',
          updatedAt: nowIso,
        })
      })

      try {
        const payoutAmount = Number((payoutAmountHtgCents / 100).toFixed(2))
        const result = await moncashPrefundedTransfer({
          amount: payoutAmount,
          receiver: String(moncashNumber),
          desc: `Eventica instant withdrawal (${eventId})`,
          reference: withdrawalRef.id,
        })

        await withdrawalRef.set(
          {
            status: 'completed',
            completedAt: new Date(),
            processedAt: new Date(),
            moncashTransactionId: result.transactionId,
            prefundingTransferRaw: result.raw,
            payoutCurrency: 'HTG',
            payoutAmountHtgCents,
            usdToHtgRateUsed: currency === 'USD' ? usdToHtgRate : undefined,
            updatedAt: new Date(),
          },
          { merge: true }
        )

        return NextResponse.json({
          success: true,
          withdrawalId: withdrawalRef.id,
          instant: true,
          feeCents,
          payoutAmountCents,
          payoutCurrency: 'HTG',
          payoutAmountHtgCents,
          usdToHtgRateUsed: currency === 'USD' ? usdToHtgRate : null,
          message: 'Instant MonCash withdrawal completed successfully'
        })
      } catch (e: any) {
        const failureReason = e?.message || String(e)

        // Rollback reserved earnings if the MonCash transfer failed.
        try {
          const { ref: earningsRef } = await getOrCreateEventEarnings(String(eventId))
          await adminDb.runTransaction(async (tx: any) => {
            const [earningsSnap, withdrawalSnap] = await Promise.all([
              tx.get(earningsRef),
              tx.get(withdrawalRef),
            ])

            if (!withdrawalSnap.exists) {
              // Nothing to rollback (should not happen).
              return
            }

            const withdrawal = withdrawalSnap.data() as any
            if (String(withdrawal?.status || '') === 'completed') {
              // Don't rollback once marked completed.
              return
            }

            if (!earningsSnap.exists) {
              // Can't safely rollback earnings; still mark withdrawal failed.
              tx.set(
                withdrawalRef,
                {
                  status: 'failed',
                  failureReason,
                  updatedAt: new Date(),
                },
                { merge: true }
              )
              return
            }

            const earningsData = earningsSnap.data() as any
            const availableToWithdraw = Math.max(0, Number(earningsData?.availableToWithdraw || 0) || 0)
            const withdrawnAmount = Math.max(0, Number(earningsData?.withdrawnAmount || 0) || 0)

            const restoredAvailable = availableToWithdraw + Number(amount)
            const restoredWithdrawn = Math.max(0, withdrawnAmount - Number(amount))

            tx.update(earningsRef, {
              availableToWithdraw: restoredAvailable,
              withdrawnAmount: restoredWithdrawn,
              settlementStatus: restoredAvailable === 0 ? 'locked' : 'ready',
              updatedAt: new Date().toISOString(),
            })

            tx.set(
              withdrawalRef,
              {
                status: 'failed',
                failureReason,
                reservationRolledBackAt: new Date(),
                updatedAt: new Date(),
              },
              { merge: true }
            )
          })
        } catch (rollbackErr) {
          console.error('Failed to rollback earnings after prefunded transfer failure:', rollbackErr)
          await withdrawalRef.set(
            {
              status: 'failed',
              failureReason,
              updatedAt: new Date(),
            },
            { merge: true }
          )
        }

        return NextResponse.json(
          { error: 'Instant MonCash transfer failed', message: e?.message || String(e) },
          { status: 502 }
        )
      }
    }

    // Create withdrawal request for manual processing.
    await withdrawalRef.set(baseWithdrawalRequest)

    // Standard (manual) MonCash request.
    await withdrawFromEarnings(eventId, amount, withdrawalRef.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRef.id,
      instant: false,
      payoutCurrency: 'HTG',
      payoutAmountHtgCents,
      usdToHtgRateUsed: currency === 'USD' ? usdToHtgRate : null,
      message: 'MonCash withdrawal request submitted successfully'
    })
  } catch (err: any) {
    console.error('MonCash withdrawal error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
