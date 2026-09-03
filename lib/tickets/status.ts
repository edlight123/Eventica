/**
 * The ticket `status` vocabulary — one definition, because there are three
 * values in circulation and disagreeing readers were losing organizers money.
 *
 * A live (paid, un-refunded, admits-the-holder) ticket is written as ANY of
 * `valid`, `confirmed` or `active`, depending on which rail sold it:
 *
 *   - the Stripe paths write        `valid`
 *   - the MonCash callback mirrors  `confirmed`
 *   - lib/tickets/fulfillment.ts    `confirmed`   (SogePay, free claims)
 *
 * Readers then diverged. Most accept two or three of them
 * (admin orders, revenue analytics, wallet access, event cancellation), but
 * `lib/firestore/payout.ts` — the engine that decides what an organizer may
 * WITHDRAW — filtered on `valid` alone. Every MonCash and SogePay sale was
 * therefore invisible to the payout balance: real money, permanently
 * unwithdrawable, on the primary rails of the primary market.
 *
 * Anything deciding "does this ticket count" should import from here rather
 * than re-listing the strings, so the next reader cannot pick a subset.
 *
 * Kept to three values so it stays inside Firestore's ten-value `in` limit.
 */
export const LIVE_TICKET_STATUSES = ['valid', 'confirmed', 'active'] as const

export type LiveTicketStatus = (typeof LIVE_TICKET_STATUSES)[number]

/** Mutable copy, for Firestore `where(..., 'in', ...)` which rejects readonly. */
export const liveTicketStatusesForQuery = (): string[] => [...LIVE_TICKET_STATUSES]

/**
 * Is this status a live ticket? An EMPTY/absent status counts as live: some
 * older docs were written without one, and treating those as dead would hide
 * paid tickets the same way the payout filter did.
 */
export function isLiveTicketStatus(status: unknown): boolean {
  const s = String(status ?? '').toLowerCase().trim()
  if (!s) return true
  return (LIVE_TICKET_STATUSES as readonly string[]).includes(s)
}
