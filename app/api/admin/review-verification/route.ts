import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { Resend } from 'resend'
import { adminDb } from '@/lib/firebase/admin'
import { createNotification } from '@/lib/notifications/helpers'
import { sendPushNotification } from '@/lib/notification-triggers'
import { FieldValue } from 'firebase-admin/firestore'
import { logAdminAction } from '@/lib/admin/audit-log'
import { adminError, adminOk } from '@/lib/api/admin-response'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()

    // Only allow admin users
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const { requestId, status, rejectionReason } = await request.json()

    console.log(`[review-verification] Received: requestId=${requestId}, status=${status}`)

    if (!requestId || !status || !['approved', 'rejected', 'changes_requested'].includes(status)) {
      return adminError('Invalid request data', 400)
    }

    // Map the legacy UI "rejected" action to the newer, resubmittable state.
    const normalizedStatus = status === 'rejected' ? 'changes_requested' : status
    console.log(`[review-verification] Normalized status: ${normalizedStatus}`)

    // Get verification request
    const verificationRef = adminDb.collection('verification_requests').doc(requestId)
    const verificationDoc = await verificationRef.get()

    if (!verificationDoc.exists) {
      console.log(`[review-verification] Request ${requestId} not found`)
      return adminError('Verification request not found', 404)
    }

    const verificationRequest = verificationDoc.data()
    console.log(`[review-verification] Current status in DB: ${verificationRequest?.status}`)

    // Update verification request using Firebase Admin SDK
    await verificationRef.update({
      status: normalizedStatus,
      // New/canonical fields
      reviewedBy: user.id,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      reviewNotes: normalizedStatus !== 'approved' ? (rejectionReason || null) : null,
      // Legacy fields (kept for older screens/backfills)
      reviewed_by: user.id,
      reviewed_at: new Date(),
      updated_at: new Date(),
      rejection_reason: normalizedStatus !== 'approved' ? (rejectionReason || null) : null,
    })

    // Verify the update was successful by reading back
    const updatedDoc = await verificationRef.get()
    const updatedStatus = updatedDoc.data()?.status
    console.log(`[review-verification] Updated request ${requestId}: status is now '${updatedStatus}'`)

    if (updatedStatus !== normalizedStatus) {
      console.error(`[review-verification] WARNING: Status mismatch! Expected '${normalizedStatus}' but got '${updatedStatus}'`)
    }

    // Update user verification status
    // Handle both old format (user_id) and new format (userId or document ID)
    const userId = verificationRequest.userId || verificationRequest.user_id || requestId
    const nowIso = new Date().toISOString()

    try {
      // Keep the user/organizer docs in sync without overwriting unrelated fields.
      const approved = normalizedStatus === 'approved'
      const userVerificationStatus = approved ? 'approved' : 'pending'

      await adminDb.collection('users').doc(userId).set(
        {
          is_verified: approved,
          verification_status: userVerificationStatus,
          updated_at: nowIso,
        },
        { merge: true }
      )

      await adminDb.collection('organizers').doc(userId).set(
        {
          is_verified: approved,
          verification_status: userVerificationStatus,
          updated_at: nowIso,
        },
        { merge: true }
      )
    } catch (err) {
      console.error('Error updating user via Admin SDK:', err)
      return adminError('Failed to update user status', 500)
    }

    // Fetch user details for notifications/emails.
    const organizerDoc = await adminDb.collection('users').doc(userId).get()
    const organizer = organizerDoc.exists ? organizerDoc.data() : null

    // Create in-app notification and send push
    try {
      if (normalizedStatus === 'approved') {
        await createNotification(
          userId,
          'verification',
          '✅ Verification Approved!',
          'Congratulations! Your Eventica account has been verified. You can now create and publish events.',
          '/organizer/verify',
          { status: 'approved' }
        )

        // Send push notification for approval
        await sendPushNotification(
          userId,
          '✅ You\'re Verified!',
          'Your account is now verified. Start creating events!',
          '/organizer/events/new',
          { type: 'verification_approved' }
        )
      } else {
        const message = rejectionReason 
          ? `Your verification was not approved. Reason: ${rejectionReason}. You can resubmit your application from the verification page.`
          : 'Your verification was not approved. You can resubmit your application from the verification page.'
        
        await createNotification(
          userId,
          'verification',
          'Verification Update',
          message,
          '/organizer/verify',
          { status: normalizedStatus, reason: rejectionReason }
        )

        // Send push notification for rejection
        await sendPushNotification(
          userId,
          'Verification Update',
          'Your verification needs attention. Please review and resubmit.',
          '/organizer/verify',
          { type: normalizedStatus === 'changes_requested' ? 'verification_changes_requested' : 'verification_rejected' }
        )
      }
    } catch (notificationError) {
      console.error('Error creating in-app notification:', notificationError)
    }

    // Send notification email to organizer
    if ((organizer as any)?.email && resend) {
      try {
        if (normalizedStatus === 'approved') {
          await resend.emails.send({
            from: 'Eventica <noreply@joineventica.com>',
            to: (organizer as any).email,
            subject: '✅ Your Eventica Account is Verified!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #059669;">🎉 Congratulations!</h1>
                <p>Hello ${(organizer as any).full_name || ''},</p>
                <p>Great news! Your identity verification has been <strong>approved</strong>.</p>
                <p>You can now:</p>
                <ul>
                  <li>✅ Create and publish events</li>
                  <li>✅ Display a verified badge on your events</li>
                  <li>✅ Access all organizer features</li>
                </ul>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/events/new" 
                     style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
                    Create Your First Event
                  </a>
                </p>
                <p style="margin-top: 40px;">Thank you for being part of the Eventica community!</p>
              </div>
            `,
          })
        } else {
          await resend.emails.send({
            from: 'Eventica <noreply@joineventica.com>',
            to: (organizer as any).email,
            subject: 'Eventica Verification Update',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #DC2626;">Verification Not Approved</h1>
                <p>Hello ${(organizer as any).full_name || ''},</p>
                <p>Unfortunately, we were unable to approve your verification request.</p>
                ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                <p>Please submit a new verification request with:</p>
                <ul>
                  <li>Clear, well-lit photos</li>
                  <li>All text on ID card clearly visible</li>
                  <li>Face clearly visible in selfie</li>
                </ul>
                <p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/organizer/verify" 
                     style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
                    Try Again
                  </a>
                </p>
              </div>
            `,
          })
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError)
      }
    }

    await logAdminAction({
      action: normalizedStatus === 'approved' ? 'verification.approve' : 'verification.reject',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceId: requestId,
      resourceType: 'verification_request',
      details: {
        requestId,
        userId,
        status: normalizedStatus,
        reason: rejectionReason || null,
        userEmail: (organizer as any)?.email || null,
        userName: (organizer as any)?.full_name || null,
      },
    })

    return adminOk({
      message: `Verification ${normalizedStatus}`,
    })
  } catch (error) {
    console.error('Review verification error:', error)
    return adminError('Internal server error', 500)
  }
}
