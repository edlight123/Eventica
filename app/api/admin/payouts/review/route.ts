import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The payout review queue, read side.
 *
 * /api/cron/release-payouts writes one `payout_review_queue/{eventId}` doc every
 * time its rules say "a human should look at this" — and a doc sitting at
 * `pending` also BLOCKS the automatic release for that event. Nothing read these
 * docs before this route existed, so a flagged payout stayed flagged forever.
 *
 * GET lists everything still pending plus the recently resolved rows, so an
 * admin can see what a colleague already actioned. POST on
 * /api/admin/payouts/review/[eventId] resolves one.
 */

/** Pending rows fetched in one go — the queue is one doc per event, never large. */
const MAX_PENDING = 200
/** Recently-resolved rows shown for context. */
const MAX_RESOLVED = 25
/** Docs scanned when looking for the recently-resolved tail. */
const RESOLVED_SCAN = 100

export type ReviewQueueItem = {
  eventId: string
  organizerId: string
  amountMinor: number
  currency: string | null
  reason: string
  tier: string | null
  status: string
  createdAt: string | null
  updatedAt: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolvedByEmail: string | null
  note: string | null
  eventTitle: string | null
  organizerName: string | null
  organizerEmail: string | null
}

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value?.toDate) {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString()
  return null
}

function toMinor(value: unknown): number {
  const n = Number(value || 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function baseItem(doc: any): ReviewQueueItem {
  const data = (doc.data() || {}) as any
  return {
    eventId: String(data.eventId || doc.id),
    organizerId: String(data.organizerId || ''),
    amountMinor: Math.max(0, toMinor(data.amountMinor)),
    currency: data.currency ? String(data.currency).toUpperCase() : null,
    reason: String(data.reason || 'unknown'),
    tier: data.tier ? String(data.tier) : null,
    status: String(data.status || 'pending'),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    resolvedAt: toIso(data.resolvedAt),
    resolvedBy: data.resolvedBy ? String(data.resolvedBy) : null,
    resolvedByEmail: data.resolvedByEmail ? String(data.resolvedByEmail) : null,
    note: data.note ? String(data.note) : null,
    eventTitle: null,
    organizerName: null,
    organizerEmail: null,
  }
}

/**
 * Attach the human-readable names. A queue row that names only two Firestore ids
 * is unactionable — an admin cannot decide about "event a7Kd…" without knowing
 * whose show it was. Lookups are deduplicated and never fail the request.
 */
async function decorate(items: ReviewQueueItem[]): Promise<void> {
  const eventIds = Array.from(new Set(items.map((i) => i.eventId).filter(Boolean)))
  const organizerIds = Array.from(new Set(items.map((i) => i.organizerId).filter(Boolean)))

  const [events, organizers] = await Promise.all([
    Promise.all(
      eventIds.map(async (id) => {
        const snap = await adminDb.collection('events').doc(id).get().catch(() => null)
        return [id, snap?.exists ? String((snap.data() as any)?.title || '') : ''] as const
      })
    ),
    Promise.all(
      organizerIds.map(async (id) => {
        const snap = await adminDb.collection('users').doc(id).get().catch(() => null)
        const data = snap?.exists ? ((snap.data() as any) || {}) : {}
        return [id, { name: String(data.full_name || ''), email: String(data.email || '') }] as const
      })
    ),
  ])

  const eventTitles = new Map(events)
  const organizerInfo = new Map(organizers)

  for (const item of items) {
    item.eventTitle = eventTitles.get(item.eventId) || null
    const organizer = organizerInfo.get(item.organizerId)
    item.organizerName = organizer?.name || null
    item.organizerEmail = organizer?.email || null
  }
}

export async function GET() {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) return adminError('Unauthorized', 401)

    // Two single-field queries so no composite index is needed: an equality for
    // the pending set, and a plain recency scan for the resolved tail.
    const [pendingSnap, recentSnap] = await Promise.all([
      adminDb.collection('payout_review_queue').where('status', '==', 'pending').limit(MAX_PENDING).get(),
      adminDb
        .collection('payout_review_queue')
        .orderBy('updatedAt', 'desc')
        .limit(RESOLVED_SCAN)
        .get()
        .catch(() => null),
    ])

    const pending: ReviewQueueItem[] = (pendingSnap.docs as any[]).map(baseItem)
    // Oldest first — the organizer who has been waiting longest is decided first.
    pending.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))

    const recentItems: ReviewQueueItem[] = ((recentSnap?.docs || []) as any[]).map(baseItem)
    const resolved = recentItems.filter((item) => item.status !== 'pending').slice(0, MAX_RESOLVED)

    await decorate([...pending, ...resolved])

    // Money is never summed across currencies — that would be arithmetic fiction.
    const pendingByCurrency: Record<string, number> = {}
    for (const item of pending) {
      const key = item.currency || 'UNKNOWN'
      pendingByCurrency[key] = (pendingByCurrency[key] || 0) + item.amountMinor
    }

    return adminOk({
      pending,
      resolved,
      counts: { pending: pending.length, resolved: resolved.length },
      pendingByCurrency,
    })
  } catch (error: any) {
    console.error('Error loading payout review queue:', error)
    return NextResponse.json(
      { ok: false, success: false, error: 'Failed to load payout review queue' },
      { status: 500 }
    )
  }
}
