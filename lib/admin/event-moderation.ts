/**
 * Pure helpers for the admin Events Moderation console.
 *
 * The moderation tab a user sees (Pending / Published / Reported / Unpublished)
 * is derived from each event's `is_published`, `rejected`, and `reports_count`
 * fields. Keeping the derivation pure makes the moderation workflow testable and
 * keeps the console component thin.
 */

export type EventModerationTab = 'pending' | 'published' | 'reported' | 'unpublished'

export interface ModerationEvent {
  is_published?: boolean
  rejected?: boolean
  reports_count?: number
}

/** Whether an event belongs in a given moderation tab. */
export function eventMatchesTab(event: ModerationEvent, tab: EventModerationTab): boolean {
  switch (tab) {
    case 'pending':
      return !event.is_published && !event.rejected
    case 'published':
      return !!event.is_published
    case 'reported':
      return (event.reports_count ?? 0) > 0
    case 'unpublished':
      return !event.is_published && !!event.rejected
    default:
      return true
  }
}

/** Filter a list of events to the rows shown in a moderation tab. */
export function filterEventsByTab<T extends ModerationEvent>(events: T[], tab: EventModerationTab): T[] {
  return events.filter((e) => eventMatchesTab(e, tab))
}

/** Count how many events fall into each moderation tab (for the tab badges). */
export function getEventTabCounts<T extends ModerationEvent>(
  events: T[],
): Record<EventModerationTab, number> {
  return {
    pending: filterEventsByTab(events, 'pending').length,
    published: filterEventsByTab(events, 'published').length,
    reported: filterEventsByTab(events, 'reported').length,
    unpublished: filterEventsByTab(events, 'unpublished').length,
  }
}
