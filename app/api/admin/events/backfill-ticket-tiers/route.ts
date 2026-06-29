import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'

type BackfillRequest = {
  batchTag: string
  dryRun?: boolean
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = (await request.json().catch(() => ({}))) as Partial<BackfillRequest>
    const batchTag = String(body?.batchTag || '').trim()
    const dryRun = body?.dryRun === true

    if (!batchTag) {
      return adminError('batchTag is required (used to find seeded events via tags array)', 400)
    }

    const eventsSnap = await adminDb
      .collection('events')
      .where('tags', 'array-contains', batchTag)
      .get()

    let scanned = 0
    let created = 0
    let skipped = 0
    const details: Array<{ eventId: string; title?: string; tierId: string; action: 'created' | 'skipped'; reason?: string }> = []

    for (const doc of eventsSnap.docs) {
      scanned += 1
      const event = doc.data() as any
      const eventId = String(event?.id || doc.id)
      const title = event?.title ? String(event.title) : undefined

      const tierId = `seed_${eventId}_ga`
      const tierRef = adminDb.collection('ticket_tiers').doc(tierId)
      const existingTier = await tierRef.get()
      if (existingTier.exists) {
        skipped += 1
        details.push({ eventId, title, tierId, action: 'skipped', reason: 'tier already exists' })
        continue
      }

      const price = toFiniteNumber(event?.ticket_price, 0)
      const totalQty = toFiniteNumber(event?.total_tickets, 0)

      const tierData = {
        id: tierId,
        event_id: eventId,
        name: 'General Admission',
        description: null,
        price,
        total_quantity: totalQty,
        sold_quantity: 0,
        sales_start: null,
        sales_end: null,
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (!dryRun) {
        await tierRef.set(tierData)
      }

      created += 1
      details.push({ eventId, title, tierId, action: 'created' })
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'ticket_tiers',
      details: { name: 'events.backfill-ticket-tiers', batchTag, dryRun, scanned, created, skipped },
    })

    return adminOk({
      batchTag,
      dryRun,
      scanned,
      created,
      skipped,
      details,
      tip: 'Run this with the batchTag you used when seeding (e.g. qa_dec23) to repair existing seeded events that were created before tiers were added.'
    })
  } catch (err: any) {
    console.error('Backfill ticket tiers error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}

export async function GET() {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    return adminOk({
      email: user.email || null,
      usage: {
        method: 'POST',
        url: '/api/admin/events/backfill-ticket-tiers',
        body: {
          batchTag: 'qa_dec23',
          dryRun: true,
        },
      },
      notes: [
        'This repairs seeded events that were created before default ticket tiers were added.',
        'It creates a deterministic tier id: seed_<eventId>_ga (General Admission).',
      ],
    })
  } catch (err: any) {
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
