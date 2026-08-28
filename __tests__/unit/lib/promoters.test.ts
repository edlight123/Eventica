/**
 * Promoter attribution: code normalization, commission math for both types,
 * the HMAC stats token, and the exactly-once sale ledger.
 *
 * Firestore is modelled in memory (same approach as earnings-fee-incidence).
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
  const docRef = (name: string, id: string) => ({
    id,
    path: `${name}/${id}`,
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
  })

  const matches = (data: Doc, [field, op, value]: [string, string, any]) => {
    if (op === '==') return data[field] === value
    if (op === 'array-contains') return Array.isArray(data[field]) && data[field].includes(value)
    return true
  }

  const makeQuery = (name: string, filters: Array<[string, string, any]>) => ({
    where: (field: string, op: string, value: any) =>
      makeQuery(name, [...filters, [field, op, value]]),
    orderBy: () => makeQuery(name, filters),
    limit: () => makeQuery(name, filters),
    get: async () => {
      const rows = collectionDocs(name).filter(({ data }) => filters.every((f) => matches(data, f)))
      return {
        empty: rows.length === 0,
        size: rows.length,
        docs: rows.map(({ id, data }) => ({
          id,
          exists: true,
          data: () => data,
          ref: docRef(name, id),
        })),
      }
    },
  })

  let autoId = 0
  const collection = (name: string) => ({
    ...makeQuery(name, []),
    doc: (id?: string) => docRef(name, id || `auto_${++autoId}`),
  })

  const runTransaction = async (fn: (tx: any) => Promise<void>) => {
    const tx = {
      get: (ref: any) => ref.get(),
      set: (ref: any, data: Doc) => {
        store.set(ref.path, { ...(store.get(ref.path) || {}), ...data })
      },
      update: (ref: any, data: Doc) => {
        store.set(ref.path, { ...(store.get(ref.path) || {}), ...data })
      },
    }
    await fn(tx)
  }

  return { adminDb: { collection, runTransaction } }
})

import {
  normalizePromoterCode,
  calculateCommissionCents,
  promoterTokenFor,
  verifyPromoterToken,
  mintPromoterStatsKey,
  resolvePromoterCode,
  recordPromoterSale,
  reversePromoterSaleForTicket,
} from '@/lib/promoters'

function seedPromoter(overrides: Doc = {}) {
  store.clear()
  store.set('event_promoters/prm_1', {
    event_id: 'evt_1',
    organizer_id: 'org_1',
    code: 'STEEVE',
    name: 'Steeve L.',
    commission_type: 'percentage',
    commission_value: 10,
    is_active: true,
    stats_key: 'a'.repeat(48),
    tickets_sold: 0,
    orders_count: 0,
    gross_cents: 0,
    commission_cents: 0,
    currency: 'HTG',
    ...overrides,
  })
}

describe('normalizePromoterCode', () => {
  it('uppercases and accepts the link-safe alphabet', () => {
    expect(normalizePromoterCode(' steeve ')).toBe('STEEVE')
    expect(normalizePromoterCode('ti-jo_2')).toBe('TI-JO_2')
  })
  it('rejects junk without throwing', () => {
    expect(normalizePromoterCode('')).toBeNull()
    expect(normalizePromoterCode('a')).toBeNull() // too short
    expect(normalizePromoterCode('has space')).toBeNull()
    expect(normalizePromoterCode('x'.repeat(25))).toBeNull()
    expect(normalizePromoterCode(null)).toBeNull()
  })
})

describe('calculateCommissionCents', () => {
  const pct = { commission_type: 'percentage', commission_value: 10 }
  const flat = { commission_type: 'flat_per_ticket', commission_value: 250 }

  it('percentage of the order gross', () => {
    expect(calculateCommissionCents(pct, 100_000, 2)).toBe(10_000)
  })
  it('flat amount per ticket', () => {
    expect(calculateCommissionCents(flat, 100_000, 3)).toBe(750)
  })
  it('free orders earn zero under both types', () => {
    expect(calculateCommissionCents(pct, 0, 2)).toBe(0)
    expect(calculateCommissionCents(flat, 0, 2)).toBe(0)
  })
  it('never exceeds the order gross', () => {
    expect(calculateCommissionCents({ commission_type: 'flat_per_ticket', commission_value: 5_000 }, 4_000, 1)).toBe(4_000)
    expect(calculateCommissionCents({ commission_type: 'percentage', commission_value: 500 }, 4_000, 1)).toBe(4_000)
  })
  it('rejects non-positive or non-finite values', () => {
    expect(calculateCommissionCents({ commission_type: 'percentage', commission_value: -5 }, 4_000, 1)).toBe(0)
    expect(calculateCommissionCents({ commission_type: 'percentage', commission_value: NaN }, 4_000, 1)).toBe(0)
  })
})

describe('promoter stats token', () => {
  it('round-trips', () => {
    const key = mintPromoterStatsKey()
    expect(key).toMatch(/^[a-f0-9]{48}$/)
    expect(verifyPromoterToken(promoterTokenFor(key))).toBe(key)
  })
  it('rejects tampering and malformed tokens identically', () => {
    const token = promoterTokenFor(mintPromoterStatsKey())
    expect(verifyPromoterToken(token.slice(0, -1) + (token.endsWith('x') ? 'y' : 'x'))).toBeNull()
    expect(verifyPromoterToken('nonsense')).toBeNull()
    expect(verifyPromoterToken('')).toBeNull()
    expect(verifyPromoterToken(`${'b'.repeat(48)}.forged-signature-here`)).toBeNull()
  })
})

describe('resolvePromoterCode', () => {
  it('resolves an active code, case-insensitively', async () => {
    seedPromoter()
    const p = await resolvePromoterCode('evt_1', 'steeve')
    expect(p?.id).toBe('prm_1')
  })
  it('resolves by doc id but only for the right event', async () => {
    seedPromoter()
    expect((await resolvePromoterCode('evt_1', 'prm_1'))?.id).toBe('prm_1')
    expect(await resolvePromoterCode('evt_OTHER', 'prm_1')).toBeNull()
  })
  it('refuses inactive and unknown codes alike', async () => {
    seedPromoter({ is_active: false })
    expect(await resolvePromoterCode('evt_1', 'STEEVE')).toBeNull()
    expect(await resolvePromoterCode('evt_1', 'NOBODY')).toBeNull()
  })
})

describe('recordPromoterSale / reversal', () => {
  it('appends a ledger row and bumps counters', async () => {
    seedPromoter()
    const result = await recordPromoterSale({
      promoterId: 'prm_1',
      eventId: 'evt_1',
      ticketIds: ['tkt_1', 'tkt_2'],
      quantity: 2,
      orderGrossCents: 100_000,
      currency: 'HTG',
      paymentMethod: 'moncash',
      paymentId: 'MC_1',
      buyerEmail: 'Buyer@Example.com',
    })

    expect(result.recorded).toBe(true)
    expect(result.commissionCents).toBe(10_000)

    const promoter = store.get('event_promoters/prm_1')!
    expect(promoter.tickets_sold).toBe(2)
    expect(promoter.orders_count).toBe(1)
    expect(promoter.gross_cents).toBe(100_000)
    expect(promoter.commission_cents).toBe(10_000)

    const sales = collectionDocs('promoter_sales')
    expect(sales).toHaveLength(1)
    expect(sales[0].data.status).toBe('accrued')
    expect(sales[0].data.buyer_key).toBe('email:buyer@example.com')
    expect(sales[0].data.commission_type).toBe('percentage')
  })

  it('never throws for a missing promoter — the sale is kept', async () => {
    seedPromoter()
    const result = await recordPromoterSale({
      promoterId: 'prm_GONE',
      eventId: 'evt_1',
      ticketIds: ['tkt_1'],
      quantity: 1,
      orderGrossCents: 5_000,
      currency: 'HTG',
      paymentMethod: 'moncash',
    })
    expect(result.recorded).toBe(false)
    expect(collectionDocs('promoter_sales')).toHaveLength(0)
  })

  it('reverses an accrued order exactly once', async () => {
    seedPromoter()
    await recordPromoterSale({
      promoterId: 'prm_1',
      eventId: 'evt_1',
      ticketIds: ['tkt_1', 'tkt_2'],
      quantity: 2,
      orderGrossCents: 100_000,
      currency: 'HTG',
      paymentMethod: 'moncash',
    })

    expect(await reversePromoterSaleForTicket('tkt_2')).toBe(true)
    const promoter = store.get('event_promoters/prm_1')!
    expect(promoter.tickets_sold).toBe(0)
    expect(promoter.commission_cents).toBe(0)
    expect(collectionDocs('promoter_sales')[0].data.status).toBe('reversed')

    // Second reversal of the same order is a no-op.
    expect(await reversePromoterSaleForTicket('tkt_1')).toBe(false)
  })
})
