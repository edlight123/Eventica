/**
 * Unit tests for the shared ticket-inventory helpers used by every payment
 * fulfillment path (MonCash Button, Stripe Checkout, Stripe PaymentIntents).
 *
 * buildTierSoldIncrements() is tested as a pure function.
 * applySoldCountIncrements() is tested against a mocked Firestore so we can assert
 * the exact atomic increments without touching a real database.
 */

// Mock FieldValue.increment to a recognizable sentinel so we can assert on payloads.
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}))

// Mock the admin DB with stable doc/set spies and expose them for assertions.
jest.mock('@/lib/firebase/admin', () => {
  const set = jest.fn().mockResolvedValue(undefined)
  const doc = jest.fn(() => ({ set }))
  const collection = jest.fn(() => ({ doc }))
  return { adminDb: { collection }, __mock: { set, doc, collection } }
})

import { applySoldCountIncrements, buildTierSoldIncrements } from '@/lib/tickets/inventory'

const adminMock = require('@/lib/firebase/admin').__mock as {
  set: jest.Mock
  doc: jest.Mock
  collection: jest.Mock
}

describe('buildTierSoldIncrements()', () => {
  it('returns [] for null/undefined/empty input', () => {
    expect(buildTierSoldIncrements(null)).toEqual([])
    expect(buildTierSoldIncrements(undefined)).toEqual([])
    expect(buildTierSoldIncrements([])).toEqual([])
  })

  it('maps a single tier selection to one increment', () => {
    expect(buildTierSoldIncrements([{ tierId: 'tierA', quantity: 2 }])).toEqual([
      { tierId: 'tierA', quantity: 2 },
    ])
  })

  it('ignores selections without a tierId (base-price / General Admission)', () => {
    expect(
      buildTierSoldIncrements([
        { tierId: null, quantity: 3 },
        { tierId: undefined, quantity: 1 },
        { quantity: 5 } as any,
      ])
    ).toEqual([])
  })

  it('ignores non-positive, NaN, or missing quantities', () => {
    expect(
      buildTierSoldIncrements([
        { tierId: 'a', quantity: 0 },
        { tierId: 'b', quantity: -2 },
        { tierId: 'c', quantity: Number.NaN },
        { tierId: 'd', quantity: null },
      ])
    ).toEqual([])
  })

  it('merges duplicate tierIds into a single summed increment', () => {
    expect(
      buildTierSoldIncrements([
        { tierId: 'tierA', quantity: 2 },
        { tierId: 'tierB', quantity: 1 },
        { tierId: 'tierA', quantity: 3 },
      ])
    ).toEqual([
      { tierId: 'tierA', quantity: 5 },
      { tierId: 'tierB', quantity: 1 },
    ])
  })

  it('coerces non-string tierIds to strings', () => {
    expect(buildTierSoldIncrements([{ tierId: 123 as any, quantity: 1 }])).toEqual([
      { tierId: '123', quantity: 1 },
    ])
  })
})

describe('applySoldCountIncrements()', () => {
  beforeEach(() => {
    adminMock.set.mockClear()
    adminMock.doc.mockClear()
    adminMock.collection.mockClear()
    adminMock.set.mockResolvedValue(undefined)
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('atomically increments the event and each tier', async () => {
    await applySoldCountIncrements({
      eventId: 'evt1',
      quantity: 5,
      tierIncrements: [
        { tierId: 'tierA', quantity: 2 },
        { tierId: 'tierB', quantity: 3 },
      ],
    })

    // event first, then each tier
    expect(adminMock.collection).toHaveBeenNthCalledWith(1, 'events')
    expect(adminMock.collection).toHaveBeenNthCalledWith(2, 'ticket_tiers')
    expect(adminMock.collection).toHaveBeenNthCalledWith(3, 'ticket_tiers')

    expect(adminMock.doc).toHaveBeenNthCalledWith(1, 'evt1')
    expect(adminMock.doc).toHaveBeenNthCalledWith(2, 'tierA')
    expect(adminMock.doc).toHaveBeenNthCalledWith(3, 'tierB')

    expect(adminMock.set).toHaveBeenNthCalledWith(
      1,
      { tickets_sold: { __increment: 5 } },
      { merge: true }
    )
    expect(adminMock.set).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sold_quantity: { __increment: 2 } }),
      { merge: true }
    )
    expect(adminMock.set).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ sold_quantity: { __increment: 3 } }),
      { merge: true }
    )
  })

  it('increments only the event when there are no tier increments', async () => {
    await applySoldCountIncrements({ eventId: 'evt1', quantity: 1, tierIncrements: [] })
    expect(adminMock.collection).toHaveBeenCalledTimes(1)
    expect(adminMock.collection).toHaveBeenCalledWith('events')
    expect(adminMock.set).toHaveBeenCalledTimes(1)
  })

  it('skips the event increment for a non-positive/invalid quantity', async () => {
    await applySoldCountIncrements({
      eventId: 'evt1',
      quantity: 0,
      tierIncrements: [{ tierId: 'tierA', quantity: 2 }],
    })
    // Only the tier should be written; the event quantity (0) is skipped.
    expect(adminMock.collection).toHaveBeenCalledTimes(1)
    expect(adminMock.collection).toHaveBeenCalledWith('ticket_tiers')
  })

  it('never throws if a Firestore write fails (logs a warning instead)', async () => {
    adminMock.set.mockRejectedValue(new Error('firestore down'))
    await expect(
      applySoldCountIncrements({
        eventId: 'evt1',
        quantity: 2,
        tierIncrements: [{ tierId: 'tierA', quantity: 2 }],
      })
    ).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalled()
  })
})
