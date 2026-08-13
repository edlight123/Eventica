/**
 * The organizer earnings ledger must not deduct a fee the BUYER already paid.
 *
 * Under buyer incidence (US / Canada / France) the card is charged face value +
 * fee and the organizer's Stripe transfer is the face value exactly, so any
 * deduction here under-reports what they are owed. Under organizer incidence
 * (Haiti) the fee still comes out of gross, unchanged.
 *
 * The flag is stamped per TICKET at purchase, never derived from the event's
 * country at read time — otherwise changing a country's fee model would silently
 * rewrite the earnings of sales made under the old one. That is what the
 * "legacy ticket" cases below pin down.
 *
 * Firestore is modelled in memory (same approach as haiti-withdrawal-gate.test.ts).
 */

type Doc = Record<string, any>

const store = new Map<string, Doc>()

function collectionDocs(name: string): Array<{ id: string; data: Doc }> {
  const out: Array<{ id: string; data: Doc }> = []
  for (const [key, data] of Array.from(store.entries())) {
    const slash = key.indexOf('/')
    if (key.slice(0, slash) === name) out.push({ id: key.slice(slash + 1), data })
  }
  return out
}

jest.mock('@/lib/firebase/admin', () => {
  const makeQuery = (name: string, filters: Array<[string, string, any]>) => ({
    where: (field: string, op: string, value: any) =>
      makeQuery(name, [...filters, [field, op, value]]),
    orderBy: () => makeQuery(name, filters),
    limit: () => makeQuery(name, filters),
    get: async () => {
      const rows = collectionDocs(name).filter(({ data }) =>
        filters.every(([field, op, value]) => (op === '==' ? data[field] === value : true))
      )
      return {
        empty: rows.length === 0,
        size: rows.length,
        docs: rows.map(({ id, data }) => ({ id, exists: true, data: () => data })),
      }
    },
  })

  const collection = (name: string) => ({
    ...makeQuery(name, []),
    doc: (id: string) => ({
      id,
      get: async () => {
        const data = store.get(`${name}/${id}`)
        return { exists: !!data, id, data: () => data }
      },
      set: async (data: Doc) => {
        store.set(`${name}/${id}`, { ...(store.get(`${name}/${id}`) || {}), ...data })
      },
      update: async (data: Doc) => {
        store.set(`${name}/${id}`, { ...(store.get(`${name}/${id}`) || {}), ...data })
      },
      collection,
    }),
    add: async (data: Doc) => {
      const id = `auto_${store.size}`
      store.set(`${name}/${id}`, data)
      return { id }
    },
  })

  return { adminDb: { collection } }
})

// Platform settings: 10% in both markets keeps the arithmetic legible.
// The percentage is a FRACTION here (0.10), matching DEFAULT_PLATFORM_SETTINGS —
// calculatePlatformFeeWithPercentage multiplies by it directly.
jest.mock('@/lib/admin/platform-settings', () => ({
  getPlatformSettings: async () => ({
    haiti: { platformFeePercentage: 0.1, settlementHoldDays: 0 },
    usCanada: { platformFeePercentage: 0.1, settlementHoldDays: 0 },
  }),
}))

import { getEventEarnings } from '@/lib/earnings'

const YESTERDAY = new Date(Date.now() - 24 * 3_600_000).toISOString()

/** One event and `tickets`, with no precomputed event_earnings doc — so the
 *  ledger is derived from the tickets themselves. */
function seed(country: string, tickets: Doc[]) {
  store.clear()
  store.set('events/evt_1', {
    country,
    title: 'Test event',
    start_datetime: YESTERDAY,
    end_datetime: YESTERDAY,
    currency: country === 'HT' ? 'HTG' : 'USD',
  })
  tickets.forEach((t, i) =>
    store.set(`tickets/tkt_${i}`, {
      event_id: 'evt_1',
      status: 'confirmed',
      currency: country === 'HT' ? 'HTG' : 'USD',
      payment_id: `pi_${i}`,
      purchased_at: YESTERDAY,
      ...t,
    })
  )
}

describe('earnings ledger and fee incidence', () => {
  it('pays a US organizer the full face value when the buyer paid the fee', async () => {
    seed('US', [
      { price_paid: 20, payment_method: 'stripe', fee_incidence: 'buyer' },
      { price_paid: 20, payment_method: 'stripe', fee_incidence: 'buyer' },
    ])

    const earnings = await getEventEarnings('evt_1')
    expect(earnings).not.toBeNull()
    expect(earnings!.grossSales).toBe(4_000)
    expect(earnings!.platformFee).toBe(0)
    expect(earnings!.processingFees).toBe(0)
    expect(earnings!.netAmount).toBe(4_000)
  })

  it('still deducts the fee from a Haiti organizer, who did not pass it on', async () => {
    seed('HT', [{ price_paid: 1_000, payment_method: 'moncash', fee_incidence: 'organizer' }])

    const earnings = await getEventEarnings('evt_1')
    expect(earnings!.grossSales).toBe(100_000)
    expect(earnings!.platformFee).toBe(10_000) // 10%
    expect(earnings!.netAmount).toBe(90_000)
  })

  it('treats a ticket with no incidence flag as organizer-paid', async () => {
    // A sale made before the buyer-pays rollout: the organizer DID bear the fee,
    // so its arithmetic must not change retroactively.
    seed('US', [{ price_paid: 20, payment_method: 'stripe' }])

    const earnings = await getEventEarnings('evt_1')
    expect(earnings!.grossSales).toBe(2_000)
    expect(earnings!.platformFee).toBeGreaterThan(0)
    expect(earnings!.netAmount).toBeLessThan(2_000)
  })

  it('keeps legacy and new tickets on their own terms within one event', async () => {
    seed('US', [
      { price_paid: 20, payment_method: 'stripe' }, // legacy: fee deducted
      { price_paid: 20, payment_method: 'stripe', fee_incidence: 'buyer' }, // new: not
    ])

    const earnings = await getEventEarnings('evt_1')
    expect(earnings!.grossSales).toBe(4_000)
    // Exactly one ticket's worth of fees, not two and not none.
    expect(earnings!.netAmount).toBeGreaterThan(2_000)
    expect(earnings!.netAmount).toBeLessThan(4_000)
  })

  it('takes the fee-bearing reading when one payment mixes both flags', async () => {
    // Should never happen — one charge is one incidence — but under-reporting is
    // recoverable and over-reporting is not.
    seed('US', [
      { price_paid: 20, payment_method: 'stripe', payment_id: 'pi_same', fee_incidence: 'buyer' },
      { price_paid: 20, payment_method: 'stripe', payment_id: 'pi_same' },
    ])

    const earnings = await getEventEarnings('evt_1')
    expect(earnings!.platformFee).toBeGreaterThan(0)
    expect(earnings!.netAmount).toBeLessThan(4_000)
  })
})
