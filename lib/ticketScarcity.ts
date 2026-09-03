/**
 * What, if anything, to say about how many tickets are left.
 *
 * The checkout used to print the raw count — "100 available" — on every tier.
 * That is the opposite of urgency: a big number tells a buyer to come back
 * later, and a small one is the only case where the exact figure helps. So the
 * count is now shown ONLY when it is genuinely small, a proportion drives the
 * qualitative claim, and an event with plenty of room says nothing at all.
 *
 * Every rung has to be TRUE, which is what shapes the ladder:
 *
 *  - `lastFew` prints an exact number, so it only fires at or under 10. "Only
 *    200 left" is not urgency, it is an advert for how big the room is — and
 *    20% of 1,000 tickets is 200.
 *  - `almostGone` makes the proportional claim (the owner's 20%) without a
 *    number, because at 20% of a large event "almost sold out" is defensible
 *    while a figure would undercut it.
 *  - `sellingFast` is a claim about PACE, so it needs evidence of pace. The
 *    honest signal available without a reliable sales-start timestamp — see
 *    the note below — is how much is gone relative to how far off the event
 *    still is: half the room sold with a week or more left to sell is fast by
 *    any reading. It deliberately does not fire in the last week, when a high
 *    sold fraction is normal rather than notable.
 *
 * On why pace is measured this way: a proper velocity calculation wants the
 * moment selling opened, and `sales_start` is null on most tiers (the composer
 * only sets it when an organizer opts into a schedule). Substituting the
 * event's creation date is not an option either — this codebase has no single
 * created-at field name, and reading the wrong one silently yields nonsense.
 * So the rule uses only two values that are always present and always mean
 * what they say: the sold fraction, and the days until the doors open.
 */

/** Exact counts are only honest — and only urgent — at or below this. */
export const LAST_FEW = 10
/** The owner's threshold: under a fifth of the room left. */
export const ALMOST_GONE_FRACTION = 0.2
/** Half the room gone… */
export const SELLING_FAST_SOLD_FRACTION = 0.5
/** …with at least this long still to sell. */
export const SELLING_FAST_MIN_DAYS = 7

/**
 * The composer writes this as "unlimited". An event with no ceiling can never
 * be scarce, and treating 1,000,000 as a real capacity would make every such
 * event read as 100% available forever.
 */
export const UNLIMITED_QTY = 1_000_000

export type ScarcityLevel = 'soldOut' | 'lastFew' | 'almostGone' | 'sellingFast' | 'none'

export interface Scarcity {
  level: ScarcityLevel
  /** Only set for `lastFew`, the one rung that may name a number. */
  remaining?: number
}

export function ticketScarcity({
  total,
  sold,
  startsAt,
  now = new Date(),
}: {
  /** Capacity. Missing, 0 or >= UNLIMITED_QTY all mean "no ceiling". */
  total?: number | null
  sold?: number | null
  /** Event start, for the pace rule. Omit and `sellingFast` simply won't fire. */
  startsAt?: string | Date | null
  now?: Date
}): Scarcity {
  const cap = Number(total ?? 0)
  const gone = Math.max(0, Number(sold ?? 0))

  // No real ceiling: nothing truthful to say about scarcity.
  if (!Number.isFinite(cap) || cap <= 0 || cap >= UNLIMITED_QTY) return { level: 'none' }

  const remaining = Math.max(0, cap - gone)
  if (remaining === 0) return { level: 'soldOut' }
  if (remaining <= LAST_FEW) return { level: 'lastFew', remaining }

  const soldFraction = gone / cap
  if (remaining / cap <= ALMOST_GONE_FRACTION) return { level: 'almostGone' }

  if (startsAt && soldFraction >= SELLING_FAST_SOLD_FRACTION) {
    const start = startsAt instanceof Date ? startsAt : new Date(startsAt)
    if (!Number.isNaN(start.getTime())) {
      const days = (start.getTime() - now.getTime()) / 86_400_000
      if (days >= SELLING_FAST_MIN_DAYS) return { level: 'sellingFast' }
    }
  }

  return { level: 'none' }
}

/**
 * The i18n key and interpolation for a level, so every surface says the same
 * thing. `none` returns null — the caller renders nothing, which is the point.
 */
export function scarcityCopy(
  s: Scarcity
): { key: string; defaultValue: string; count?: number } | null {
  switch (s.level) {
    case 'soldOut':
      return { key: 'ticket.sold_out', defaultValue: 'Sold out' }
    case 'lastFew':
      return { key: 'ticket.only_x_left', defaultValue: 'Only {{count}} left', count: s.remaining }
    case 'almostGone':
      return { key: 'ticket.almost_sold_out', defaultValue: 'Almost sold out' }
    case 'sellingFast':
      return { key: 'ticket.selling_fast', defaultValue: 'Selling fast' }
    default:
      return null
  }
}

/** Sold out reads as a dead end; the rest are urgency. Drives the colour. */
export const isUrgent = (s: Scarcity) =>
  s.level === 'lastFew' || s.level === 'almostGone' || s.level === 'sellingFast'
