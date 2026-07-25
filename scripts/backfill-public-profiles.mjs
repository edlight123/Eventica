#!/usr/bin/env node
/**
 * H4 backfill — build the public_profiles/{uid} projection for every user.
 *
 * `public_profiles/{uid}` is a minimal, cross-user-readable projection of a
 * user's SAFE display fields (name, photo, is_verified, bio, username,
 * organization name/logo). It exists so other users can render a name/avatar
 * WITHOUT reading `users/{uid}` (which holds PII: email, phone_number, privacy
 * settings, verification internals). This script seeds the projection for all
 * existing users so nothing goes invisible before the app starts reading it.
 *
 * This script is IDEMPOTENT and NON-DESTRUCTIVE:
 *   - It only CREATES/UPDATES public_profiles docs (merge writes).
 *   - It NEVER modifies or deletes any users doc.
 *   - Re-running it simply re-upserts the same safe fields.
 *
 * Run:  node scripts/backfill-public-profiles.mjs
 *       node scripts/backfill-public-profiles.mjs --dry-run
 *
 * Requires the same env the app uses:
 *   FIREBASE_SERVICE_ACCOUNT_KEY   (service-account JSON)
 * Loaded from .env.local if present.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// --- load .env.local (simple parser, no dep) ---
try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v
    }
  }
} catch { /* no .env.local — rely on real env */ }

const DRY_RUN = process.argv.includes('--dry-run')

// --- SAFE projection. Keep in lockstep with lib/firestore/public-profile-fields.ts
//     and mobile/lib/publicProfile.ts. NEVER include email, phone_number/phone,
//     whatsapp/contact number, verification internals, privacy settings, or the
//     privacy-gated personal social_links object. ---
function pickPublicProfileFields(data) {
  const out = {}
  if (!data) return out

  const name = data.full_name ?? data.display_name ?? data.displayName
  if (name != null) out.full_name = name

  const photo = data.photo_url ?? data.photoURL
  if (photo != null) out.photo_url = photo

  const city = data.city ?? data.default_city
  if (city != null) out.city = city
  const country = data.country ?? data.default_country
  if (country != null) out.country = country

  const createdAt = data.created_at ?? data.createdAt
  if (createdAt != null) out.created_at = createdAt

  if (data.is_verified != null) out.is_verified = data.is_verified
  if (data.bio != null) out.bio = data.bio
  if (data.username != null) out.username = data.username
  if (data.organization_name != null) out.organization_name = data.organization_name
  if (data.organization_logo != null) out.organization_logo = data.organization_logo
  if (data.description != null) out.description = data.description

  // Brand / organization socials (public), NOT the personal social_links object.
  if (data.website != null) out.website = data.website
  if (data.instagram != null) out.instagram = data.instagram
  if (data.facebook != null) out.facebook = data.facebook
  if (data.tiktok != null) out.tiktok = data.tiktok

  if (data.categories != null) out.categories = data.categories
  if (data.languages != null) out.languages = data.languages
  if (data.rating != null) out.rating = data.rating

  return out
}

function initAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY.\n' +
      'Set it in .env.local or the environment (service-account JSON).'
    )
    process.exit(1)
  }
  let sa
  try {
    sa = JSON.parse(raw)
  } catch {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.')
    process.exit(1)
  }
  if (!getApps().length) initializeApp({ credential: cert(sa) })
  return getFirestore()
}

async function main() {
  const db = initAdmin()
  console.log(`[backfill] public_profiles ${DRY_RUN ? '(DRY RUN)' : ''}`)

  const usersSnap = await db.collection('users').get()
  console.log(`[backfill] found ${usersSnap.size} users`)

  let written = 0
  let skipped = 0
  let batch = db.batch()
  let batchCount = 0

  for (const userDoc of usersSnap.docs) {
    const fields = pickPublicProfileFields(userDoc.data())
    if (Object.keys(fields).length === 0) {
      skipped++
      continue
    }

    if (DRY_RUN) {
      console.log(`  would upsert public_profiles/${userDoc.id}:`, Object.keys(fields).join(', '))
      written++
      continue
    }

    batch.set(db.collection('public_profiles').doc(userDoc.id), fields, { merge: true })
    batchCount++
    written++

    // Firestore batches cap at 500 writes.
    if (batchCount >= 400) {
      await batch.commit()
      batch = db.batch()
      batchCount = 0
    }
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit()
  }

  console.log(`[backfill] done — upserted ${written}, skipped ${skipped} (no safe fields)`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[backfill] failed:', err)
  process.exit(1)
})
