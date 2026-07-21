import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'
import {
  adminSearchIndexDocId,
  buildAdminSearchIndexDoc,
  type AdminSearchIndexType,
} from '@/lib/admin/search-index'

type RebuildType = 'users' | 'events' | 'tickets'

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function decodeCursor(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(json)
    const path = (parsed as any)?.path
    if (typeof path !== 'string' || !path) return null
    return path
  } catch {
    return null
  }
}

function encodeCursor(path: string): string {
  return Buffer.from(JSON.stringify({ path }), 'utf8').toString('base64url')
}

// Resolve docs by document reference (getAll) rather than a
// `where('__name__', 'in', batch)` query: filtering on the documentId requires
// Key values, not bare id strings, so passing plain ids throws
// "__key__ filter value must be a Key". getAll takes plain refs, has no 10-item
// cap, and returns missing docs with `exists === false`.
async function batchGetUsersById(ids: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>()
  if (!ids.length) return out

  const refs = ids.map((id) => adminDb.collection('users').doc(id))
  const docs = await adminDb.getAll(...refs)

  for (const doc of docs) {
    if (!doc.exists) continue
    out.set(doc.id, doc.data())
  }

  return out
}

async function batchGetEventsById(ids: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>()
  if (!ids.length) return out

  const refs = ids.map((id) => adminDb.collection('events').doc(id))
  const docs = await adminDb.getAll(...refs)

  for (const doc of docs) {
    if (!doc.exists) continue
    out.set(doc.id, doc.data())
  }

  return out
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const body = await request.json().catch(() => ({}))
    const type = String((body as any)?.type || 'users') as RebuildType
    if (type !== 'users' && type !== 'events' && type !== 'tickets') {
      return adminError('Invalid type', 400)
    }

    const limit = clampInt((body as any)?.limit, 10, 400, 200)
    const cursorPath = decodeCursor((body as any)?.cursor)

    const indexRef = adminDb.collection('admin_search_index')

    const sourceRef = (() => {
      if (type === 'users') return adminDb.collection('users')
      if (type === 'events') return adminDb.collection('events')
      return adminDb.collection('tickets')
    })()

    let q: any = sourceRef.orderBy('__name__')
    if (cursorPath) {
      q = q.startAfter(adminDb.doc(cursorPath))
    }

    const snap = await q.limit(limit).get()

    const docs = snap.docs
    const done = docs.length < limit
    const last = docs[docs.length - 1]
    const nextCursor = last?.ref?.path ? encodeCursor(String(last.ref.path)) : null

    // Preload related docs for better tokens/subtitles.
    const usersById =
      type === 'events'
        ? await batchGetUsersById(
            Array.from(
              new Set(
                docs
                  .map((d: any) => String(d.data()?.organizer_id || '').trim())
                  .filter(Boolean)
              )
            )
          )
        : new Map<string, any>()

    const eventsById =
      type === 'tickets'
        ? await batchGetEventsById(
            Array.from(
              new Set(
                docs
                  .map((d: any) => String(d.data()?.event_id || '').trim())
                  .filter(Boolean)
              )
            )
          )
        : new Map<string, any>()

    let processed = 0

    // Write index docs in batches (max 500 operations per commit).
    let batch = adminDb.batch()
    let batchOps = 0
    const commits: Promise<any>[] = []

    const flush = async () => {
      if (batchOps === 0) return
      commits.push(batch.commit())
      batch = adminDb.batch()
      batchOps = 0
    }

    for (const doc of docs) {
      const data = doc.data() as any
      let indexType: AdminSearchIndexType
      let title = ''
      let subtitle: string | undefined
      let href = ''
      let metadata: any | undefined
      let tokenSource = ''

      if (type === 'users') {
        indexType = 'user'
        title = data.full_name || data.name || data.email || 'Unknown User'
        subtitle = data.email && (data.full_name || data.name) ? data.email : data.business_name || undefined
        href = `/admin/users/${doc.id}`
        metadata = { status: data.is_verified ? 'verified' : 'unverified' }
        tokenSource = [
          doc.id,
          title,
          subtitle || '',
          data.email || '',
          data.phone_number || '',
          data.business_name || '',
        ].join(' ')
      } else if (type === 'events') {
        indexType = 'event'
        const organizerId = String(data.organizer_id || '').trim()
        const organizer = organizerId ? usersById.get(organizerId) : null
        const organizerName = organizer ? organizer.full_name || organizer.name || organizer.email || '' : ''

        title = data.title || 'Untitled Event'
        subtitle = organizerName ? `by ${organizerName}` : data.city ? `in ${data.city}` : undefined
        href = `/admin/events?selected=${doc.id}`
        metadata = {
          status: data.is_published ? 'published' : 'draft',
          city: data.city,
          price: data.ticket_price,
          currency: data.currency || 'HTG',
        }
        tokenSource = [
          doc.id,
          title,
          data.description || '',
          data.venue_name || '',
          data.city || '',
          data.category || '',
          organizerName,
          organizerId,
        ].join(' ')
      } else {
        // tickets
        indexType = 'order'
        const eventId = String(data.event_id || '').trim()
        const event = eventId ? eventsById.get(eventId) : null
        const eventName = event?.title ? String(event.title) : 'Unknown Event'

        title = `Order ${String(doc.id).substring(0, 8)}...`
        subtitle = `${eventName} • ${data.attendee_name || data.attendee_email || 'Unknown'}`
        href = `/admin/orders?selected=${doc.id}`
        metadata = {
          status: data.status,
          price: data.price,
          currency: data.currency || 'HTG',
        }
        tokenSource = [
          doc.id,
          data.order_id || '',
          eventId,
          eventName,
          data.attendee_name || '',
          data.attendee_email || '',
        ].join(' ')
      }

      const indexDoc = buildAdminSearchIndexDoc({
        type: indexType,
        id: doc.id,
        title,
        subtitle,
        href,
        metadata,
        tokenSource,
      })

      batch.set(indexRef.doc(adminSearchIndexDocId(indexType, doc.id)), indexDoc, { merge: true })
      batchOps += 1
      processed += 1

      if (batchOps >= 450) {
        await flush()
      }
    }

    await flush()
    await Promise.all(commits)

    await logAdminAction({
      action: 'admin.search_index.rebuild',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'admin_search_index',
      details: { type, processed, limit, done },
    })

    return adminOk({ type, processed, limit, done, nextCursor })
  } catch (err) {
    console.error('Search index rebuild failed:', err)
    return adminError(
      'Failed to rebuild search index',
      500,
      err instanceof Error ? err.message : 'Unknown error'
    )
  }
}

export async function GET() {
  const { user, error } = await requireAdmin()
  if (error || !user) {
    return adminError(error || 'Unauthorized', 401)
  }

  return adminOk({
    message:
      'Use POST with JSON body { type: "users"|"events"|"tickets", cursor?: string, limit?: number } to rebuild the admin search index. GET does not run a rebuild.',
  })
}
