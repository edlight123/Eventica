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

    // Get all organizers first, then fetch their verificationDocuments
    // This avoids the collection group query that requires an index
    const organizersSnap = await adminDb.collection('organizers').limit(100).get()
    
    const allDocs: any[] = []
    
    for (const orgDoc of organizersSnap.docs) {
      const organizerId = orgDoc.id
      const verDocsSnap = await adminDb
        .collection('organizers')
        .doc(organizerId)
        .collection('verificationDocuments')
        .get()
      
      for (const doc of verDocsSnap.docs) {
        const data = doc.data()
        // Only include bank verifications
        if (data.type === 'bank') {
          allDocs.push({
            docPath: doc.ref.path,
            docId: doc.id,
            organizerId,
            status: data.status || 'NO_STATUS',
            type: data.type,
            destinationId: data.destinationId,
            submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt || null,
            reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt || null,
            reviewedBy: data.reviewedBy || null,
            rejectionReason: data.rejectionReason || null,
          })
        }
      }
    }

    // Count by status
    const statusCounts: Record<string, number> = {}
    allDocs.forEach((r: { status: string }) => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
    })

    return adminOk({
      total: allDocs.length,
      statusCounts,
      note: 'Bank verifications use status: pending, verified (approved), failed (rejected)',
      requests: allDocs,
    })
  } catch (e: any) {
    console.error('Debug bank verification status error:', e)
    return adminError('Failed to fetch', 500, e?.message)
  }
}

// Manually update a bank verification status for testing
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const { docPath, newStatus } = await request.json()

    if (!docPath || !newStatus) {
      return adminError('Missing docPath or newStatus', 400)
    }

    // Validate status
    if (!['pending', 'verified', 'failed'].includes(newStatus)) {
      return adminError('Invalid status. Use: pending, verified, or failed', 400)
    }

    const ref = adminDb.doc(docPath)
    const doc = await ref.get()

    if (!doc.exists) {
      return adminError('Document not found', 404)
    }

    const beforeStatus = doc.data()?.status

    await ref.update({
      status: newStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.id,
    })

    // Read back to confirm
    const afterDoc = await ref.get()
    const afterStatus = afterDoc.data()?.status

    return adminOk({
      docPath,
      beforeStatus,
      afterStatus,
      success: afterStatus === newStatus,
    })
  } catch (e: any) {
    console.error('Debug bank verification update error:', e)
    return adminError('Failed to update', 500, e?.message)
  }
}
