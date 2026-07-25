/**
 * H4 — Server-side (Admin SDK) sync for the public_profiles projection.
 *
 * Call this whenever a users doc's public fields are created or updated on the
 * server. It is best-effort: a failure here must never fail the primary write.
 */

import { adminDb } from '@/lib/firebase/admin'
import { pickPublicProfileFields } from './public-profile-fields'

/**
 * Mirror the SAFE public fields of a users doc into public_profiles/{uid}.
 * `data` may be a full users doc or a partial patch; only safe fields present
 * are written (merge). Never throws.
 */
export async function syncPublicProfileAdmin(
  uid: string,
  data: Record<string, any> | null | undefined
): Promise<void> {
  try {
    if (!uid) return
    const fields = pickPublicProfileFields(data)
    if (Object.keys(fields).length === 0) return
    await adminDb.collection('public_profiles').doc(uid).set(fields, { merge: true })
  } catch (err) {
    // Best-effort: log and swallow so the primary users-doc write still succeeds.
    console.error('[public_profiles] admin sync failed for', uid, err)
  }
}
