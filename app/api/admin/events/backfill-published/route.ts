import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin/audit-log'
import { adminError, adminOk } from '@/lib/api/admin-response'

export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    // Keep it small and safe: scan a reasonable amount and only backfill when clearly intended.
    const snap = await adminDb.collection('events').limit(500).get()

    let scanned = 0
    let updated = 0
    let skipped = 0

    // Firestore batch limit is 500 operations.
    // We'll use a conservative batch size.
    const batchSize = 200
    let batch = adminDb.batch()
    let ops = 0

    const commitBatch = async () => {
      if (ops === 0) return
      await batch.commit()
      batch = adminDb.batch()
      ops = 0
    }

    for (const doc of snap.docs) {
      scanned++
      const data = doc.data() as any

      const hasIsPublished = typeof data.is_published === 'boolean'
      const hasLegacyPublishedStatus = String(data.status || '').toLowerCase() === 'published'

      // Only backfill if:
      // - legacy status says published
      // - AND is_published is missing or false
      if (hasLegacyPublishedStatus && data.is_published !== true) {
        batch.update(doc.ref, {
          is_published: true,
          rejected: false,
          updated_at: new Date(),
        })
        ops++
        updated++

        if (ops >= batchSize) {
          await commitBatch()
        }
      } else {
        // If is_published is missing AND status is missing, we don't guess.
        if (!hasIsPublished && !data.status) skipped++
        else skipped++
      }
    }

    await commitBatch()

    await logAdminAction({
      action: 'admin.backfill' as any,
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'system',
      details: { name: 'events.backfill-published', scanned, updated, skipped },
    })

    return adminOk({ scanned, updated, skipped })
  } catch (e: any) {
    console.error('backfill-published failed:', e)
    return adminError('Internal server error', 500, e?.message || String(e))
  }
}
