/**
 * Free-ticket issuance: POST /api/tickets/claim-free.
 *
 * Exercises the REAL route handler against a fake Firestore, covering both accepted
 * payload shapes:
 *
 *   1. `{ eventId, tierId?, quantity? }` — the ORIGINAL shape. Mobile build 10 is in
 *      testers' hands sending exactly this against production, so these cases are a
 *      frozen contract: change them only when you intend to break shipped clients.
 *   2. `{ eventId, selections: [{ tierId, quantity }] }` — the web selector's cart,
 *      which can span several free tiers and quantities.
 *
 * Every ticket, in both shapes, must pass the same gate: tier belongs to the event,
 * the tier's OWN price is 0, is_active, inside the sale window, not sold out, the
 * per-user free-claim limit, and a single atomic inventory reservation.
 *
 * @jest-environment node
 */

const state: any = {
  tiers: [] as any[],
  existingTickets: [] as any[],
  added: [] as any[],
  reserveCalls: [] as any[],
  reserveResult: { ok: true } as any,
  event: {
    id: 'evt1',
    title: 'Test Event',
    organizer_id: 'org1',
    currency: 'HTG',
    ticket_price: 0,
    start_datetime: '2026-09-01T18:00:00.000Z',
  },
}

jest.mock('@/lib/firebase-db/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth', () => ({ getCurrentUser: jest.fn(async () => ({ id: 'u1', email: 'u@x.com', full_name: 'U' })) }))
jest.mock('@/lib/events/access-guard', () => ({ hasEventAccess: jest.fn(async () => true) }))
jest.mock('@/lib/notifications/helpers', () => ({
  notifyTicketPurchase: jest.fn(async () => {}),
  notifyOrganizerTicketSale: jest.fn(async () => {}),
}))
jest.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => 'TS' } }))
jest.mock('@/lib/tickets/inventory', () => {
  const actual = jest.requireActual('@/lib/tickets/inventory')
  return {
    // REAL merge/normalize logic, so the increments we assert are the real ones.
    buildTierSoldIncrements: actual.buildTierSoldIncrements,
    reserveInventoryAtomic: jest.fn(async (params: any) => {
      state.reserveCalls.push(params)
      return state.reserveResult
    }),
  }
})
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection(name: string) {
      if (name === 'events') {
        return {
          doc: () => ({ get: async () => ({ exists: true, id: 'evt1', data: () => state.event }) }),
        }
      }
      if (name === 'ticket_tiers') {
        return {
          where: () => ({
            get: async () => ({ docs: state.tiers.map((t: any) => ({ id: t.id, data: () => t })) }),
          }),
        }
      }
      if (name === 'tickets') {
        return {
          where: () => ({
            get: async () => ({
              docs: state.existingTickets.map((t: any) => ({ id: t.id, data: () => t })),
            }),
          }),
          add: async (data: any) => {
            const id = `tkt${state.added.length + 1}`
            const stored = { ...data, id }
            state.added.push(stored)
            return {
              id,
              update: async (patch: any) => Object.assign(stored, patch),
              get: async () => ({ id, data: () => stored }),
            }
          },
        }
      }
      throw new Error(`unexpected collection ${name}`)
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/tickets/claim-free/route')

function req(body: any) {
  return { json: async () => body } as any
}

function reset() {
  state.tiers = [
    { id: 'freeA', event_id: 'evt1', name: 'Free RSVP', price: 0, total_quantity: 100, sold_quantity: 0, sort_order: 0 },
    { id: 'freeB', event_id: 'evt1', name: 'Free Student', price: 0, total_quantity: 50, sold_quantity: 0, sort_order: 1 },
    { id: 'paidA', event_id: 'evt1', name: 'General Admission', price: 1500, total_quantity: 100, sold_quantity: 0 },
  ]
  state.existingTickets = []
  state.added = []
  state.reserveCalls = []
  state.reserveResult = { ok: true }
  jest.clearAllMocks()
}

describe('LEGACY shape {eventId, tierId, quantity} — mobile build 10, must not change', () => {
  beforeEach(reset)

  it('issues N tickets against the named free tier', async () => {
    const res = await POST(req({ eventId: 'evt1', tierId: 'freeA', quantity: 2 }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.count).toBe(2)
    expect(body.message).toBe('2 free tickets claimed successfully!')
    expect(body.tickets).toHaveLength(2)
    expect(state.added.map((t: any) => [t.tier_id, t.tier_name, t.price_paid, t.payment_method]))
      .toEqual([['freeA', 'Free RSVP', 0, 'free'], ['freeA', 'Free RSVP', 0, 'free']])
    expect(state.reserveCalls).toEqual([
      { eventId: 'evt1', quantity: 2, tierIncrements: [{ tierId: 'freeA', quantity: 2 }], logPrefix: '[claim-free]' },
    ])
  })

  it('defaults quantity to 1 and singularizes the message', async () => {
    const body = await (await POST(req({ eventId: 'evt1', tierId: 'freeA' }))).json()
    expect(body.count).toBe(1)
    expect(body.message).toBe('1 free ticket claimed successfully!')
  })

  it('clamps quantity to 10 (not an error) exactly as before', async () => {
    const body = await (await POST(req({ eventId: 'evt1', tierId: 'freeA', quantity: 99 }))).json()
    expect(body.count).toBe(10)
    expect(state.added).toHaveLength(10)
  })

  it('auto-resolves the free tier when no tierId is sent', async () => {
    const body = await (await POST(req({ eventId: 'evt1', quantity: 1 }))).json()
    expect(body.count).toBe(1)
    expect(state.added[0].tier_id).toBe('freeA')
  })

  it('still refuses a PAID tier with 400 "This ticket tier is not free"', async () => {
    const res = await POST(req({ eventId: 'evt1', tierId: 'paidA', quantity: 1 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('This ticket tier is not free')
    expect(state.added).toHaveLength(0)
    expect(state.reserveCalls).toHaveLength(0)
  })

  it('still refuses an inactive / out-of-window / sold-out tier', async () => {
    state.tiers[0].is_active = false
    expect((await (await POST(req({ eventId: 'evt1', tierId: 'freeA' }))).json()).error)
      .toBe('This ticket tier is not available.')
    reset()
    state.tiers[0].sales_end = '2020-01-01T00:00:00.000Z'
    expect((await (await POST(req({ eventId: 'evt1', tierId: 'freeA' }))).json()).error)
      .toBe('Ticket sales for this tier have ended.')
    reset()
    state.tiers[0].sold_quantity = 100
    expect((await (await POST(req({ eventId: 'evt1', tierId: 'freeA' }))).json()).error)
      .toBe('This ticket tier is sold out.')
  })

  it('still refuses a tier from another event with 404', async () => {
    const res = await POST(req({ eventId: 'evt1', tierId: 'someone-elses-tier' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Ticket tier not found for this event')
  })

  it('still returns the existing free tickets on a repeat claim (per-user limit)', async () => {
    state.existingTickets = [{ id: 'old1', event_id: 'evt1', price_paid: 0 }]
    const body = await (await POST(req({ eventId: 'evt1', tierId: 'freeA', quantity: 2 }))).json()
    expect(body.message).toBe('You already claimed a ticket for this event.')
    expect(body.count).toBe(1)
    expect(state.added).toHaveLength(0)
  })

  it('still surfaces a capacity refusal without issuing', async () => {
    state.reserveResult = { ok: false, reason: 'tier_capacity', remaining: 1 }
    const res = await POST(req({ eventId: 'evt1', tierId: 'freeA', quantity: 3 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Only 1 ticket remaining')
    expect(state.added).toHaveLength(0)
  })
})

describe('NEW shape {eventId, selections}', () => {
  beforeEach(reset)

  it('issues a multi-tier multi-quantity all-free cart, all-or-nothing in ONE reservation', async () => {
    const res = await POST(req({
      eventId: 'evt1',
      selections: [{ tierId: 'freeA', quantity: 2 }, { tierId: 'freeB', quantity: 3 }],
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.count).toBe(5)
    expect(body.issued).toEqual([
      { tierId: 'freeA', tierName: 'Free RSVP', quantity: 2 },
      { tierId: 'freeB', tierName: 'Free Student', quantity: 3 },
    ])
    expect(state.added.map((t: any) => t.tier_id)).toEqual(['freeA', 'freeA', 'freeB', 'freeB', 'freeB'])
    // ONE transaction covering the whole order -> all-or-nothing.
    expect(state.reserveCalls).toHaveLength(1)
    expect(state.reserveCalls[0]).toEqual({
      eventId: 'evt1',
      quantity: 5,
      tierIncrements: [{ tierId: 'freeA', quantity: 2 }, { tierId: 'freeB', quantity: 3 }],
      logPrefix: '[claim-free]',
    })
  })

  it('merges duplicate tier lines', async () => {
    const body = await (await POST(req({
      eventId: 'evt1',
      selections: [{ tierId: 'freeA', quantity: 1 }, { tierId: 'freeA', quantity: 2 }],
    }))).json()
    expect(body.count).toBe(3)
    expect(body.issued).toEqual([{ tierId: 'freeA', tierName: 'Free RSVP', quantity: 3 }])
  })

  it('refuses the WHOLE claim if any line is a paid tier — nothing is issued', async () => {
    const res = await POST(req({
      eventId: 'evt1',
      selections: [{ tierId: 'freeA', quantity: 1 }, { tierId: 'paidA', quantity: 1 }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('This ticket tier is not free')
    expect(state.added).toHaveLength(0)
    expect(state.reserveCalls).toHaveLength(0)
  })

  it('refuses the whole claim if any line is sold out / not on sale / foreign', async () => {
    state.tiers[1].sold_quantity = 50
    let res = await POST(req({ eventId: 'evt1', selections: [{ tierId: 'freeA', quantity: 1 }, { tierId: 'freeB', quantity: 1 }] }))
    expect((await res.json()).error).toBe('This ticket tier is sold out.')
    expect(state.added).toHaveLength(0)
    reset()
    res = await POST(req({ eventId: 'evt1', selections: [{ tierId: 'freeA', quantity: 1 }, { tierId: 'nope', quantity: 1 }] }))
    expect(res.status).toBe(404)
    expect(state.added).toHaveLength(0)
  })

  it('refuses (does not truncate) a cart over the 10-ticket cap', async () => {
    const res = await POST(req({
      eventId: 'evt1',
      selections: [{ tierId: 'freeA', quantity: 6 }, { tierId: 'freeB', quantity: 6 }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('You can claim at most 10 free tickets at a time.')
    expect(state.added).toHaveLength(0)
  })

  it('rejects a selections array with no usable line', async () => {
    const res = await POST(req({ eventId: 'evt1', selections: [{ tierId: 'freeA', quantity: 0 }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('No valid ticket selections provided')
  })

  it('an EMPTY selections array falls through to the legacy path (unchanged)', async () => {
    const body = await (await POST(req({ eventId: 'evt1', selections: [], quantity: 2 }))).json()
    expect(body.count).toBe(2)
    expect(state.added[0].tier_id).toBe('freeA')
  })

  it('issues nothing when the atomic reservation refuses the multi-tier order', async () => {
    state.reserveResult = { ok: false, reason: 'tier_capacity', remaining: 0 }
    const res = await POST(req({ eventId: 'evt1', selections: [{ tierId: 'freeA', quantity: 2 }, { tierId: 'freeB', quantity: 2 }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('No tickets available')
    expect(state.added).toHaveLength(0)
  })

  it('applies the same per-user free-claim limit', async () => {
    state.existingTickets = [{ id: 'old1', event_id: 'evt1', price_paid: 0 }]
    const body = await (await POST(req({ eventId: 'evt1', selections: [{ tierId: 'freeA', quantity: 2 }] }))).json()
    expect(body.message).toBe('You already claimed a ticket for this event.')
    expect(state.added).toHaveLength(0)
  })
})
