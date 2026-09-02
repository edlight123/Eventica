// Backfills ticket_tiers rows for the seeded showcase events (checkout reads
// tiers from the top-level ticket_tiers collection; the seeder only wrote the
// event docs). Also stamps has_paid_tiers + reports_count on any event doc
// missing them, so every reader sees the same answers. `--dry` previews.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
const db = admin.firestore()

const DRY = process.argv.includes('--dry')
const events = await db.collection('events').get()

for (const d of events.docs) {
  const x = d.data()
  const patch = {}
  if (x.has_paid_tiers === undefined) {
    patch.has_paid_tiers = x.ticket_name !== 'RSVP' && Number(x.ticket_price || 0) > 0
  }
  if (x.reports_count === undefined) patch.reports_count = 0
  if (Object.keys(patch).length > 0) {
    if (DRY) console.log('would patch', x.title, JSON.stringify(patch))
    else await d.ref.update(patch)
  }

  const existing = await db.collection('ticket_tiers').where('event_id', '==', d.id).limit(1).get()
  if (!existing.empty || x.ticket_name === 'RSVP') continue
  const tier = {
    event_id: d.id,
    name: x.ticket_name || 'General Admission',
    price: Number(x.ticket_price || 0),
    total_quantity: Number(x.total_tickets || 0),
    sold_quantity: 0,
    description: null,
    sales_start: null,
    sales_end: null,
    valid_from: null,
    valid_until: null,
    sort_order: 0,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  }
  if (DRY) console.log('would add tier for', x.title, `(${tier.price} ${x.currency} × ${tier.total_quantity})`)
  else {
    await db.collection('ticket_tiers').add(tier)
    console.log('tier added:', x.title)
  }
}
console.log('done')
process.exit(0)
