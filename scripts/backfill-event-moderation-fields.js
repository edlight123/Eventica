#!/usr/bin/env node
/**
 * Backfill event moderation fields
 *
 * The admin Events Moderation console filters events server-side by the tab
 * they belong to (Pending / Published / Reported / Unpublished). Those tabs are
 * derived from three fields that must exist on EVERY event doc, because
 * Firestore silently drops documents missing a field from equality/range
 * filters — a missing field would make an event invisible to the moderator.
 *
 * This script normalizes those fields across all events so the server-side tab
 * queries return complete, correct results:
 *   - is_published (boolean): existing boolean if present, else status === 'published'
 *   - rejected     (boolean): existing boolean if present, else false
 *   - reports_count (number): count of event_reports for the event, else 0
 *
 * It is idempotent: it only writes fields that are missing or would change.
 *
 * Usage:
 *   node scripts/backfill-event-moderation-fields.js            # dry run (no writes)
 *   node scripts/backfill-event-moderation-fields.js --apply    # apply changes
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY in the environment (same as the other
 * backfill scripts).
 */

const admin = require('firebase-admin')
const path = require('path')

// Load env the same way the app does (.env.local first, then .env).
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

/**
 * Parse the service-account JSON, tolerating the two common corruptions of the
 * value in .env / Vercel (literal newlines in the PEM, or escaped "\\n").
 * Mirrors parseServiceAccount() in lib/firebase/admin.ts.
 */
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

function normalizedIsPublished(data) {
  if (typeof data.is_published === 'boolean') return data.is_published
  return data.status === 'published'
}

function normalizedRejected(data) {
  if (typeof data.rejected === 'boolean') return data.rejected
  return false
}

async function main() {
  console.log(`\n🔧 Backfilling event moderation fields (${APPLY ? 'APPLY' : 'DRY RUN'})\n`)

  // Tally report counts once, in memory, instead of one query per event.
  const reportsByEvent = new Map()
  try {
    const reportsSnap = await db.collection('event_reports').get()
    reportsSnap.forEach((doc) => {
      const eventId = doc.data().event_id
      if (eventId) reportsByEvent.set(eventId, (reportsByEvent.get(eventId) || 0) + 1)
    })
    console.log(`   Found ${reportsSnap.size} report(s) across ${reportsByEvent.size} event(s).`)
  } catch (err) {
    console.log(`   No event_reports collection (or unreadable); treating all reports_count as 0.`)
  }

  const eventsSnap = await db.collection('events').get()
  console.log(`   Scanning ${eventsSnap.size} event(s)...\n`)

  let changed = 0
  let batch = db.batch()
  let batchOps = 0

  for (const doc of eventsSnap.docs) {
    const data = doc.data()
    const target = {
      is_published: normalizedIsPublished(data),
      rejected: normalizedRejected(data),
      reports_count: reportsByEvent.get(doc.id) || 0,
    }

    const update = {}
    if (data.is_published !== target.is_published) update.is_published = target.is_published
    if (data.rejected !== target.rejected) update.rejected = target.rejected
    if ((data.reports_count || 0) !== target.reports_count) update.reports_count = target.reports_count

    if (Object.keys(update).length === 0) continue

    changed++
    console.log(`   ${doc.id}  ${JSON.stringify(update)}  (title: ${data.title || 'n/a'})`)

    if (APPLY) {
      batch.update(doc.ref, update)
      batchOps++
      // Firestore batches cap at 500 writes.
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
