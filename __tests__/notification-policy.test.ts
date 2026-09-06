import {
  decideSend,
  isQuietHour,
  localHour,
  isTransactional,
  QUIET_HOURS_START,
  QUIET_HOURS_END,
} from '@/lib/notifications/policy'

describe('notification policy', () => {
  // 02:00 UTC = 21:00 the previous evening in Port-au-Prince (UTC-5).
  const lateNightUtc = new Date('2026-09-07T02:00:00.000Z')
  // 17:00 UTC = 12:00 in Port-au-Prince.
  const middayUtc = new Date('2026-09-06T17:00:00.000Z')

  it('never suppresses a transactional notification', () => {
    for (const category of ['purchase', 'reminder', 'event_change'] as const) {
      expect(isTransactional(category)).toBe(true)
      const decision = decideSend({
        user: { last_seen_country: 'HT' },
        category,
        now: lateNightUtc,
        sentRecently: true,
      })
      // Quiet hours and the frequency cap must not touch these: a ticket
      // confirmation held until morning is a support ticket.
      expect(decision.send).toBe(true)
    }
  })

  it('holds discretionary notifications during quiet hours', () => {
    const decision = decideSend({
      user: { last_seen_country: 'HT' },
      category: 'discovery',
      now: lateNightUtc,
    })
    expect(decision).toEqual({ send: false, reason: 'quiet_hours' })
  })

  it('sends discretionary notifications during the day', () => {
    const decision = decideSend({
      user: { last_seen_country: 'HT' },
      category: 'filling_fast',
      now: middayUtc,
    })
    expect(decision).toEqual({ send: true, reason: 'ok' })
  })

  it('respects an explicit opt-out even at a good hour', () => {
    const decision = decideSend({
      user: { last_seen_country: 'HT', notify_discovery: false },
      category: 'discovery',
      now: middayUtc,
    })
    expect(decision).toEqual({ send: false, reason: 'category_disabled' })
  })

  it('treats a missing preference as opted in', () => {
    // Existing users never saw these settings; defaulting to off would ship a
    // feature that reaches nobody.
    const decision = decideSend({ user: {}, category: 'filling_fast', now: middayUtc })
    expect(decision.send).toBe(true)
  })

  it('honours the frequency cap for discretionary sends', () => {
    const decision = decideSend({
      user: { last_seen_country: 'HT' },
      category: 'filling_fast',
      now: middayUtc,
      sentRecently: true,
    })
    expect(decision).toEqual({ send: false, reason: 'capped' })
  })

  it('uses the recipient market to decide what "night" means', () => {
    // The same instant is a different hour in Haiti and France, so the same
    // push is quiet-houred for one and not the other.
    // September, so both markets are on summer time: Haiti UTC-4, France UTC+2.
    // Reading the zone through Intl rather than a fixed offset is what makes
    // this correct in both halves of the year.
    const instant = new Date('2026-09-06T20:00:00.000Z')
    expect(localHour(instant, 'HT')).toBe(16)
    expect(localHour(instant, 'FR')).toBe(22)
    expect(isQuietHour(localHour(instant, 'HT'))).toBe(false)
    expect(isQuietHour(localHour(instant, 'FR'))).toBe(true)
  })

  it('marks the quiet window inclusively at its start and exclusively at its end', () => {
    expect(isQuietHour(QUIET_HOURS_START)).toBe(true)
    expect(isQuietHour(QUIET_HOURS_END)).toBe(false)
    expect(isQuietHour(QUIET_HOURS_END - 1)).toBe(true)
  })
})
