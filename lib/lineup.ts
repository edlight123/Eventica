/**
 * The event lineup — who is on the bill.
 *
 * Three surfaces share this shape: the composer's editor, the editor sheet, and
 * the public renderer on the event page. They live here rather than in any one
 * of them because the persisted record has already drifted twice (a bare
 * string, then `{ name, role }`), and a single reader is the only thing that
 * keeps an old event from rendering blank.
 */

import { safeExternalUrl } from '@/lib/safeUrl'

export type GuestRole = 'Performer' | 'Host' | 'DJ' | 'Special Guest'

export const GUEST_ROLES: readonly GuestRole[] = ['Performer', 'Host', 'DJ', 'Special Guest']

/** In-editor entry. Every field is present so React inputs stay controlled. */
export interface LineupEntry {
  id: string
  name: string
  role: GuestRole
  photoUrl: string
  link: string
  description: string
  /** Wall-clock 'HH:mm' on the event's own evening — NOT an instant. */
  startTime: string
  endTime: string
}

/** The persisted record: snake_case, nulls rather than empty strings. */
export interface LineupRecord {
  name: string
  role: GuestRole
  photo_url: string | null
  link: string | null
  description: string | null
  start_time: string | null
  end_time: string | null
}

const makeId = () => Math.random().toString(36).slice(2, 9)

export const emptyLineupEntry = (): LineupEntry => ({
  id: makeId(),
  name: '',
  role: 'Performer',
  photoUrl: '',
  link: '',
  description: '',
  startTime: '',
  endTime: '',
})

/**
 * Read one persisted entry, tolerating every shape this field has ever had.
 * Both the edit path and the guest-draft restore go through this, so a field
 * added to the writer is picked up by both at once.
 */
export const lineupEntryFromRecord = (g: any): LineupEntry => ({
  ...emptyLineupEntry(),
  name: typeof g === 'string' ? g : g?.name || '',
  role: (g?.role as GuestRole) || 'Performer',
  photoUrl: g?.photo_url || g?.photoUrl || '',
  link: g?.link || '',
  description: g?.description || '',
  startTime: g?.start_time || g?.startTime || '',
  endTime: g?.end_time || g?.endTime || '',
})

/** The save shape. Anything omitted here is erased on the next save. */
export const lineupEntryToRecord = (g: LineupEntry): LineupRecord => ({
  name: g.name,
  role: g.role,
  photo_url: g.photoUrl || null,
  link: g.link.trim() || null,
  description: g.description.trim() || null,
  start_time: g.startTime || null,
  end_time: g.endTime || null,
})

/**
 * Normalize a link an organizer typed into something a browser will follow.
 * Returns null for anything that isn't plainly http(s) — a lineup link is
 * rendered as an anchor, so `javascript:` and friends must never survive.
 */
// Delegates now: the promo video needed the same rule, and two copies of a
// security check drift apart. See lib/safeUrl.
export function safeLineupLink(raw: string | null | undefined): string | null {
  return safeExternalUrl(raw)
}

/** How a link reads when shown as text: host plus path, no scheme or www. */
export function lineupLinkLabel(href: string): string {
  try {
    const u = new URL(href)
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
    return `${u.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return href
  }
}

/** 'HH:mm'–'HH:mm', either bound optional, empty when neither is set. */
export function lineupTimeRange(start: string | null, end: string | null): string {
  const s = (start || '').trim()
  const e = (end || '').trim()
  if (s && e) return `${s} – ${e}`
  return s || e || ''
}
