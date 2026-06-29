import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(String(value))
  return Number.isFinite(d.getTime()) ? d : null
}

type LegacyEventRow = {
  id: string
  organizer_id: string
  title: string
  description: string
  category: string
  venue_name: string
  country: string
  city: string
  commune: string
  address?: string
  venue_address?: string
  start_datetime: string
  end_datetime: string
  banner_image_url?: string | null
  banner_image?: string | null
  ticket_price?: number
  price?: number
  currency?: string
  total_tickets?: number
  max_attendees?: number
  tickets_sold?: number
  is_published?: boolean
  status?: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

  if (!url || !serviceRoleKey) return null
  return { url, serviceRoleKey }
}

async function fetchLegacyEventsFromSupabase(params: {
  limit: number
  since: string | null
}): Promise<LegacyEventRow[]> {
  const cfg = getSupabaseConfig()
  if (!cfg) {
    throw new Error(
      'Supabase is not configured (missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).'
    )
  }

  const baseUrl = cfg.url.replace(/\/+$/, '')
  const filters: string[] = []
  filters.push('select=*')
  filters.push('order=updated_at.desc')
  filters.push(`limit=${params.limit}`)
  if (params.since) {
    // PostgREST filter syntax
    filters.push(`updated_at=gte.${encodeURIComponent(params.since)}`)
  }

  const url = `${baseUrl}/rest/v1/events?${filters.join('&')}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Supabase events fetch failed (${res.status}): ${text || res.statusText}`)
  }

  const data = (await res.json().catch(() => null)) as unknown
  return Array.isArray(data) ? (data as LegacyEventRow[]) : []
}

/**
 * Restore Firestore events from the legacy Supabase `events` table.
 *
 * Why this exists:
 * - `/api/admin/events/*` operates on Firestore `events`.
 * - The admin moderation UI's "delete" action performs a hard Firestore `.delete()`.
 * - Many deployments still have the event rows in Supabase, so we can rehydrate Firestore.
 *
 * POST body:
 * - limit?: number (default 500, max 2000)
 * - since?: string (ISO timestamp; only rows with updated_at >= since)
 * - onlyMissing?: boolean (default true) – skip events that still exist in Firestore
 * - dryRun?: boolean (default false)
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = await req.json().catch(() => ({}))
    const limit = clampInt(body?.limit, 1, 2000, 500)
    const since = typeof body?.since === 'string' ? body.since : null
    const onlyMissing = body?.onlyMissing !== false
    const dryRun = Boolean(body?.dryRun)

    const cfg = getSupabaseConfig()
    if (!cfg) {
      return adminError(
        'Supabase not configured',
        412,
        'Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY to restore from the legacy SQL events table. If you do not have Supabase anymore, restoration requires a Firestore backup/export.'
      )
    }

    const rows = await fetchLegacyEventsFromSupabase({ limit, since })

    let processed = 0
    let restored = 0
    let skippedExisting = 0
    const failures: Array<{ id: string; error: string }> = []

    for (const row of rows) {
      processed++
      const eventId = String(row?.id || '').trim()
      if (!eventId) continue

      const eventRef = adminDb.collection('events').doc(eventId)

      if (onlyMissing) {
        const existing = await eventRef.get()
        if (existing.exists) {
          skippedExisting++
          continue
        }
      }

      const createdAt = toDateOrNull(row.created_at)
      const updatedAt = toDateOrNull(row.updated_at)
      const startAt = toDateOrNull(row.start_datetime)
      const endAt = toDateOrNull(row.end_datetime)

      const address = row.address || row.venue_address || ''
      const bannerUrl = row.banner_image_url || row.banner_image || null
      const ticketPrice =
        typeof row.ticket_price === 'number'
          ? row.ticket_price
          : typeof row.price === 'number'
            ? row.price
            : 0
      const maxAttendees =
        typeof row.max_attendees === 'number'
          ? row.max_attendees
          : typeof row.total_tickets === 'number'
            ? row.total_tickets
            : 0
      const isPublished =
        typeof row.is_published === 'boolean'
          ? row.is_published
          : typeof row.status === 'string'
            ? row.status === 'published'
            : false

      // Write both snake_case and camelCase date fields to tolerate mixed readers.
      const doc: Record<string, any> = {
        organizer_id: row.organizer_id,
        organizerId: row.organizer_id,

        title: row.title,
        description: row.description,
        category: row.category,

        venue_name: row.venue_name,
        venueName: row.venue_name,

        country: row.country,
        city: row.city,
        commune: row.commune,

        address,
        venue_address: address,
        venueAddress: address,

        start_datetime: startAt || row.start_datetime,
        startDateTime: startAt || row.start_datetime,

        end_datetime: endAt || row.end_datetime,
        endDateTime: endAt || row.end_datetime,

        banner_image_url: bannerUrl,
        banner_image: bannerUrl,

        ticket_price: ticketPrice,
        currency: row.currency || 'HTG',

        total_tickets: maxAttendees,
        max_attendees: maxAttendees,

        tickets_sold: typeof row.tickets_sold === 'number' ? row.tickets_sold : 0,
        is_published: isPublished,

        tags: row.tags || null,

        created_at: createdAt || row.created_at,
        createdAt: createdAt || row.created_at,

        updated_at: updatedAt || row.updated_at,
        updatedAt: updatedAt || row.updated_at,

        // Admin moderation expects these fields to exist sometimes.
        rejected: false,
      }

      try {
        if (!dryRun) {
          await eventRef.set(doc, { merge: true })
        }
        restored++
      } catch (err: any) {
        failures.push({ id: eventId, error: err?.message || String(err) })
      }
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'events',
      details: { name: 'events.restore-from-legacy', dryRun, onlyMissing, limit, since, processed, restored, skippedExisting, failures: failures.length },
    })

    return adminOk({
      dryRun,
      onlyMissing,
      processed,
      restored,
      skippedExisting,
      failures,
    })
  } catch (err: any) {
    console.error('restore-from-legacy error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
