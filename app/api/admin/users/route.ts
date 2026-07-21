import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Cursor = { id: string; createdAtMillis: number }

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as any
    const id = typeof parsed?.id === 'string' ? parsed.id : null
    const createdAtMillis = Number(parsed?.createdAtMillis)
    if (!id || !Number.isFinite(createdAtMillis)) return null
    return { id, createdAtMillis }
  } catch {
    return null
  }
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

/**
 * Paginated list of ALL users (no role filter), newest first.
 * Mirrors /api/admin/organizers so the People hub "All users" tab can browse
 * beyond the initial server-rendered page via cursor + loadMore.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageSize = clampInt(searchParams.get('limit'), 10, 400, 200)

    const rawCursor = searchParams.get('cursor')
    const decoded = decodeCursor(rawCursor)
    const cursorId = decoded?.id || (rawCursor && rawCursor.trim().length ? rawCursor.trim() : null)

    let q: FirebaseFirestore.Query = adminDb
      .collection('users')
      .orderBy('created_at', 'desc')
      .limit(pageSize + 1)

    if (cursorId) {
      const cursorSnap = await adminDb.collection('users').doc(cursorId).get()
      if (cursorSnap.exists) {
        q = q.startAfter(cursorSnap)
      }
    }

    const snap = await q.get()
    const hasMore = snap.docs.length > pageSize
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs

    const users = docs.map((doc) => {
      const data: any = doc.data()
      return {
        id: doc.id,
        email: data.email || '',
        full_name: data.full_name || data.name || '',
        phone_number: data.phone_number || '',
        role: data.role || 'attendee',
        is_verified: Boolean(data.is_verified),
        verification_status: data.verification_status || 'none',
        is_organizer: Boolean(data.is_organizer),
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || null,
      }
    })

    let nextCursor: string | null = null
    if (hasMore && docs.length) {
      const lastDoc = docs[docs.length - 1]
      const lastData: any = lastDoc.data() || {}
      const createdAt: any = lastData?.created_at
      const createdAtMillis =
        typeof createdAt?.toMillis === 'function'
          ? createdAt.toMillis()
          : typeof createdAt?.toDate === 'function'
            ? createdAt.toDate().getTime()
            : typeof createdAt === 'string'
              ? Date.parse(createdAt)
              : Number.NaN

      if (Number.isFinite(createdAtMillis)) {
        nextCursor = encodeCursor({ id: lastDoc.id, createdAtMillis })
      }
    }

    return NextResponse.json({ users, hasMore: hasMore && Boolean(nextCursor), nextCursor })
  } catch (err) {
    console.error('Admin users pagination error:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
