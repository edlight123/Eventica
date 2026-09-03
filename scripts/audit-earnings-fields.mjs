// Read-only: which field names do event_earnings docs actually carry?
//
// getOrganizerEarningsSummary filters on `organizerId` (camelCase) while most
// of the app writes snake_case (`organizer_id`). If the stored docs use the
// other spelling the query returns nothing and the finance page silently reads
// zero — the same field-drift class of bug already seen on created-at.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
const db = admin.firestore()

const snap = await db.collection('event_earnings').limit(50).get()
console.log('event_earnings sampled:', snap.size)

const fieldCounts = {}
const keySets = new Set()
for (const d of snap.docs) {
  const data = d.data()
  keySets.add(Object.keys(data).sort().join(','))
  for (const k of Object.keys(data)) fieldCounts[k] = (fieldCounts[k] || 0) + 1
}

console.log('\nfield -> how many of the sampled docs have it:')
for (const [k, n] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${k}`)
}

console.log('\ndistinct key shapes:', keySets.size)
;[...keySets].forEach((s, i) => console.log(`  shape ${i + 1}: ${s}`))

// Does the page's own query find anything at all, for anyone?
for (const field of ['organizerId', 'organizer_id']) {
  const ids = new Set()
  for (const d of snap.docs) {
    const v = d.data()[field]
    if (v) ids.add(v)
  }
  console.log(`\ndocs carrying "${field}": ${[...snap.docs].filter(d => d.data()[field]).length}` +
              ` across ${ids.size} organizer id(s)`)
}

console.log('\nsample doc:')
if (!snap.empty) console.log(JSON.stringify(snap.docs[0].data(), null, 2).slice(0, 1200))
process.exit(0)
