import { NextRequest, NextResponse } from 'next/server'
import { FieldPath } from 'firebase-admin/firestore'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { resolveEventCountry } from '@/lib/event-country'
import { normalizeCountryCode } from '@/lib/payment-provider'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'

type BackfillRequest = {
  dryRun?: boolean
  // If true, only backfill events that are publicly visible.
  // We treat either `is_published === true` OR `status === 'published'` as published.
  onlyPublished?: boolean
  // Max number of documents to scan in this call.
  limit?: number
  // Pagination cursor: last processed event id (document id).
  startAfterId?: string
}

export async function GET() {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    return adminOk({
      message:
        'Use POST to run the backfill. Start with dryRun=true. For pagination, pass startAfterId from the previous response.',
      usage: {
        method: 'POST',
        url: '/api/admin/events/backfill-country',
        bodyExamples: [
          { dryRun: true, onlyPublished: true, limit: 500 },
          { dryRun: false, onlyPublished: true, limit: 500 },
          { dryRun: true, onlyPublished: false, limit: 500, startAfterId: 'lastDocIdFromPreviousRun' },
        ],
      },
    })
  } catch (err: any) {
    console.error('Backfill country GET error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = (await request.json().catch(() => ({}))) as BackfillRequest

    const dryRun = Boolean(body?.dryRun)
    const onlyPublished = Boolean(body?.onlyPublished)
    const limit = Math.min(Math.max(Number(body?.limit || 500), 1), 5000)
    const startAfterId = String(body?.startAfterId || '').trim()

    const pageSize = Math.min(limit, 500)

    let query = adminDb
      .collection('events')
      .orderBy(FieldPath.documentId())
      .limit(pageSize)

    if (startAfterId) {
      query = query.startAfter(startAfterId)
    }

    const snapshot = await query.get()

    let scanned = 0
    let updated = 0
    let skipped = 0
    let unable = 0

    const unableItems: Array<{ id: string; title?: string; organizer_id?: string }> = []

    const examples: Array<{
      id: string
      oldCountry: string
      newCountry: string
      title?: string
      dryRun: boolean
    }> = []

    const batch = adminDb.batch()
    let batchOps = 0

    for (const doc of snapshot.docs) {
      scanned += 1
      const data: any = doc.data() || {}

      if (onlyPublished) {
        const isPublic = Boolean(data.is_published || data.status === 'published')
        if (!isPublic) {
          skipped += 1
          continue
        }
      }

      const existingCountry = normalizeCountryCode(data.country)
      if (existingCountry) {
        skipped += 1
        continue
      }

      const resolvedCountry = await resolveEventCountry({ ...data, id: doc.id })

      if (!resolvedCountry) {
        unable += 1
        if (unableItems.length < 100) {
          unableItems.push({ id: doc.id, title: data.title, organizer_id: data.organizer_id })
        }
        continue
      }

      updated += 1

      if (examples.length < 25) {
        examples.push({
          id: doc.id,
          oldCountry: existingCountry,
          newCountry: resolvedCountry,
          title: data.title,
          dryRun,
        })
      }

      if (!dryRun) {
        batch.update(doc.ref, {
          country: resolvedCountry,
          updated_at: new Date(),
        })
        batchOps += 1
      }
    }

    if (!dryRun && batchOps > 0) {
      await batch.commit()
    }

    const lastId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'events',
      details: {
        name: 'events.backfill-country',
        dryRun,
        onlyPublished,
        limit,
        startAfterId: startAfterId || null,
        scanned,
        updated,
        skipped,
        unable,
      },
    })

    return adminOk({
      dryRun,
      onlyPublished,
      limit,
      startAfterId: startAfterId || null,
      scanned,
      updated,
      skipped,
      unable,
      unableItems,
      lastId,
      examples,
      next: lastId && scanned < limit ? { startAfterId: lastId } : null,
    })
  } catch (err: any) {
    console.error('Backfill country error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
