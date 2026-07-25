/**
 * H4 — Client-side (browser SDK) sync for the public_profiles projection.
 *
 * Used by the web client profile-write paths (signup, Google sign-in, client
 * profile edit). The owner may write their own public_profiles/{uid} doc under
 * the Firestore rules. Best-effort: never throws.
 */

import { db } from '@/lib/firebase/client'
import { doc, setDoc } from 'firebase/firestore'
import { pickPublicProfileFields } from './public-profile-fields'

export async function syncPublicProfileClient(
  uid: string,
  data: Record<string, any> | null | undefined
): Promise<void> {
  try {
    if (!uid) return
    const fields = pickPublicProfileFields(data)
    if (Object.keys(fields).length === 0) return
    await setDoc(doc(db, 'public_profiles', uid), fields, { merge: true })
  } catch (err) {
    console.error('[public_profiles] client sync failed for', uid, err)
  }
}
