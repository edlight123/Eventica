#!/usr/bin/env node
/**
 * Backfill event `created_at` as a proper Firestore Timestamp.
 *
 * The admin Events console lists each tab with `.orderBy('created_at','desc')`.
 * Firestore drops docs whose ordered field is missing (or is a plain
 * string/number rather than a Timestamp), so events without a real `created_at`
 * Timestamp are counted by `.count()` but never appear in the list — the tab
 * badge says 60 while the table shows "No events found".
 *
 * This normalizes `created_at` to a Timestamp on every event that lacks one,
 * deriving the date from (in order) an existing parseable created_at, then
 * updated_at, then start_datetime, then now. Idempotent.
 *
 * Usage:
 *   node scripts/backfill-event-created-at.js            # dry run (no writes)
 *   node scripts/backfill-event-created-at.js --apply    # apply
 */

const admin = require('firebase-admin')
const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

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
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local.')
    process.exit(1)
  }
  admin.initializeApp({ credential: admin.credential.cert(parseServiceAccount(raw)) })
}

const db = admin.firestore()
const { Timestamp } = admin.firestore
const APPLY = process.argv.includes('--apply')

// A value read back from Firestore is a Timestamp iff it has a toDate() method.
const isTimestamp = (v) => v != null && typeof v.toDate === 'function'

function coerceDate(v) {
  if (v == null) return null
  if (typeof v.toDate === 'function') return v.toDate()
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

async function main() {
  console.log(`\n🕒 Backfilling event created_at (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  const snap = await db.collection('events').get()
  console.log(`   Scanning ${snap.size} event(s)...\n`)

  let changed = 0
  let batch = db.batch()
  let batchOps = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    if (isTimestamp(data.created_at)) continue // already good

    const derived =
      coerceDate(data.created_at) ||
      coerceDate(data.updated_at) ||
      coerceDate(data.start_datetime) ||
      new Date()
    const source = coerceDate(data.created_at)
      ? 'created_at(non-ts)'
      : coerceDate(data.updated_at)
        ? 'updated_at'
        : coerceDate(data.start_datetime)
          ? 'start_datetime'
          : 'now'

    changed++
    console.log(`   ${doc.id}  created_at <- ${derived.toISOString()} (from ${source})  (title: ${data.title || 'n/a'})`)

    if (APPLY) {
      batch.update(doc.ref, { created_at: Timestamp.fromDate(derived) })
      batchOps++
      if (batchOps >= 450) {
        await batch.commit()
        batch = db.batch()
        batchOps = 0
      }
    }
  }

  if (APPLY && batchOps > 0) await batch.commit()

  console.log(`\n✅ ${changed} event(s) ${APPLY ? 'updated' : 'would be updated'}.`)
  if (!APPLY && changed > 0) console.log('   Re-run with --apply to write these changes.\n')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
