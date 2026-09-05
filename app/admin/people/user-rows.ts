/**
 * Shared server-side shaping for the People hub's two lists.
 *
 * Both `/admin/people` and `/admin/people/organizers` page the same `users`
 * collection through `getAdminUsers`, so the cursor encoding and the row shape
 * live here rather than being copied into each page — the two lists disagreeing
 * about what a row is would be the first thing to rot.
 *
 * Server-only: `encodeCursor` uses Buffer, and this is imported from server
 * components exclusively.
 */

type Cursor = { id: string; createdAtMillis: number }

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

/**
 * Cursor for the next page, or null when there is no honest one.
 *
 * `created_at` arrives as a Firestore Timestamp, a Date or an ISO string
 * depending on how the doc was written — this codebase has no single shape for
 * it — so all three are read before giving up. A row whose created_at cannot be
 * resolved to a number yields no cursor at all, which stops the list rather
 * than paging from a bogus position.
 */
export function cursorFromLastDoc(result: { hasMore: boolean; lastDoc: any }): string | null {
  if (!result.hasMore || !result.lastDoc) return null
  const lastData: any = result.lastDoc.data?.() || {}
  const createdAt: any = lastData?.created_at
  const createdAtMillis =
    typeof createdAt?.toMillis === 'function'
      ? createdAt.toMillis()
      : typeof createdAt?.toDate === 'function'
        ? createdAt.toDate().getTime()
        : typeof createdAt === 'string'
          ? Date.parse(createdAt)
          : Number.NaN
  if (!Number.isFinite(createdAtMillis)) return null
  return encodeCursor({ id: result.lastDoc.id, createdAtMillis })
}

/** The serializable row both list clients render. */
export function mapUser(u: any) {
  return {
    id: u.id || '',
    email: u.email || '',
    full_name: u.full_name || u.name || '',
    role: u.role || 'attendee',
    is_verified: Boolean(u.is_verified),
    verification_status: u.verification_status || 'none',
    is_organizer: Boolean(u.is_organizer),
    created_at:
      typeof u.created_at === 'string' ? u.created_at : u.created_at?.toISOString?.() || new Date().toISOString(),
  }
}
