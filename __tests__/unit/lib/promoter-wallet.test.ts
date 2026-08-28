/**
 * Wallet money math: released-vs-pending bucketing, prior withdrawals, the
 * unsupported-currency fence, and the 3% instant fee. The release decision
 * itself is the organizer ladder's (tested in payout-release-rules); here it
 * arrives as a boolean per line.
 */

jest.mock('@/lib/firebase/admin', () => ({ adminDb: { collection: jest.fn() } }))
jest.mock('@/lib/payouts/withdrawal-gate', () => ({ previewRelease: jest.fn() }))
jest.mock('@/lib/earnings', () => ({ getEventEarnings: jest.fn() }))
jest.mock('@/lib/moncash', () => ({ moncashPrefundedTransfer: jest.fn() }))
jest.mock('@/lib/currency', () => ({ fetchUsdToHtgRate: jest.fn() }))

import {
  computeWalletBuckets,
  computeWithdrawalFee,
  PROMOTER_WITHDRAWAL_FEE_PERCENT,
} from '@/lib/promoter-wallet'

describe('computeWalletBuckets', () => {
  it('splits released vs pending per currency', () => {
    const buckets = computeWalletBuckets(
      [
        { currency: 'HTG', commissionCents: 50_000, released: true },
        { currency: 'HTG', commissionCents: 20_000, released: false },
        { currency: 'USD', commissionCents: 1_000, released: true },
      ],
      {}
    )
    expect(buckets.availableByCurrency).toEqual({ HTG: 50_000, USD: 1_000 })
    expect(buckets.pendingByCurrency).toEqual({ HTG: 20_000 })
  })

  it('nets prior withdrawals out of the released bucket only', () => {
    const buckets = computeWalletBuckets(
      [
        { currency: 'HTG', commissionCents: 50_000, released: true },
        { currency: 'HTG', commissionCents: 30_000, released: false },
      ],
      { HTG: 40_000 }
    )
    expect(buckets.availableByCurrency).toEqual({ HTG: 10_000 })
    expect(buckets.pendingByCurrency).toEqual({ HTG: 30_000 })
  })

  it('never goes negative when a reversal outruns withdrawals', () => {
    const buckets = computeWalletBuckets(
      [{ currency: 'HTG', commissionCents: 10_000, released: true }],
      { HTG: 25_000 }
    )
    expect(buckets.availableByCurrency).toEqual({})
  })

  it('fences non-MonCash currencies off from withdrawal', () => {
    const buckets = computeWalletBuckets(
      [{ currency: 'EUR', commissionCents: 5_000, released: true }],
      {}
    )
    expect(buckets.availableByCurrency).toEqual({})
    expect(buckets.unsupportedByCurrency).toEqual({ EUR: 5_000 })
  })
})

describe('computeWithdrawalFee', () => {
  it('charges the promoter 3% and pays the rest', () => {
    expect(PROMOTER_WITHDRAWAL_FEE_PERCENT).toBe(0.03)
    expect(computeWithdrawalFee(100_000)).toEqual({ feeCents: 3_000, payoutCents: 97_000 })
  })
  it('handles zero and junk safely', () => {
    expect(computeWithdrawalFee(0)).toEqual({ feeCents: 0, payoutCents: 0 })
    expect(computeWithdrawalFee(NaN as any)).toEqual({ feeCents: 0, payoutCents: 0 })
  })
})
