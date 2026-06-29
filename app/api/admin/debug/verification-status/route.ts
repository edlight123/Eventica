import { NextRequest } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    // Get all verification requests
    const snapshot = await adminDb.collection('verification_requests').get()

    const requests = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        status: data.status || 'NO_STATUS',
        userId: data.userId || data.user_id || null,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewed_at || null,
        reviewNotes: data.reviewNotes || data.rejection_reason || null,
      }
    })

    // Count by status
    const statusCounts: Record<string, number> = {}
    requests.forEach((r: { status: string }) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })

    return adminOk({
      total: requests.length,
      statusCounts,
      requests,
    })
  } catch (e: any) {
    console.error('Debug verification status error:', e)
    return adminError('Failed to fetch', 500, e?.message)
  }
}

// Update a specific verification status (for testing)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const { requestId, newStatus } = await request.json()

    if (!requestId || !newStatus) {
      return adminError('Missing requestId or newStatus', 400)
    }

    const ref = adminDb.collection('verification_requests').doc(requestId)
    const doc = await ref.get()

    if (!doc.exists) {
      return adminError('Request not found', 404)
    }

    const beforeStatus = doc.data()?.status

    await ref.update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })

    // Read back to confirm
    const afterDoc = await ref.get()
    const afterStatus = afterDoc.data()?.status

    return adminOk({
      requestId,
      beforeStatus,
      afterStatus,
      success: afterStatus === newStatus,
    })
  } catch (e: any) {
    console.error('Debug update error:', e)
    return adminError('Failed to update', 500, e?.message)
  }
}
