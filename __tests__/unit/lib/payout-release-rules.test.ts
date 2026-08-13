/**
 * Unit tests for decideRelease() and the tier helpers in
 * lib/payouts/release-rules.ts — the function that decides whether ticket money
 * may leave for an organizer's bank.
 *
 * Both rails now depend on it (the hourly Stripe cron and gateHaitiWithdrawal),
 * so the thresholds are pinned here rather than only through their callers. It is
 * a pure function: no Firestore, no Stripe, no mocks.
 *
 * What each case protects:
 *  - the ordering of the refusals (a cancelled event must not be judged on time)
 *  - the FX normalisation, so one threshold means one economic amount
 *  - that attendance can only ever ask for human eyes, never release money
 *  - that pre-event release cannot happen without BOTH the volume bar and the
 *    explicit admin grant
 */

import {
  decideRelease,
  isEstablished,
  isPreEventEligible,
  tierFor,
  holdHoursFor,
  toThresholdMinor,
  resolveConfig,
  type EventForRelease,
  type OrganizerHistory,
} from '@/lib/payouts/release-rules'
import { DEFAULT_PAYOUT_RELEASE_CONFIG } from '@/types/platform-settings'

const CFG = DEFAULT_PAYOUT_RELEASE_CONFIG
const NOW = new Date('2026-08-13T12:00:00.000Z')

/** Hours before NOW, as an ISO string. */
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()
/** Hours after NOW. */
const hoursAhead = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString()

function event(overrides: Partial<EventForRelease> = {}): EventForRelease {
  return {
    eventId: 'evt_1',
    organizerId: 'org_1',
    endsAt: hoursAgo(100),
    status: 'published',
    grossMinor: 50_000, // $500 — under the review bar
    currency: 'USD',
    rail: 'card',
    checkedInRatio: 0.6,
    manualCheckInRatio: 0.1,
    refundedMinor: 0,
    hasOpenDispute: false,
    ...overrides,
  }
}

function history(overrides: Partial<OrganizerHistory> = {}): OrganizerHistory {
  return {
    completedEvents: 0,
    lifetimeGrossMinor: 0,
    currency: 'USD',
    ...overrides,
  }
}

const decide = (
  e: Partial<EventForRelease>,
  h: Partial<OrganizerHistory> = {},
  availableMinor = 50_000
) => decideRelease({ event: event(e), history: history(h), availableMinor, config: CFG, now: NOW })

describe('tiers', () => {
  it('starts every organizer as new', () => {
    expect(tierFor(history(), CFG)).toBe('new')
    expect(holdHoursFor(history(), CFG)).toBe(72)
  })

  it('becomes established on clean events OR lifetime gross, whichever comes first', () => {
    expect(isEstablished(history({ completedEvents: 3 }), CFG)).toBe(true)
    expect(isEstablished(history({ lifetimeGrossMinor: 100_000 }), CFG)).toBe(true)
    expect(isEstablished(history({ completedEvents: 2, lifetimeGrossMinor: 99_999 }), CFG)).toBe(
      false
    )
    expect(holdHoursFor(history({ completedEvents: 3 }), CFG)).toBe(24)
  })

  it('honours an admin forceEstablished grant for a known promoter', () => {
    expect(isEstablished(history({ forceEstablished: true }), CFG)).toBe(true)
  })

  it('never reaches pre_event on volume alone — the admin grant is required', () => {
    const rich = history({ lifetimeGrossMinor: 500_000 })
    expect(isPreEventEligible(rich, CFG)).toBe(false)
    expect(tierFor(rich, CFG)).toBe('established')

    const granted = history({ lifetimeGrossMinor: 500_000, preEventReleaseApproved: true })
    expect(isPreEventEligible(granted, CFG)).toBe(true)
    expect(tierFor(granted, CFG)).toBe('pre_event')
    expect(holdHoursFor(granted, CFG)).toBe(0)
  })

  it('does not let the grant alone bypass the volume bar', () => {
    const small = history({ lifetimeGrossMinor: 199_999, preEventReleaseApproved: true })
    expect(isPreEventEligible(small, CFG)).toBe(false)
    expect(tierFor(small, CFG)).toBe('established') // 199,999 clears the established bar
  })
})

describe('FX normalisation of thresholds', () => {
  it('judges an HTG organizer by the same economic bar as a USD one', () => {
    // Rates are minor-unit to minor-unit: 1 HTG centime = 0.0076 US cents, so
    // the $1,000 bar is ~13.2M centimes (~132,000 HTG).
    // 13,000,000 centimes = 130,000 HTG ≈ $988 — short of the bar.
    expect(isEstablished(history({ lifetimeGrossMinor: 13_000_000, currency: 'HTG' }), CFG)).toBe(
      false
    )
    // 13,200,000 centimes = 132,000 HTG ≈ $1,003.
    expect(isEstablished(history({ lifetimeGrossMinor: 13_200_000, currency: 'HTG' }), CFG)).toBe(
      true
    )
  })

  it('leaves an amount untouched when no rate is configured, rather than inventing one', () => {
    expect(toThresholdMinor(50_000, 'XYZ', CFG)).toBe(50_000)
    expect(toThresholdMinor(50_000, null, CFG)).toBe(50_000)
    expect(toThresholdMinor(50_000, 'usd', CFG)).toBe(50_000)
  })
})

describe('refusals, in order', () => {
  it('refuses a cancelled event before considering time or balance', () => {
    const d = decide({ status: 'cancelled', endsAt: hoursAgo(1_000) }, { completedEvents: 99 })
    expect(d).toMatchObject({ release: 'hold', reason: 'event_cancelled', releasableMinor: 0 })
  })

  it('refuses while a dispute is open', () => {
    const d = decide({ hasOpenDispute: true }, { completedEvents: 99 })
    expect(d).toMatchObject({ release: 'hold', reason: 'open_dispute' })
  })

  it('refuses an event with no parseable end date — it cannot be shown to have happened', () => {
    expect(decide({ endsAt: null }).reason).toBe('no_end_date')
    expect(decide({ endsAt: 'not a date' }).reason).toBe('no_end_date')
  })

  it('refuses before the event is over', () => {
    expect(decide({ endsAt: hoursAhead(5) }).reason).toBe('event_not_over')
  })

  it('holds for the tier window after the event ends', () => {
    expect(decide({ endsAt: hoursAgo(1) }).reason).toBe('hold_72h')
    expect(decide({ endsAt: hoursAgo(71) }).reason).toBe('hold_72h')
    expect(decide({ endsAt: hoursAgo(73) }).release).toBe('auto')

    const est = { completedEvents: 3 }
    expect(decide({ endsAt: hoursAgo(23) }, est).reason).toBe('hold_24h')
    expect(decide({ endsAt: hoursAgo(25) }, est).release).toBe('auto')
  })

  it('pays a pre-event organizer before the event ends, and without an end date', () => {
    const granted = { lifetimeGrossMinor: 500_000, preEventReleaseApproved: true }
    expect(decide({ endsAt: hoursAhead(200) }, granted).release).toBe('auto')
    expect(decide({ endsAt: null }, granted).release).toBe('auto')
  })

  it('refuses when the balance has not settled yet', () => {
    const d = decide({}, { completedEvents: 3 }, 0)
    expect(d).toMatchObject({ release: 'hold', reason: 'nothing_available_yet' })
  })
})

describe('releasable amount', () => {
  it('never exceeds gross minus refunds', () => {
    const d = decide({ grossMinor: 50_000, refundedMinor: 20_000 }, { completedEvents: 3 }, 50_000)
    expect(d.releasableMinor).toBe(30_000)
  })

  it('never exceeds the settled balance', () => {
    const d = decide({ grossMinor: 50_000 }, { completedEvents: 3 }, 12_000)
    expect(d.releasableMinor).toBe(12_000)
  })

  it('does not go negative when refunds exceed gross', () => {
    const d = decide({ grossMinor: 10_000, refundedMinor: 25_000 }, { completedEvents: 3 })
    expect(d).toMatchObject({ release: 'hold', reason: 'nothing_available_yet' })
    expect(d.releasableMinor).toBe(0)
  })

  it('withholds no reserve — an eligible payout releases the whole net', () => {
    const d = decide({ grossMinor: 80_000 }, { completedEvents: 3 }, 80_000)
    expect(d.release).toBe('auto')
    expect(d.releasableMinor).toBe(80_000)
  })
})

describe('review signals', () => {
  it('routes a flagged organizer to review, whatever their tier', () => {
    const d = decide({}, { completedEvents: 99, highRisk: true })
    expect(d).toMatchObject({ release: 'review', reason: 'organizer_flagged_high_risk' })
    // Review is not a refusal: the amount travels with it so an admin can approve.
    expect(d.releasableMinor).toBe(50_000)
  })

  it('routes a large event from a new organizer to review, but not from an established one', () => {
    expect(decide({ grossMinor: 150_000 }, {}, 150_000).reason).toBe('large_event_from_new_organizer')
    expect(decide({ grossMinor: 150_000 }, { completedEvents: 3 }, 150_000).release).toBe('auto')
  })

  it('applies the review bar in threshold currency, not raw minor units', () => {
    // 15,000,000 centimes = 150,000 HTG ≈ $1,140 → over the $1,000 bar.
    expect(decide({ grossMinor: 15_000_000, currency: 'HTG' }, {}, 15_000_000).reason).toBe(
      'large_event_from_new_organizer'
    )
    // 10,000,000 centimes = 100,000 HTG ≈ $760 → under it.
    expect(decide({ grossMinor: 10_000_000, currency: 'HTG' }, {}, 10_000_000).release).toBe('auto')
  })

  it('reviews a door that was almost entirely hand-entered', () => {
    const d = decide({ manualCheckInRatio: 0.95, checkedInRatio: 0.5 }, { completedEvents: 3 })
    expect(d).toMatchObject({ release: 'review', reason: 'mostly_manual_checkins' })
  })

  it('ignores a manual ratio when nobody was checked in at all', () => {
    // 100% of zero check-ins is not evidence of anything.
    const d = decide({ manualCheckInRatio: 1, checkedInRatio: 0 }, { completedEvents: 3 })
    expect(d.reason).toBe('very_low_attendance')
  })

  it('reviews a near-empty room', () => {
    expect(decide({ checkedInRatio: 0.05 }, { completedEvents: 3 }).reason).toBe(
      'very_low_attendance'
    )
  })

  it('treats unknown check-in data as no signal rather than a bad one', () => {
    const d = decide(
      { checkedInRatio: null, manualCheckInRatio: null },
      { completedEvents: 3 }
    )
    expect(d).toMatchObject({ release: 'auto', reason: 'eligible' })
  })

  it('never releases on attendance alone — every attendance path is at most review', () => {
    for (const ratio of [0, 0.05, 0.5, 1]) {
      const d = decide({ checkedInRatio: ratio }, { completedEvents: 3 })
      expect(['auto', 'review']).toContain(d.release)
    }
  })
})

describe('resolveConfig', () => {
  it('layers platform settings over the defaults', () => {
    const cfg = resolveConfig({ newHoldHours: 48 })
    expect(cfg.newHoldHours).toBe(48)
    expect(cfg.establishedHoldHours).toBe(CFG.establishedHoldHours)
  })

  it('layers an organizer override over the platform config', () => {
    const cfg = resolveConfig({ newHoldHours: 48 }, { newHoldHours: 12 })
    expect(cfg.newHoldHours).toBe(12)
  })

  it('ignores non-numeric override values instead of poisoning a threshold', () => {
    const cfg = resolveConfig(null, { newHoldHours: undefined })
    expect(cfg.newHoldHours).toBe(CFG.newHoldHours)
  })

  it('feeds a shortened hold straight through to the decision', () => {
    const cfg = resolveConfig(null, { newHoldHours: 1 })
    const d = decideRelease({
      event: event({ endsAt: hoursAgo(2) }),
      history: history(),
      availableMinor: 50_000,
      config: cfg,
      now: NOW,
    })
    expect(d.release).toBe('auto')
  })
})
