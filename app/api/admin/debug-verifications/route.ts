import { NextRequest, NextResponse } from 'next/server'
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
    const snapshot = await adminDb
      .collection('verification_requests')
      .get()

    const verifications = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }))

    return adminOk({
      total: verifications.length,
      verifications,
      statusCounts: {
        pending: verifications.filter((v: any) => v.status === 'pending').length,
        pending_review: verifications.filter((v: any) => v.status === 'pending_review').length,
        in_review: verifications.filter((v: any) => v.status === 'in_review').length,
        approved: verifications.filter((v: any) => v.status === 'approved').length,
        rejected: verifications.filter((v: any) => v.status === 'rejected').length,
      }
    })

  } catch (error) {
    console.error('Error fetching verification requests:', error)
    return adminError(
      'Failed to fetch',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
