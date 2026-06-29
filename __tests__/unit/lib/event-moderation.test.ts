import {
  eventMatchesTab,
  filterEventsByTab,
  getEventTabCounts,
  type ModerationEvent,
} from '@/lib/admin/event-moderation'

const events: (ModerationEvent & { id: string })[] = [
  { id: 'pub', is_published: true, rejected: false, reports_count: 0 },
  { id: 'pub-reported', is_published: true, rejected: false, reports_count: 3 },
  { id: 'pending', is_published: false, rejected: false },
  { id: 'rejected', is_published: false, rejected: true },
  { id: 'pending-reported', is_published: false, rejected: false, reports_count: 2 },
]

describe('eventMatchesTab', () => {
  it('pending = not published and not rejected', () => {
    expect(eventMatchesTab({ is_published: false, rejected: false }, 'pending')).toBe(true)
    expect(eventMatchesTab({ is_published: true }, 'pending')).toBe(false)
    expect(eventMatchesTab({ is_published: false, rejected: true }, 'pending')).toBe(false)
  })

  it('published = is_published', () => {
    expect(eventMatchesTab({ is_published: true }, 'published')).toBe(true)
    expect(eventMatchesTab({ is_published: false }, 'published')).toBe(false)
  })

  it('reported = reports_count > 0 (regardless of publish state)', () => {
    expect(eventMatchesTab({ reports_count: 1 }, 'reported')).toBe(true)
    expect(eventMatchesTab({ reports_count: 0 }, 'reported')).toBe(false)
    expect(eventMatchesTab({}, 'reported')).toBe(false)
  })

  it('unpublished = not published and rejected', () => {
    expect(eventMatchesTab({ is_published: false, rejected: true }, 'unpublished')).toBe(true)
    expect(eventMatchesTab({ is_published: false, rejected: false }, 'unpublished')).toBe(false)
  })
})

describe('filterEventsByTab', () => {
  it('filters to the rows for each tab', () => {
    expect(filterEventsByTab(events, 'pending').map((e) => e.id)).toEqual(['pending', 'pending-reported'])
    expect(filterEventsByTab(events, 'published').map((e) => e.id)).toEqual(['pub', 'pub-reported'])
    expect(filterEventsByTab(events, 'reported').map((e) => e.id)).toEqual(['pub-reported', 'pending-reported'])
    expect(filterEventsByTab(events, 'unpublished').map((e) => e.id)).toEqual(['rejected'])
  })
})

describe('getEventTabCounts', () => {
  it('counts each tab', () => {
    expect(getEventTabCounts(events)).toEqual({
      pending: 2,
      published: 2,
      reported: 2,
      unpublished: 1,
    })
  })

  it('handles an empty list', () => {
    expect(getEventTabCounts([])).toEqual({ pending: 0, published: 0, reported: 0, unpublished: 0 })
  })
})
