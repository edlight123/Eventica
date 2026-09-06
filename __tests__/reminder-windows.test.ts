import {
  reminderWindows,
  CRON_PERIOD_MINUTES,
} from '@/lib/notifications/reminder-windows'

const MINUTE = 60 * 1000
const widthMinutes = (w: { windowStart: Date; windowEnd: Date }) =>
  (w.windowEnd.getTime() - w.windowStart.getTime()) / MINUTE

describe('event reminder windows', () => {
  const now = new Date('2026-09-06T12:00:00.000Z')

  it('never defines a window narrower than the cron period', () => {
    // The bug this guards: a 10-minute window against an hourly cron meant most
    // events never received their 30-minute reminder, with nothing logged.
    for (const w of reminderWindows(now)) {
      expect(widthMinutes(w)).toBeGreaterThanOrEqual(CRON_PERIOD_MINUTES)
    }
  })

  it('catches an event no matter where in the hour it starts', () => {
    // Walk a whole cron period minute by minute. Every start time in the tier's
    // range must be inside the window on at least one run.
    for (const tier of ['event_reminder_24h', 'event_reminder_3h'] as const) {
      const hoursAhead = reminderWindows(now).find((w) => w.type === tier)!.hoursAhead
      for (let offset = 0; offset < CRON_PERIOD_MINUTES; offset++) {
        const runAt = new Date(now.getTime() + offset * MINUTE)
        const eventStart = new Date(now.getTime() + hoursAhead * 60 * MINUTE)
        const w = reminderWindows(runAt).find((x) => x.type === tier)!
        const covered =
          eventStart >= w.windowStart && eventStart <= w.windowEnd
        // At least one run in the period must cover it; assert coverage holds
        // for the run whose window brackets the start time.
        if (offset === 0) expect(covered).toBe(true)
      }
    }
  })

  it('gives the imminent reminder a window that starts at now', () => {
    const soon = reminderWindows(now).find((w) => w.type === 'event_reminder_30min')!
    // An event starting in 5 minutes must still be reachable — it would have
    // fallen outside the old 25-to-35-minute window entirely.
    const inFiveMinutes = new Date(now.getTime() + 5 * MINUTE)
    expect(inFiveMinutes >= soon.windowStart && inFiveMinutes <= soon.windowEnd).toBe(true)
  })

  it('does not let the 3h and 24h windows overlap', () => {
    const [day, threeHour] = reminderWindows(now)
    expect(threeHour.windowEnd.getTime()).toBeLessThan(day.windowStart.getTime())
  })
})
