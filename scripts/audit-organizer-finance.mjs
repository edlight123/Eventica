// Read-only diagnostic for the /organizer/finance withdraw gate.
//
// Prints, for one organizer: the per-event earnings docs, the aggregate the
// page computes, the payout config, verification state, and whether the UI's
// canWithdraw gate would pass — so a "why can't I withdraw" report can be
// answered from data rather than from reading the gate and guessing.
//
// Usage: node scripts/audit-organizer-finance.mjs <email>
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
  raw = raw.slice(1, -1)
}
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) })
const db = admin.firestore()

const email = process.argv[2]
if (!email) {
  console.log('usage: node scripts/audit-organizer-finance.mjs <email>')
  process.exit(0)
}

const users = await db.collection('users').where('email', '==', email).get()
if (users.empty) {
  console.log('no user with email', email)
  process.exit(0)
}

for (const u of users.docs) {
  const d = u.data()
  console.log('\n=== user', u.id)
  console.log('   role              :', d.role)
  console.log('   verification      :', d.verification_status)

  const org = await db.collection('organizers').doc(u.id).get()
  console.log('   organizers doc    :', org.exists ? 'exists' : 'MISSING')
  if (org.exists) {
    const o = org.data()
    console.log('     verification_status:', o.verification_status)
    console.log('     payout_mode        :', o.payout_mode ?? '(unset)')
    console.log('     payout_schedule    :', o.payout_schedule ?? '(unset)')
  }

  const cfg = await db
    .collection('organizers').doc(u.id)
    .collection('payoutConfig').doc('main').get()
  console.log('   payoutConfig/main :', cfg.exists ? JSON.stringify(cfg.data()) : 'MISSING')

  // Per-event earnings docs. NOTE the field is camelCase `organizerId`
  // here, unlike `organizer_id` on events — that asymmetry is itself worth
  // knowing; querying the snake_case spelling returns silently empty.
  const earnings = await db.collection('event_earnings').where('organizerId', '==', u.id).get()
  console.log(`   event_earnings    : ${earnings.size} docs`)
  let sumAvail = 0, sumNet = 0, sumWithdrawn = 0
  for (const e of earnings.docs) {
    const x = e.data()
    sumAvail += Number(x.availableToWithdraw || 0)
    sumNet += Number(x.netAmount || 0)
    sumWithdrawn += Number(x.withdrawnAmount || 0)
    console.log(
      `     - ${e.id} cur=${x.currency || '?'} net=${x.netAmount || 0}` +
      ` avail=${x.availableToWithdraw || 0} withdrawn=${x.withdrawnAmount || 0}` +
      ` settlement=${x.settlementStatus || '?'}`
    )
  }
  console.log('   SUM available     :', sumAvail, `(gate needs > 5000 in the UI, >= 5000 server-side)`)
  console.log('   SUM net           :', sumNet)
  console.log('   SUM withdrawn     :', sumWithdrawn)
  console.log('   UI canWithdraw    :', sumAvail > 5000)
  console.log('   server would allow:', sumAvail >= 5000)

  const payouts = await db.collection('organizers').doc(u.id).collection('payouts').get()
  console.log(`   payouts           : ${payouts.size}`)
  payouts.docs.slice(0, 5).forEach((p) => {
    const x = p.data()
    console.log(`     - ${p.id} status=${x.status} amount=${x.amount ?? x.amount_cents ?? '?'}`)
  })
}
process.exit(0)
