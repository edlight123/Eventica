import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireDevTools()

    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    console.log('Fetching verification requests with status "pending"...')
    
    const snapshot = await adminDb
      .collection('verification_requests')
      .where('status', '==', 'pending')
      .get()

    console.log(`Found ${snapshot.size} verification requests with status "pending"`)

    // Update each document
    const batch = adminDb.batch()
    let count = 0

    snapshot.docs.forEach((doc: any) => {
      console.log(`Updating ${doc.id} to status "pending_review"`)
      batch.update(doc.ref, { status: 'pending_review' })
      count++
    })

    if (count > 0) {
      await batch.commit()
      console.log(`✅ Successfully updated ${count} verification requests to "pending_review"`)
    }

    // Also check users table for pending verification status
    console.log('Fetching users with verification_status "pending"...')
    const usersSnapshot = await adminDb
      .collection('users')
      .where('verification_status', '==', 'pending')
      .get()

    console.log(`Found ${usersSnapshot.size} users with verification_status "pending"`)

    let userCount = 0
    if (usersSnapshot.size > 0) {
      const userBatch = adminDb.batch()

      usersSnapshot.docs.forEach((doc: any) => {
        console.log(`Updating user ${doc.id} to verification_status "pending_review"`)
        userBatch.update(doc.ref, { verification_status: 'pending_review' })
        userCount++
      })

      await userBatch.commit()
      console.log(`✅ Successfully updated ${userCount} users to verification_status "pending_review"`)
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'verification_requests',
      details: {
        name: 'migrate_verification_status',
        verificationsUpdated: count,
        usersUpdated: userCount,
      },
    })

    return adminOk({
      success: true,
      verificationsUpdated: count,
      usersUpdated: userCount,
      message: `Updated ${count} verification requests and ${userCount} users`
    })

  } catch (error) {
    console.error('Error migrating verification statuses:', error)
    return adminError(
      'Migration failed',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
