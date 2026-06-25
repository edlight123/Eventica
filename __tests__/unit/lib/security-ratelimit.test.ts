/**
 * Tests for shouldRateLimit() — the purchase rate limiter.
 *
 * Focus: it must be USER-centric (so Haiti carrier-grade NAT, where many unrelated buyers share a
 * few public IPs, does NOT false-block legitimate buyers), while still stopping a single farmed
 * account and keeping a generous anonymous IP backstop.
 */

// Avoid initializing real Firebase Admin / email when importing lib/security.
jest.mock('@/lib/firebase/admin', () => ({ adminDb: {} }))
jest.mock('@/lib/email', () => ({ sendEmail: jest.fn() }))
jest.mock('@/lib/admin', () => ({ getAdminEmails: jest.fn(async () => []) }))

// In-memory purchase_attempts table with a thenable query builder matching the adapter surface
// used by shouldRateLimit: from().select().eq().eq().gte() awaited to { data }.
let rows: Array<Record<string, any>> = []

jest.mock('@/lib/firebase-db/server', () => ({
  createClient: async () => ({
    from: () => {
      const eqs: Record<string, any> = {}
      let gte: { col: string; val: any } | null = null
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          eqs[col] = val
          return builder
        },
        gte: (col: string, val: any) => {
          gte = { col, val }
          return builder
        },
        then: (resolve: any) => {
          const data = rows.filter((r) => {
            for (const [k, v] of Object.entries(eqs)) {
              if (r[k] !== v) return false
            }
            if (gte && !(String(r[gte.col]) >= String(gte.val))) return false
            return true
          })
          resolve({ data })
        },
      }
      return builder
    },
  }),
}))

import { shouldRateLimit } from '@/lib/security'

const now = () => new Date().toISOString()

function makeAttempts(n: number, fields: Record<string, any>) {
  return Array.from({ length: n }, () => ({ attempted_at: now(), ...fields }))
}

beforeEach(() => {
  rows = []
})

describe('shouldRateLimit() — user-centric', () => {
  it('allows a normal authenticated buyer with a few attempts', async () => {
    rows = makeAttempts(3, { user_id: 'u1', event_id: 'e1' })
    expect(await shouldRateLimit('u1', '1.2.3.4', 'e1')).toEqual({ limited: false })
  })

  it('does NOT block an authenticated buyer just because the shared IP is busy (carrier NAT)', async () => {
    // 80 attempts from the SAME IP but by OTHER users; our user has only 1.
    rows = [
      ...makeAttempts(80, { user_id: 'someone_else', event_id: 'e1', ip_address: '190.115.1.1' }),
      ...makeAttempts(1, { user_id: 'u1', event_id: 'e1', ip_address: '190.115.1.1' }),
    ]
    expect(await shouldRateLimit('u1', '190.115.1.1', 'e1')).toEqual({ limited: false })
  })

  it('blocks one account hammering a single event (>= 12 attempts)', async () => {
    rows = makeAttempts(12, { user_id: 'u1', event_id: 'e1' })
    const result = await shouldRateLimit('u1', '1.2.3.4', 'e1')
    expect(result.limited).toBe(true)
    expect(result.reason).toMatch(/this event/i)
  })

  it('blocks a farmed account spread thin across many events (>= 25 total)', async () => {
    // 25 attempts, each on a DIFFERENT event (so the per-event check never trips), same user.
    rows = Array.from({ length: 25 }, (_, i) => ({ user_id: 'u1', event_id: `e${i}`, attempted_at: now() }))
    const result = await shouldRateLimit('u1', '1.2.3.4', 'eX')
    expect(result.limited).toBe(true)
    expect(result.reason).toMatch(/too many purchase attempts/i)
  })

  it('anonymous: allows a busy shared IP under the generous backstop', async () => {
    rows = makeAttempts(50, { ip_address: '190.115.1.1' })
    expect(await shouldRateLimit(null, '190.115.1.1', 'e1')).toEqual({ limited: false })
  })

  it('anonymous: blocks an egregious botnet behind one IP (>= 100)', async () => {
    rows = makeAttempts(100, { ip_address: '190.115.1.1' })
    const result = await shouldRateLimit(null, '190.115.1.1', 'e1')
    expect(result.limited).toBe(true)
    expect(result.reason).toMatch(/network/i)
  })
})
