import { adminDb } from '@/lib/firebase/admin'
import { createNotification } from './helpers'

/**
 * Notification helpers for payout verification events
 */

/**
 * Notify admins when an organizer submits verification documents
 */
export async function notifyAdminsOfVerificationSubmission(params: {
  organizerId: string
  organizerName: string
  verificationType: 'identity' | 'bank' | 'phone'
  destinationId?: string
}): Promise<void> {
  const { organizerId, organizerName, verificationType, destinationId } = params

  // Get all admin users
  const adminsSnap = await adminDb
    .collection('users')
    .where('role', 'in', ['admin', 'super_admin'])
    .get()

  const typeLabel =
    verificationType === 'identity'
      ? 'Identity'
      : verificationType === 'bank'
        ? 'Bank Account'
        : 'Phone Number'

  const title = `New ${typeLabel} Verification Submitted`
  const message = `${organizerName} submitted ${typeLabel.toLowerCase()} verification for review.`
  const actionUrl = `/admin/trust?organizerId=${organizerId}&type=${verificationType}`

  // Send notification to each admin
  const promises = adminsSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
    createNotification(
      doc.id,
      'verification_submitted',
      title,
      message,
      actionUrl,
      {
        organizerId,
        verificationType,
        destinationId,
      }
    )
  )

  await Promise.all(promises)
}

/**
 * Notify organizer when verification is approved
 */
export async function notifyOrganizerVerificationApproved(params: {
  organizerId: string
  verificationType: 'identity' | 'bank' | 'phone'
  destinationId?: string
}): Promise<void> {
  const { organizerId, verificationType, destinationId } = params

  const typeLabel =
    verificationType === 'identity'
      ? 'Identity'
      : verificationType === 'bank'
        ? 'Bank Account'
        : 'Phone Number'

  const title = `${typeLabel} Verification Approved ✓`
  const message = `Your ${typeLabel.toLowerCase()} verification has been approved. You can now receive payouts.`
  const actionUrl = '/organizer/settings/payouts'

  await createNotification(
    organizerId,
    'verification_approved',
    title,
    message,
    actionUrl,
    {
      verificationType,
      destinationId,
    }
  )
}

/**
 * Notify organizer when verification is rejected
 */
export async function notifyOrganizerVerificationRejected(params: {
  organizerId: string
  verificationType: 'identity' | 'bank' | 'phone'
  reason?: string
  destinationId?: string
}): Promise<void> {
  const { organizerId, verificationType, reason, destinationId } = params

  const typeLabel =
    verificationType === 'identity'
      ? 'Identity'
      : verificationType === 'bank'
        ? 'Bank Account'
        : 'Phone Number'

  const title = `${typeLabel} Verification Issue`
  const message = reason
    ? `Your ${typeLabel.toLowerCase()} verification was not approved. Reason: ${reason}`
    : `Your ${typeLabel.toLowerCase()} verification needs attention. Please review and resubmit.`
  const actionUrl = '/organizer/settings/payouts'

  await createNotification(
    organizerId,
    'verification_rejected',
    title,
    message,
    actionUrl,
    {
      verificationType,
      reason,
      destinationId,
    }
  )
}

/**
 * Notify organizer when more information is needed
 */
export async function notifyOrganizerVerificationNeedsInfo(params: {
  organizerId: string
  verificationType: 'identity' | 'bank' | 'phone'
  message: string
  destinationId?: string
}): Promise<void> {
  const { organizerId, verificationType, message: customMessage, destinationId } = params

  const typeLabel =
    verificationType === 'identity'
      ? 'Identity'
      : verificationType === 'bank'
        ? 'Bank Account'
        : 'Phone Number'

  const title = `${typeLabel} Verification - More Info Needed`
  const actionUrl = '/organizer/settings/payouts'

  await createNotification(
    organizerId,
    'verification_info_needed',
    title,
    customMessage,
    actionUrl,
    {
      verificationType,
      destinationId,
    }
  )
}
