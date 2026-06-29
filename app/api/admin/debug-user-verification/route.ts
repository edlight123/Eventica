import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireDevTools } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

function normalizeStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').trim().toLowerCase()

    if (!email) {
      return adminError('Email parameter required', 400)
    }

    // Firestore user lookup
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    const firestoreUserDoc = usersSnapshot.empty ? null : usersSnapshot.docs[0]
    const uid = firestoreUserDoc?.id || null
    const firestoreUser = firestoreUserDoc?.data() || null

    if (!uid) {
      return adminError('User not found in Firestore users collection', 404)
    }

    const [organizerDoc, payoutConfigDoc] = await Promise.all([
      adminDb.collection('organizers').doc(uid).get(),
      adminDb
        .collection('organizers')
        .doc(uid)
        .collection('payoutConfig')
        .doc('main')
        .get(),
    ])

    const organizer = organizerDoc.exists ? organizerDoc.data() : null
    const payoutConfig = payoutConfigDoc.exists ? payoutConfigDoc.data() : null

    const [verificationByIdDoc, verificationByUserIdSnap, verificationByUser_idSnap] = await Promise.all([
      adminDb.collection('verification_requests').doc(uid).get(),
      adminDb.collection('verification_requests').where('userId', '==', uid).limit(1).get(),
      adminDb.collection('verification_requests').where('user_id', '==', uid).limit(1).get(),
    ])

    const verificationById = verificationByIdDoc.exists ? verificationByIdDoc.data() : null
    const verificationByUserId = !verificationByUserIdSnap.empty ? verificationByUserIdSnap.docs[0].data() : null
    const verificationByUser_id = !verificationByUser_idSnap.empty ? verificationByUser_idSnap.docs[0].data() : null

    const firestoreUserStatus = normalizeStatus(firestoreUser?.verification_status)
    const organizerStatus = normalizeStatus(organizer?.verification_status)
    const requestStatus = normalizeStatus(
      verificationById?.status || verificationByUserId?.status || verificationByUser_id?.status
    )

    const computedIdentity = (() => {
      if (firestoreUser?.is_verified === true || organizer?.is_verified === true) return 'verified'
      if (firestoreUserStatus === 'approved' || organizerStatus === 'approved' || requestStatus === 'approved') return 'verified'
      if (requestStatus === 'rejected') return 'failed'
      if (
        requestStatus === 'pending' ||
        requestStatus === 'pending_review' ||
        requestStatus === 'in_review' ||
        requestStatus === 'changes_requested'
      ) {
        return 'pending'
      }
      return 'pending'
    })()

    return adminOk({
      email,
      uid,
      firestore: {
        user: firestoreUser,
        organizer,
        payoutConfig,
        verification_requests: {
          byDocId: verificationById,
          byUserIdField: verificationByUserId,
          byUser_idField: verificationByUser_id,
        },
      },
      derived: {
        firestoreUserStatus,
        organizerStatus,
        requestStatus,
        computedIdentity,
      },
      hint:
        computedIdentity === 'verified'
          ? 'Identity should display as Verified on payouts page.'
          : 'One of users/organizers/verification_requests is still not approved; update the source of truth used for approval.',
    })
  } catch (err: any) {
    console.error('debug-user-verification error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
