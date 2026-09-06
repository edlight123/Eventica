/**
 * When an event counts as "filling fast", and when an organizer has hit a
 * milestone worth interrupting them for.
 *
 * Pure arithmetic, kept clear of firebase-admin so the thresholds — the part
 * that decides whether a claim of urgency is honest — can be unit-tested.
 */

/**
 * The share of tickets left below which an event counts as "filling fast".
 *
 * Deliberately strict, and paired with a floor on how many tickets the event
 * ever had. Announcing urgency for a 20-ticket event with 4 left is noise;
 * claiming urgency that is not real is how a channel stops being believed.
 */
export const FILLING_FAST_REMAINING_RATIO = 0.15
export const FILLING_FAST_MIN_CAPACITY = 25

export function isFillingFast(totalTickets: number, ticketsSold: number): boolean {
  if (!Number.isFinite(totalTickets) || !Number.isFinite(ticketsSold)) return false
  if (totalTickets < FILLING_FAST_MIN_CAPACITY) return false
  const remaining = totalTickets - ticketsSold
  if (remaining <= 0) return false // sold out is a different message
  return remaining / totalTickets <= FILLING_FAST_REMAINING_RATIO
}


/** Sales milestones an organizer actually wants to hear about. */
export const ORGANIZER_MILESTONES = [0.5, 0.75, 1] as const

export function milestoneReached(
  totalTickets: number,
  ticketsSold: number
): number | null {
  if (!totalTickets || totalTickets <= 0) return null
  const ratio = ticketsSold / totalTickets
  // Highest crossed threshold, so a burst of sales reports "sold out" rather
  // than walking the organizer through 50% and 75% on the way past.
  let reached: number | null = null
  for (const m of ORGANIZER_MILESTONES) {
    if (ratio >= m) reached = m
  }
  return reached
}

