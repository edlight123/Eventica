#!/usr/bin/env node
/**
 * Backfill `phone_normalized` for existing users.
 *
 * The social "find friends by phone" feature matches contacts against the
 * `phone_normalized` field on user docs. That field is only written when a user
 * saves their phone after the social layer shipped, so accounts created before
 * then won't match. This script computes `phone_normalized` for every existing
 * user from their stored phone number.
 *
 * Privacy: this only writes the match key. Discovery is still gated at match
 * time by `privacy.discoverable_by_phone` (users who opted out are never
 * returned), so backfilling everyone is safe.
 *
 * Usage:
 *   # preview without writing:
 *   node -r dotenv/config scripts/backfill-phone-normalized.js dotenv_config_path=.env.local --dry
 *   # apply:
 *   node -r dotenv/config scripts/backfill-phone-normalized.js dotenv_config_path=.env.local
 */

const admin = require('firebase-admin')

const DRY_RUN = process.argv.includes('--dry')

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY.\n' +
        'Run with: node -r dotenv/config scripts/backfill-phone-normalized.js dotenv_config_path=.env.local'
    )
    process.exit(1)
  }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
}

const db = admin.firestore()

/**
 * Mirror of `phoneMatchKey` in types/social.ts — keep digits only and use the
 * last 8 digits (Haiti national number length) so matching is resilient to
 * country-code/format variance. MUST stay in sync with that function.
 */
function phoneMatchKey(raw) {
  if (!raw) return ''
  const digits = String(raw).replace(/\D+/g, '')
  if (!digits) return ''
  return digits.length > 8 ? digits.slice(-8) : digits
}

async function run() {
  console.log(`Backfilling phone_normalized${DRY_RUN ? ' (DRY RUN — no writes)' : ''}...\n`)

  const snap = await db.collection('users').get()
  console.log(`Scanning ${snap.size} users\n`)

  let updated = 0
  let alreadySet = 0
  let noPhone = 0
  let cleared = 0

  let batch = db.batch()
  let pending = 0
  const flush = async () => {
    if (pending > 0 && !DRY_RUN) {
      await batch.commit()
      batch = db.batch()
      pending = 0
    }
  }

  for (const doc of snap.docs) {
    const data = doc.data() || {}
    const rawPhone = data.phone_number || data.phone || ''
    const key = phoneMatchKey(rawPhone)
    const current = data.phone_normalized

    if (!key) {
      // No usable phone. Clear any stale key so it can't produce false matches.
      if (current) {
        cleared++
        if (!DRY_RUN) {
          batch.update(doc.ref, { phone_normalized: admin.firestore.FieldValue.delete() })
          pending++
        }
      } else {
        noPhone++
      }
    } else if (current === key) {
      alreadySet++
    } else {
      updated++
      if (!DRY_RUN) {
        batch.update(doc.ref, { phone_normalized: key })
        pending++
      }
    }

    if (pending >= 400) await flush()
  }

  await flush()

  console.log('Done.')
  console.log(`  updated:        ${updated}`)
  console.log(`  already set:    ${alreadySet}`)
  console.log(`  no phone:       ${noPhone}`)
  console.log(`  cleared stale:  ${cleared}`)
  if (DRY_RUN) {
    console.log('\n(DRY RUN — nothing was written. Re-run without --dry to apply.)')
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
