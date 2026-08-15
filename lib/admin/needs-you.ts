/**
 * The landing list: every queue merged into one oldest-first list, so the answer
 * to "what do I do now" is the top row. Deliberately not a dashboard — totals
 * moved to /admin/analytics, where a chart means something.
 */

import type { QueueKey } from '@/lib/admin/queue-keys'

export interface NeedsYouItem {
  id: string
  queue: QueueKey
  /** Who or what the decision is about. */
  subject: string
  /** The decision needed, in the admin's words: "ID verification", "payout review". */
  decision: string
  href: string
  createdAt: string | null
}

/**
 * Oldest first. Items without a timestamp sort last: an unknown age is not
 * evidence of urgency, and floating them to the top would bury real backlog.
 */
export function mergeNeedsYou(groups: NeedsYouItem[][]): NeedsYouItem[] {
  const seen = new Set<string>()
  const merged: NeedsYouItem[] = []

  for (const group of groups) {
    for (const item of group) {
      const key = `${item.queue}:${item.id}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
    }
  }

  return merged.sort((a, b) => {
    if (!a.createdAt && !b.createdAt) return 0
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return a.createdAt.localeCompare(b.createdAt)
  })
}
