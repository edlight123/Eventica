import { adminDb } from '@/lib/firebase/admin'

/**
 * Password-protected events gate.
 *
 * When an event has `is_password_protected: true`, a buyer may only purchase /
 * claim tickets after proving they know the secret code. The proof is the
 * existence of `events/{eventId}/access_grants/{uid}`, which is written ONLY
 * server-side (Admin) by the verify-access endpoint after a correct code.
 *
 * This MUST be called with the Admin SDK (privileged read) because Firestore
 * rules deny client reads of the grant for other users and of the private code.
 *
 * @returns true when the purchase/issuance is allowed to proceed.
 */
export async function hasEventAccess(
  event: { is_password_protected?: boolean } | null | undefined,
  eventId: string,
  uid: string
): Promise<boolean> {
  if (!event?.is_password_protected) return true
  if (!eventId || !uid) return false

  const grantSnap = await adminDb
    .collection('events')
    .doc(eventId)
    .collection('access_grants')
    .doc(uid)
    .get()

  return grantSnap.exists
}
