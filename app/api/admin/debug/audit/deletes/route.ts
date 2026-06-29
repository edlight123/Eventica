import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

type QueryDoc = FirebaseFirestore.QueryDocumentSnapshot
type AuditRow = { id: string } & Record<string, any>

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const url = new URL(request.url)
    const limitRaw = url.searchParams.get('limit')
    const limit = Math.max(1, Math.min(200, Number(limitRaw || 50) || 50))

    // Avoid requiring a composite index (where+orderBy). Grab recent items by timestamp and filter.
    const snap = await adminDb
      .collection('admin_audit_log')
      .orderBy('timestamp', 'desc')
      .limit(Math.max(limit * 4, 100))
      .get()

    const deletes = snap.docs
      .map((doc: QueryDoc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((row: AuditRow) => row.action === 'event.delete')
      .slice(0, limit) as AuditRow[]

    const checked = await Promise.all(
      deletes.map(async (row: AuditRow) => {
        const resourceId = String(row.resourceId || '')
        let existsInEvents: boolean | null = null

        if (resourceId) {
          try {
            const eventDoc = await adminDb.collection('events').doc(resourceId).get()
            existsInEvents = eventDoc.exists
          } catch {
            existsInEvents = null
          }
        }

        return {
          auditId: row.id,
          timestamp: row.timestamp || row.createdAt || row.timestampMs || null,
          adminEmail: row.adminEmail || null,
          resourceId: resourceId || null,
          eventTitle: row?.details?.eventTitle || null,
          existsInEvents,
        }
      })
    )

    return adminOk({
      limit,
      found: checked.length,
      deletes: checked,
    })
  } catch (e: any) {
    console.error('debug/audit/deletes failed:', e)
    return adminError('Internal server error', 500, e?.message || String(e))
  }
}
