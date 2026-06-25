/**
 * Unit tests for webhook idempotency (lib/webhooks/idempotency.ts).
 *
 * These guard the Stripe webhook against at-least-once redelivery: the same event
 * must only ever create tickets/earnings/inventory once.
 *
 * We mock @/lib/firebase/admin with an in-memory Firestore that supports the two
 * access patterns the helper uses: runTransaction(get/set) and doc().set().
 */

jest.mock('@/lib/firebase/admin', () => {
  const store = new Map<string, any>()

  const makeRef = (key: string) => ({
    _key: key,
    set: async (data: any, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? store.get(key) || {} : {}
      store.set(key, { ...prev, ...data })
    },
  })

  const tx = {
    get: async (ref: any) => ({
      exists: store.has(ref._key),
      data: () => store.get(ref._key),
    }),
    set: (ref: any, data: any, opts?: { merge?: boolean }) => {
      const prev = opts?.merge ? store.get(ref._key) || {} : {}
      store.set(ref._key, { ...prev, ...data })
    },
  }

  const adminDb = {
    collection: (name: string) => ({ doc: (id: string) => makeRef(`${name}/${id}`) }),
    runTransaction: async (fn: any) => fn(tx),
    __store: store,
  }

  return { adminDb }
})

import {
  claimWebhookEvent,
  markWebhookEventCompleted,
  releaseWebhookEvent,
} from '@/lib/webhooks/idempotency'

const { adminDb } = require('@/lib/firebase/admin') as { adminDb: any }

describe('webhook idempotency', () => {
  beforeEach(() => {
    adminDb.__store.clear()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('claims a fresh event exactly once', async () => {
    const claim = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_1' })
    expect(claim.outcome).toBe('claimed')

    const stored = adminDb.__store.get('webhook_events/stripe__evt_1')
    expect(stored.status).toBe('processing')
    expect(stored.provider).toBe('stripe')
  })

  it('reports a concurrent (still-processing) delivery as in_progress', async () => {
    await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_2' })
    const second = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_2' })
    expect(second.outcome).toBe('in_progress')
  })

  it('reports a completed event as already_processed', async () => {
    await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_3' })
    await markWebhookEventCompleted({ provider: 'stripe', eventId: 'evt_3' })

    const again = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_3' })
    expect(again.outcome).toBe('already_processed')

    const stored = adminDb.__store.get('webhook_events/stripe__evt_3')
    expect(stored.status).toBe('completed')
    expect(stored.completed_at).toBeTruthy()
  })

  it('allows re-claiming after a release (so provider retries can reprocess)', async () => {
    await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_4' })
    await releaseWebhookEvent({ provider: 'stripe', eventId: 'evt_4' })

    const stored = adminDb.__store.get('webhook_events/stripe__evt_4')
    expect(stored.status).toBe('failed')
    expect(stored.started_at).toBeNull()

    const reclaim = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_4' })
    expect(reclaim.outcome).toBe('claimed')
  })

  it('re-claims a stale processing record (previous attempt presumed crashed)', async () => {
    await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_5' })
    // staleMs=0 => any elapsed time counts as stale, so the lock is reclaimable.
    const reclaim = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_5', staleMs: 0 })
    expect(reclaim.outcome).toBe('claimed')
  })

  it('does not dedupe when the event id is missing (proceeds)', async () => {
    const claim = await claimWebhookEvent({ provider: 'stripe', eventId: '' })
    expect(claim.outcome).toBe('claimed')
    expect(adminDb.__store.size).toBe(0)
  })

  it('separates ids per provider (no cross-provider collisions)', async () => {
    const a = await claimWebhookEvent({ provider: 'stripe', eventId: 'shared' })
    const b = await claimWebhookEvent({ provider: 'moncash', eventId: 'shared' })
    expect(a.outcome).toBe('claimed')
    expect(b.outcome).toBe('claimed')
    expect(adminDb.__store.size).toBe(2)
  })

  it('fails open (claimed) if the transaction throws, so payments are never blocked', async () => {
    jest.spyOn(adminDb, 'runTransaction').mockRejectedValueOnce(new Error('firestore down'))
    const claim = await claimWebhookEvent({ provider: 'stripe', eventId: 'evt_6' })
    expect(claim.outcome).toBe('claimed')
  })
})
