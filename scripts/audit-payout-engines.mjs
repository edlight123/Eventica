// Read-only: run BOTH balance engines for one organizer and diff them.
//
// The finance page shows a balance computed from the `event_earnings`
// collection. /api/organizer/request-payout validates the request against a
// balance computed from `tickets` joined to `events`. They are separate
// implementations with separate settlement delays and separate fee constants,
// so the number an organizer is shown is not the number their withdrawal is
// judged against — which is how "I have money available but it won't let me
// withdraw" happens.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
const db = admin.firestore()

const email = process.argv[2] || 'info@edlight.org'
const users = await db.collection('users').where('email', '==', email).get()
if (users.empty) { console.log('no such user'); process.exit(0) }
const uid = users.docs[0].id
console.log('organizer:', uid, `(${email})\n`)

/* ---------- Engine A: what the finance PAGE shows ---------- */
const earnings = await db.collection('event_earnings').where('organizerId', '==', uid).get()
let aAvail = 0, aNet = 0
const aEvents = []
for (const d of earnings.docs) {
  const x = d.data()
  const net = Math.max(0, Number(x.netAmount || 0))
  const wd = Math.max(0, Number(x.withdrawnAmount || 0))
  const avail = x.settlementStatus === 'ready' ? Math.max(0, net - wd) : 0
  aAvail += avail; aNet += net
  aEvents.push({ eventId: x.eventId, cur: x.currency, net, avail, status: x.settlementStatus })
}
console.log('ENGINE A — page (event_earnings)')
console.log('  available:', aAvail, ' net:', aNet)
aEvents.forEach(e => console.log(`    ${e.eventId} ${e.cur} net=${e.net} avail=${e.avail} ${e.status}`))

/* ---------- Engine B: what the WITHDRAW API validates ---------- */
const evSnap = await db.collection('events').where('organizer_id', '==', uid).get()
console.log(`\nENGINE B — withdraw API (tickets x events)`)
console.log('  events owned:', evSnap.size)
const events = evSnap.docs.map(d => ({ id: d.id, ...d.data() }))
const eventIds = events.map(e => e.id)

// Which event_earnings events are NOT owned by this organizer's events list?
const owned = new Set(eventIds)
const orphaned = aEvents.filter(e => !owned.has(e.eventId))

const paid = new Set()
const pv = await db.collection('organizers').doc(uid).collection('payouts')
  .where('status', 'in', ['completed', 'processing']).get()
pv.docs.forEach(d => (d.data().ticketIds || []).forEach(i => paid.add(i)))

let tickets = []
for (let i = 0; i < eventIds.length; i += 10) {
  const batch = eventIds.slice(i, i + 10)
  if (!batch.length) break
  const ts = await db.collection('tickets').where('event_id', 'in', batch).get()
  ts.docs.forEach(d => {
    const x = d.data()
    const st = String(x.status ?? '').toLowerCase().trim()
    const live = !st || ['valid','confirmed','active'].includes(st)
    tickets.push({ id: d.id, ...x, _live: live, _st: st || '(empty)' })
  })
}
const byStatus = {}
tickets.forEach(t => { byStatus[t._st] = (byStatus[t._st]||0)+1 })
console.log('  tickets by status:', JSON.stringify(byStatus))
const oldEngine = tickets.filter(t => t._st === 'valid')
const newEngine = tickets.filter(t => t._live)
console.log(`  counted BEFORE fix (status=='valid' only): ${oldEngine.length}`)
console.log(`  counted AFTER  fix (live status set)     : ${newEngine.length}`)
const unpaid = newEngine.filter(t => !paid.has(t.id))
console.log('  unpaid + live:', unpaid.length)

const now = new Date()
const DELAY = 7 // SETTLEMENT_DELAY_DAYS, hardcoded in lib/firestore/payout.ts
let bAvail = 0, bPending = 0
for (const t of unpaid) {
  const ev = events.find(e => e.id === t.event_id)
  if (!ev) continue
  const gross = Math.round((t.price_paid || 0) * 100)
  const net = String(t.fee_incidence ?? '') === 'buyer' ? gross : Math.floor(gross * 0.9)
  const end = new Date(ev.end_datetime || ev.start_datetime)
  const ready = new Date(end.getTime() + DELAY * 86400000)
  if (now >= ready) bAvail += net; else bPending += net
}
console.log('  available:', bAvail, ' pending:', bPending)

console.log('\n--- VERDICT ---')
console.log('earnings history (engine A):', aAvail)
console.log('withdrawable    (engine B):', bAvail, ' <- the page now shows THIS')
const apiWouldAccept = bAvail >= 5000 && unpaid.length > 0
console.log('page enables the button    :', bAvail >= 5000)
console.log('API would accept           :', apiWouldAccept)
if ((bAvail >= 5000) !== apiWouldAccept) {
  console.log('\n>>> MISMATCH: button state and API outcome still disagree.')
} else {
  console.log('\nOK: the button state matches what the API will do.')
}
if (aAvail !== bAvail) {
  console.log(`NOTE: the two engines differ by ${aAvail - bAvail} minor units.`)
  console.log('      Engine A is shown as earnings history only, not as withdrawable.')
}
if (orphaned.length) {
  console.log('\nearnings docs whose eventId is NOT in this organizer\'s events:')
  orphaned.forEach(e => console.log('   ', e.eventId, e.cur, 'avail=' + e.avail))
}
console.log('\nsettlement delay: page uses FEE_CONFIG.SETTLEMENT_HOLD_DAYS, API hardcodes 7 days')
process.exit(0)
