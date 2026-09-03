// Read-only: does every paid sale actually produce an event_earnings doc?
//
// The finance page's available balance is computed ONLY from event_earnings.
// If completed orders/tickets exist for events that have no earnings doc, the
// money is real but invisible to the payout gate — an organizer sees revenue
// elsewhere in the product and cannot withdraw it.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
const db = admin.firestore()

const earnings = await db.collection('event_earnings').get()
console.log('event_earnings docs (whole platform):', earnings.size)
const haveEarnings = new Set(earnings.docs.map((d) => d.data().eventId))

// Tickets are the ground truth for "someone got in / paid".
const tickets = await db.collection('tickets').get()
console.log('tickets docs:', tickets.size)

const byEvent = new Map()
for (const t of tickets.docs) {
  const x = t.data()
  const ev = x.event_id || x.eventId
  if (!ev) continue
  const status = String(x.status || '').toLowerCase()
  const paid = Number(x.price_paid ?? x.pricePaid ?? x.amount_paid ?? 0) || 0
  const cur = x.currency || '?'
  const e = byEvent.get(ev) || { total: 0, paidSum: 0, cancelled: 0, cur: new Set() }
  e.total++
  if (status === 'cancelled') e.cancelled++
  else e.paidSum += paid
  if (paid > 0) e.cur.add(cur)
  byEvent.set(ev, e)
}

console.log('\nevents that have tickets:', byEvent.size)
let missing = 0
let missingRevenue = 0
const rows = []
for (const [ev, e] of byEvent) {
  const has = haveEarnings.has(ev)
  if (!has && e.paidSum > 0) { missing++; missingRevenue += e.paidSum }
  rows.push({ ev, ...e, cur: [...e.cur].join('/') || '-', hasEarnings: has })
}
rows.sort((a, b) => b.paidSum - a.paidSum)

console.log('\ntop events by paid revenue (earnings doc present?):')
for (const r of rows.slice(0, 15)) {
  console.log(
    `  ${r.hasEarnings ? 'YES' : ' NO'}  ${r.ev.slice(0, 26).padEnd(26)}` +
    ` tickets=${String(r.total).padStart(3)} cancelled=${String(r.cancelled).padStart(2)}` +
    ` paid=${String(r.paidSum).padStart(8)} ${r.cur}`
  )
}

console.log('\nevents with paid tickets but NO earnings doc:', missing)
console.log('their combined paid amount (minor units):', missingRevenue)
process.exit(0)
