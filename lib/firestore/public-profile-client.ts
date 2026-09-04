/**
 * H4 — Client-side (browser SDK) sync for the public_profiles projection.
 *
 * Used by the web client profile-write paths (signup, Google sign-in, client
 * profile edit). The owner may write their own public_profiles/{uid} doc under
 * the Firestore rules. Best-effort: never throws.
 */

import { pickPublicProfileFields } from './public-profile-fields'

/**
 * BUNDLE: the Firebase imports below are deferred ON PURPOSE — do not hoist
 * them back to module scope.
 *
 * This module is imported by ./user-profile, which is in turn imported by
 * seven client components (including components/LocationDetectionBanner, which
 * renders on the marketing homepage). A static Firebase import here is a
 * transitive static path to the SDK and defeats the deferral done in
 * user-profile.ts — a route only sheds the Firebase chunks when its LAST
 * static importer is gone.
 *
 * Measured at the time of this change: 444KB of Firebase (three chunks —
 * 223 + 136 + 85KB) on the first load of every route, out of ~988KB of shared
 * JS. (Reference point: /resources went 350KB -> 167KB once its only importer
 * was deferred.)
 */
let firestoreModule: Promise<typeof import('firebase/firestore')> | null = null
let clientModule: Promise<typeof import('@/lib/firebase/client')> | null = null

async function firebase() {
  const [fs, client] = await Promise.all([
    (firestoreModule ??= import('firebase/firestore')),
    (clientModule ??= import('@/lib/firebase/client')),
  ])
  return { fs, db: client.db }
}

export async function syncPublicProfileClient(
  uid: string,
  data: Record<string, any> | null | undefined
): Promise<void> {
  try {
    if (!uid) return
    const fields = pickPublicProfileFields(data)
    if (Object.keys(fields).length === 0) return
    const { fs, db } = await firebase()
    await fs.setDoc(fs.doc(db, 'public_profiles', uid), fields, { merge: true })
  } catch (err) {
    console.error('[public_profiles] client sync failed for', uid, err)
  }
}
