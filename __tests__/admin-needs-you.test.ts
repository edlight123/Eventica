import { describe, it, expect } from '@jest/globals'
import { mergeNeedsYou } from '../lib/admin/needs-you'
import type { NeedsYouItem } from '../lib/admin/needs-you'

const item = (id: string, createdAt: string | null): NeedsYouItem => ({
  id,
  queue: 'verifications',
  subject: id,
  decision: 'ID verification',
  href: `/admin/verify#${id}`,
  createdAt,
})

describe('mergeNeedsYou', () => {
  it('sorts oldest first across every queue', () => {
    const merged = mergeNeedsYou([
      [item('b', '2026-08-13T00:00:00.000Z')],
      [item('a', '2026-08-08T00:00:00.000Z'), item('c', '2026-08-14T00:00:00.000Z')],
    ])
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('puts items with no timestamp last rather than first', () => {
    const merged = mergeNeedsYou([[item('x', null), item('y', '2026-08-10T00:00:00.000Z')]])
    expect(merged.map((i) => i.id)).toEqual(['y', 'x'])
  })

  it('drops duplicate ids so one item cannot appear twice', () => {
    const merged = mergeNeedsYou([[item('a', '2026-08-10T00:00:00.000Z')], [item('a', '2026-08-10T00:00:00.000Z')]])
    expect(merged).toHaveLength(1)
  })

  it('returns an empty list when every queue is empty', () => {
    expect(mergeNeedsYou([[], []])).toEqual([])
  })
})
