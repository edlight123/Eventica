#!/usr/bin/env node
/**
 * Backfill the `country` field on event documents.
 *
 * The mobile feed (Home / Discover / Search) now filters events server-side by
 * country so a user in Miami never sees Port-au-Prince events. A Firestore
 * equality filter never matches a document that LACKS the field, so any event
 * doc without `country` disappears from every feed once that predicate ships.
 *
 * Before the predicate, a missing country was read as Haiti: eventCountry() in
 * mobile/data/metros.ts is `(event?.country || 'HT').toUpperCase()`. This script
 * writes that same implicit value explicitly, so the meaning of the data does
 * not change — it only becomes visible to a query.
 *
 * It also uppercases any lowercase code ('ht' -> 'HT'), since the predicate
 * compares against uppercase codes from COUNTRY_SUPPORT.
 *
 * Idempotent: only writes docs whose country is missing, blank, or not already
 * the uppercase form.
 *
 * Usage:
 *   node scripts/backfill-event-country.js            # dry run (no writes)
 *   node scripts/backfill-event-country.js --apply    # apply changes
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in the environment (same as the other
 * backfill scripts).
 */

const admin = require('firebase-admin')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

/** Mirrors parseServiceAccount() in lib/firebase/admin.ts. */
function parseServiceAccount(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = JSON.parse(raw.replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t'))
  }
  if (parsed && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
  }
  return parsed
}

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.error(
      '❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local (same value the app uses).',
    )
    process.exit(1)
  }
  admin.initializeApp({ credential: admin.credential.cert(parseServiceAccount(raw)) })
}

const db = admin.firestore()
const APPLY = process.argv.includes('--apply')

/** The value eventCountry() already assumed for a doc with no country. */
const IMPLICIT_DEFAULT = 'HT'

async function main() {
  console.log(`\n🌍 Backfilling event country (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  const eventsSnap = await db.collection('events').get()
  console.log(`   Scanning ${eventsSnap.size} event(s)...\n`)

  let changed = 0
  const byTarget = new Map()
  let batch = db.batch()
  let batchOps = 0

  for (const doc of eventsSnap.docs) {
    const data = doc.data()
    const raw = typeof data.country === 'string' ? data.country.trim() : ''
    const target = raw ? raw.toUpperCase() : IMPLICIT_DEFAULT

    if (data.country === target) continue

    changed++
    byTarget.set(target, (byTarget.get(target) || 0) + 1)
    const reason = raw ? `'${data.country}' -> '${target}'` : `missing -> '${target}'`
    const published = data.is_published === true ? 'published' : 'unpublished'
    console.log(`   ${doc.id}  ${reason}  (${published}: ${data.title || 'n/a'})`)

    if (APPLY) {
      batch.update(doc.ref, { country: target })
      batchOps++
      // Firestore batches cap at 500 writes.
      if (batchOps === 450) {
        await batch.commit()
        batch = db.batch()
        batchOps = 0
      }
    }
  }

  if (APPLY && batchOps > 0) await batch.commit()

  console.log(
    `\n   ${changed} event(s) ${APPLY ? 'updated' : 'would be updated'} out of ${eventsSnap.size}.`,
  )
  for (const [code, count] of byTarget) console.log(`     ${code}: ${count}`)
  if (!APPLY && changed > 0) console.log(`\n   Re-run with --apply to write.\n`)
  else console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
