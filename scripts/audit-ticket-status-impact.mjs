// Read-only: how much money did the payout engine's `status == 'valid'` filter
// hide, platform-wide? Compares the old filter against the live-status set.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
const env = readFileSync('/Users/tedjacquet/Tikem/.env.local','utf8')
let raw = env.split('\n').find(l=>l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')).slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'")&&raw.endsWith("'"))||(raw.startsWith('"')&&raw.endsWith('"'))) raw=raw.slice(1,-1)
admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))})
const db=admin.firestore()

const all = await db.collection('tickets').get()
const byStatus = {}
let oldCounted = 0, newCounted = 0, oldMoney = 0, newMoney = 0
const owners = {}
for (const d of all.docs) {
  const x = d.data()
  const st = String(x.status ?? '').toLowerCase().trim() || '(empty)'
  byStatus[st] = (byStatus[st]||0)+1
  const paid = Number(x.price_paid || 0)
  const live = st === '(empty)' || ['valid','confirmed','active'].includes(st)
  if (st === 'valid') { oldCounted++; oldMoney += paid }
  if (live) { newCounted++; newMoney += paid }
  if (live && st !== 'valid') {
    const ev = x.event_id || x.eventId
    owners[ev] = (owners[ev]||0) + paid
  }
}
console.log('tickets by status:', JSON.stringify(byStatus, null, 2))
console.log(`\ncounted by OLD payout filter (status=='valid'): ${oldCounted}  money=${oldMoney}`)
console.log(`counted by NEW live-status set               : ${newCounted}  money=${newMoney}`)
console.log(`\nRECOVERED by the fix: ${newCounted - oldCounted} tickets, ${newMoney - oldMoney} in ticket-price units`)
if (Object.keys(owners).length) {
  console.log('\nevents whose money was hidden:')
  for (const [ev, amt] of Object.entries(owners)) {
    const e = await db.collection('events').doc(ev).get()
    console.log(`  ${ev}  amount=${amt}  organizer=${e.exists ? e.data().organizer_id : '(event missing)'}`)
  }
}
// Who owns the tickets that DO exist?
const evIds = [...new Set(all.docs.map(d => d.data().event_id).filter(Boolean))]
console.log('\nevents with tickets and their organizers:')
for (const ev of evIds) {
  const e = await db.collection('events').doc(ev).get()
  console.log(`  ${ev} -> ${e.exists ? e.data().organizer_id : '(missing event doc)'}`)
}
process.exit(0)
