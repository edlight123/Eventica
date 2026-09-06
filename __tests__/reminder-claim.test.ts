/**
 * Integration-shaped tests for the reminder send-once claim.
 *
 * These exercise the Firestore seam with an in-memory fake that keeps real
 * transaction semantics (read-then-write inside runTransaction), because the
 * whole point of the claim is what happens when two runs race for the same
 * reminder. Unit-testing the arithmetic around it would prove nothing.
 */

interface FakeDoc {
  data: Record<string, any>
}

class FakeFirestore {
  store = new Map<string, FakeDoc>()
  /** Set to make the next transaction throw, simulating Firestore being down. */
  failNext = false

  private key(collection: string, id: string) {
    return `${collection}/${id}`
  }

  collection(name: string) {
    const self = this
    return {
      doc(id: string) {
        const k = self.key(name, id)
        return {
          _key: k,
          get: async () => ({
            exists: self.store.has(k),
            data: () => self.store.get(k)?.data,
          }),
          set: async (data: Record<string, any>) => {
            self.store.set(k, { data })
          },
          delete: async () => {
            self.store.delete(k)
          },
        }
      },
    }
  }

  /**
   * Transactions run one at a time.
   *
   * Firestore guarantees serializable isolation — it retries a transaction whose
   * read set changed before commit. Modelling that is the whole reason this fake
   * exists: a naive version that lets every caller read before anyone writes
   * reports three winners for one claim and would "prove" the production code
   * broken when it is the fake that is wrong.
   */
  private queue: Promise<unknown> = Promise.resolve()

  async runTransaction(fn: (tx: any) => Promise<any>) {
    const run = this.queue.then(() => this.runTransactionUnlocked(fn))
    // Keep the chain alive even when a transaction rejects.
    this.queue = run.catch(() => undefined)
    return run
  }

  private async runTransactionUnlocked(fn: (tx: any) => Promise<any>) {
    if (this.failNext) {
      this.failNext = false
      throw new Error('firestore unavailable')
    }
    const self = this
    const tx = {
      get: async (ref: any) => ({
        exists: self.store.has(ref._key),
        data: () => self.store.get(ref._key)?.data,
      }),
      set: (ref: any, data: Record<string, any>) => {
        self.store.set(ref._key, { data })
      },
    }
    return fn(tx)
  }
}

const fake = new FakeFirestore()

jest.mock('@/lib/firebase/admin', () => ({
  get adminDb() {
    return fake
  },
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '<server-timestamp>' },
}))

import { claimReminder, releaseReminderClaim } from '@/lib/notifications/reminder-claim'

describe('reminder claim', () => {
  beforeEach(() => {
    fake.store.clear()
    fake.failNext = false
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('lets exactly one caller win', async () => {
    expect(await claimReminder('evt_1', 'event_reminder_24h')).toBe(true)
    expect(await claimReminder('evt_1', 'event_reminder_24h')).toBe(false)
    expect(await claimReminder('evt_1', 'event_reminder_24h')).toBe(false)
  })

  it('scopes the claim to the event AND the tier', async () => {
    // A 24h reminder going out must not consume the 3h one for the same event.
    expect(await claimReminder('evt_1', 'event_reminder_24h')).toBe(true)
    expect(await claimReminder('evt_1', 'event_reminder_3h')).toBe(true)
    expect(await claimReminder('evt_2', 'event_reminder_24h')).toBe(true)
  })

  it('survives concurrent runs without double-sending', async () => {
    // Two overlapping cron runs hitting the same event — the exact case an
    // hour-wide window makes routine.
    const results = await Promise.all([
      claimReminder('evt_race', 'event_reminder_3h'),
      claimReminder('evt_race', 'event_reminder_3h'),
      claimReminder('evt_race', 'event_reminder_3h'),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it('allows a retry after the claim is released', async () => {
    expect(await claimReminder('evt_2', 'event_reminder_30min')).toBe(true)
    await releaseReminderClaim('evt_2', 'event_reminder_30min')
    // A transient send failure must not lose the reminder permanently.
    expect(await claimReminder('evt_2', 'event_reminder_30min')).toBe(true)
  })

  it('declines to send when Firestore is unreachable', async () => {
    fake.failNext = true
    // Fail closed: skipping one reminder beats pushing to every attendee twice.
    expect(await claimReminder('evt_3', 'event_reminder_24h')).toBe(false)
  })

  it('records what was claimed, for debugging a missed reminder', async () => {
    await claimReminder('evt_4', 'event_reminder_3h')
    const stored = fake.store.get('reminderClaims/evt_4__event_reminder_3h')
    expect(stored?.data).toMatchObject({
      eventId: 'evt_4',
      reminderType: 'event_reminder_3h',
    })
  })
})
