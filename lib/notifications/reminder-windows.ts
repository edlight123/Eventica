/**
 * When each event reminder fires, as pure data.
 *
 * Extracted from the cron route so the one property that actually matters can be
 * asserted in a test: NO WINDOW MAY BE NARROWER THAN THE CRON PERIOD. The
 * 30-minute reminder shipped with a 10-minute window against an hourly cron, so
 * an event only got that reminder if its start time happened to land in the
 * right ten minutes — about one event in six, silently.
 */
export type ReminderType =
  | 'event_reminder_24h'
  | 'event_reminder_3h'
  | 'event_reminder_30min'

export interface ReminderWindow {
  type: ReminderType
  hoursAhead: number
  windowStart: Date
  windowEnd: Date
  label: string
}

/** How often the cron runs, in minutes. Must match vercel.json. */
export const CRON_PERIOD_MINUTES = 60

const MINUTE = 60 * 1000

/**
 * Each window is one full cron period wide and they do not overlap, so every
 * upcoming event lands in exactly one window per reminder tier, on exactly one
 * run. Sending once is then guaranteed by the claim in `reminder-claim.ts`
 * rather than by the arithmetic here.
 */
export function reminderWindows(now: Date = new Date()): ReminderWindow[] {
  const width = CRON_PERIOD_MINUTES * MINUTE
  const at = (minutesAhead: number) => new Date(now.getTime() + minutesAhead * MINUTE)

  return [
    {
      type: 'event_reminder_24h',
      hoursAhead: 24,
      windowStart: at(24 * 60 - CRON_PERIOD_MINUTES / 2),
      windowEnd: new Date(at(24 * 60 - CRON_PERIOD_MINUTES / 2).getTime() + width),
      label: '24 hours',
    },
    {
      type: 'event_reminder_3h',
      hoursAhead: 3,
      windowStart: at(3 * 60 - CRON_PERIOD_MINUTES / 2),
      windowEnd: new Date(at(3 * 60 - CRON_PERIOD_MINUTES / 2).getTime() + width),
      label: '3 hours',
    },
    {
      // Runs from "now" to one period out, so an event starting in five minutes
      // still gets its last call on this run rather than after it has begun.
      type: 'event_reminder_30min',
      hoursAhead: 0.5,
      windowStart: at(0),
      windowEnd: at(CRON_PERIOD_MINUTES),
      label: '30 minutes',
    },
  ]
}
