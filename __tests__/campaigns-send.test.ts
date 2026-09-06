/**
 * Integration-shaped tests for the discretionary send path.
 *
 * The parts worth proving are the seams, not the copy: that a notification is
 * capped BEFORE it is sent, that a cap the database will not answer for is
 * treated as "already sent", and that the policy gate is actually consulted
 * rather than merely imported.
 */

const users = new Map<string, Record<string, any>>()
const caps = new Map<string, Record<string, any>>()
let capReadFails = false

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection(name: string) {
      const bucket = name === 'users' ? users : caps
      return {
        doc(id: string) {
          return {
            get: async () => {
              if (bucket === caps && capReadFails) throw new Error('firestore down')
              return { exists: bucket.has(id), data: () => bucket.get(id) }
            },
            set: async (data: Record<string, any>) => {
              bucket.set(id, data)
            },
          }
        },
        where: () => ({ get: async () => ({ docs: [] }) }),
      }
    },
  },
}))

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '<ts>' },
}))

const createNotification = jest.fn(async () => 'notif_1')
jest.mock('@/lib/notifications/helpers', () => ({
  createNotification: (...args: any[]) => createNotification(...(args as [])),
}))

const sendPushNotification = jest.fn(async () => undefined)
jest.mock('@/lib/notification-triggers', () => ({
  sendPushNotification: (...args: any[]) => sendPushNotification(...(args as [])),
}))

import { sendDiscretionary } from '@/lib/notifications/campaigns'

const daytimeInHaiti = new Date('2026-09-06T17:00:00.000Z') // 13:00 local

const baseSend = {
  userId: 'u1',
  category: 'filling_fast' as const,
  capKey: 'filling_fast:evt_1',
  type: 'event_filling_fast' as const,
  title: 'Almost gone',
  body: 'Only 3 tickets left.',
  url: '/events/evt_1',
}

describe('sendDiscretionary', () => {
  beforeEach(() => {
    users.clear()
    caps.clear()
    capReadFails = false
    createNotification.mockClear()
    sendPushNotification.mockClear()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.useFakeTimers().setSystemTime(daytimeInHaiti)
    users.set('u1', { last_seen_country: 'HT' })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('sends once and refuses the second time', async () => {
    expect(await sendDiscretionary(baseSend)).toBe(true)
    expect(createNotification).toHaveBeenCalledTimes(1)
    expect(sendPushNotification).toHaveBeenCalledTimes(1)

    expect(await sendDiscretionary(baseSend)).toBe(false)
    // Still one — "filling fast" is not more true the second time.
    expect(createNotification).toHaveBeenCalledTimes(1)
  })

  it('records the cap before sending, not after', async () => {
    // If the order were reversed, a crash between send and record would let a
    // retry re-notify everyone.
    createNotification.mockImplementationOnce(async () => {
      expect(caps.has('u1__filling_fast:evt_1')).toBe(true)
      return 'notif_1'
    })
    expect(await sendDiscretionary(baseSend)).toBe(true)
  })

  it('treats an unreadable cap as already sent', async () => {
    capReadFails = true
    expect(await sendDiscretionary(baseSend)).toBe(false)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('honours an opt-out', async () => {
    users.set('u1', { last_seen_country: 'HT', notify_filling_fast: false })
    expect(await sendDiscretionary(baseSend)).toBe(false)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('holds a discretionary send during local quiet hours', async () => {
    jest.setSystemTime(new Date('2026-09-07T03:00:00.000Z')) // 23:00 in Haiti
    expect(await sendDiscretionary(baseSend)).toBe(false)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('sends a transactional notification even at 3am', async () => {
    jest.setSystemTime(new Date('2026-09-07T07:00:00.000Z')) // 03:00 in Haiti
    const sent = await sendDiscretionary({
      ...baseSend,
      category: 'reminder',
      capKey: 'reminder:evt_1',
      type: 'event_reminder_30min',
    })
    expect(sent).toBe(true)
  })

  it('reports failure rather than claiming a send that threw', async () => {
    createNotification.mockRejectedValueOnce(new Error('write failed'))
    expect(await sendDiscretionary(baseSend)).toBe(false)
  })

  it('still applies quiet hours to a user with no stored market', async () => {
    users.clear() // no user doc: preferences and country both unknown
    // Unknown market falls back to the UTC-5 band both main audiences sit in,
    // rather than UTC — which would have silenced the whole afternoon and
    // pushed at local midnight.
    expect(await sendDiscretionary(baseSend)).toBe(true) // 12:00 in that band

    caps.clear()
    jest.setSystemTime(new Date('2026-09-07T04:00:00.000Z')) // 23:00 in that band
    expect(await sendDiscretionary(baseSend)).toBe(false)
  })
})
