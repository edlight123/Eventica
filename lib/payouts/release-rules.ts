/**
 * WHEN a connected account's ticket money is allowed to reach their bank.
 *
 * Connected accounts are on a manual payout schedule, so nothing leaves Stripe
 * until this says so. The rules are deliberately about TIME and MONEY rather
 * than attendance: check-in counts are organizer-controlled (a manual check-in
 * is indistinguishable from a scan in stored data), so attendance can inform
 * review but must never release funds.
 *
 * Everything here is pure so it can be unit-tested without Stripe or Firestore.
 */

export type OrganizerHistory = {
  /** Events this organizer has completed WITHOUT a dispute or refund storm. */
  completedEvents: number
  /** Lifetime gross ticket volume, in minor units of the account currency. */
  lifetimeGrossMinor: number
}

export type EventForRelease = {
  eventId: string
  organizerId: string
  /** Event end (ISO). Nothing releases before this, ever. */
  endsAt: string | null
  status: string | null
  /** Gross for THIS event, minor units. */
  grossMinor: number
  /** Share of tickets checked in, 0..1, or null when unknown. */
  checkedInRatio: number | null
  /** Share of check-ins entered by hand rather than scanned, 0..1, or null. */
  manualCheckInRatio: number | null
  /** Refunds already issued for this event, minor units. */
  refundedMinor: number
  hasOpenDispute: boolean
}

export type ReleaseDecision =
  | { release: 'hold'; reason: string; releasableMinor: 0 }
  | { release: 'review'; reason: string; releasableMinor: number }
  | { release: 'auto'; reason: string; releasableMinor: number }

/** New organizers wait a full week after the event; established ones a day. */
export const NEW_ORGANIZER_HOLD_HOURS = 7 * 24
export const ESTABLISHED_HOLD_HOURS = 24

/** An organizer stops being "new" at whichever of these comes first. */
export const ESTABLISHED_AFTER_EVENTS = 3
export const ESTABLISHED_AFTER_GROSS_MINOR = 500_000 // $5,000 / 500k HTG

/** Above this per-event gross, a human looks before money moves. */
export const REVIEW_ABOVE_GROSS_MINOR = 100_000 // $1,000 / 100k HTG

/**
 * Held back against chargebacks that arrive long after the event. Card disputes
 * can land months later and, because Tikèm is merchant of record on the Stripe
 * rail, they land on the platform.
 */
export const RESERVE_BPS = 1000 // 10.00%
export const RESERVE_RELEASE_DAYS = 60

/** A manual-check-in ratio this high means the door was never really scanned. */
export const MANUAL_CHECKIN_REVIEW_RATIO = 0.8
/** Almost nobody turned up — worth a look regardless of what was scanned. */
export const LOW_ATTENDANCE_REVIEW_RATIO = 0.2

export function isEstablished(history: OrganizerHistory): boolean {
  return (
    history.completedEvents >= ESTABLISHED_AFTER_EVENTS ||
    history.lifetimeGrossMinor >= ESTABLISHED_AFTER_GROSS_MINOR
  )
}

export function holdHoursFor(history: OrganizerHistory): number {
  return isEstablished(history) ? ESTABLISHED_HOLD_HOURS : NEW_ORGANIZER_HOLD_HOURS
}

export function reserveMinor(grossMinor: number): number {
  return Math.floor((Math.max(0, grossMinor) * RESERVE_BPS) / 10_000)
}

/**
 * Decide what (if anything) may be paid out for one event right now.
 * `availableMinor` is the connected account's genuinely available Stripe balance
 * — funds still in Stripe's pending window cannot be paid out at all.
 */
export function decideRelease({
  event,
  history,
  availableMinor,
  now = new Date(),
}: {
  event: EventForRelease
  history: OrganizerHistory
  availableMinor: number
  now?: Date
}): ReleaseDecision {
  if (event.status === 'cancelled') {
    return { release: 'hold', reason: 'event_cancelled', releasableMinor: 0 }
  }
  if (event.hasOpenDispute) {
    return { release: 'hold', reason: 'open_dispute', releasableMinor: 0 }
  }
  if (!event.endsAt) {
    // No end date means we cannot prove the event happened. Previously such an
    // event settled off created_at and was instantly withdrawable.
    return { release: 'hold', reason: 'no_end_date', releasableMinor: 0 }
  }

  const endsAt = new Date(event.endsAt)
  if (Number.isNaN(endsAt.getTime())) {
    return { release: 'hold', reason: 'unparseable_end_date', releasableMinor: 0 }
  }
  if (now < endsAt) {
    return { release: 'hold', reason: 'event_not_over', releasableMinor: 0 }
  }

  const hoursSinceEnd = (now.getTime() - endsAt.getTime()) / 3_600_000
  const requiredHold = holdHoursFor(history)
  if (hoursSinceEnd < requiredHold) {
    return { release: 'hold', reason: `hold_${requiredHold}h`, releasableMinor: 0 }
  }

  const net = Math.max(0, event.grossMinor - event.refundedMinor)
  const withheld = reserveMinor(net)
  const target = Math.max(0, net - withheld)
  const releasableMinor = Math.max(0, Math.min(target, availableMinor))

  if (releasableMinor <= 0) {
    return { release: 'hold', reason: 'nothing_available_yet', releasableMinor: 0 }
  }

  // Signals that want human eyes rather than an automatic transfer. None of
  // these BLOCK the organizer permanently — they route to the admin queue.
  if (event.grossMinor >= REVIEW_ABOVE_GROSS_MINOR && !isEstablished(history)) {
    return { release: 'review', reason: 'large_first_events', releasableMinor }
  }
  if (
    event.manualCheckInRatio !== null &&
    event.manualCheckInRatio >= MANUAL_CHECKIN_REVIEW_RATIO &&
    event.checkedInRatio !== null &&
    event.checkedInRatio > 0
  ) {
    return { release: 'review', reason: 'mostly_manual_checkins', releasableMinor }
  }
  if (event.checkedInRatio !== null && event.checkedInRatio < LOW_ATTENDANCE_REVIEW_RATIO) {
    return { release: 'review', reason: 'very_low_attendance', releasableMinor }
  }

  return { release: 'auto', reason: 'eligible', releasableMinor }
}
