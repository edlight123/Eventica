// Read-only: which payout-profile docs exist for an organizer, and would the
// withdraw route find one? The route asks ONLY for the 'haiti' profile, and
// getPayoutProfile's legacy fallback deliberately refuses to serve a legacy
// Stripe-Connect config as the Haiti profile — so a Stripe organizer can be
// blocked with "Payout method not configured" no matter their balance.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
const env = readFileSync('/Users/tedjacquet/Tikem/.env.local','utf8')
let raw = env.split('\n').find(l=>l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')).slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'")&&raw.endsWith("'"))||(raw.startsWith('"')&&raw.endsWith('"'))) raw=raw.slice(1,-1)
admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))})
const db=admin.firestore()

const email = process.argv[2] || 'info@edlight.org'
const us = await db.collection('users').where('email','==',email).get()
if (us.empty) { console.log('no user'); process.exit(0) }
const uid = us.docs[0].id
console.log('organizer', uid, email, '\n')

const prof = await db.collection('organizers').doc(uid).collection('payoutProfiles').get()
console.log('payoutProfiles docs:', prof.size, prof.docs.map(d=>d.id).join(', ') || '(none)')
prof.docs.forEach(d => console.log('  ', d.id, JSON.stringify(d.data()).slice(0,180)))

const legacy = await db.collection('organizers').doc(uid).collection('payoutConfig').doc('main').get()
const l = legacy.exists ? legacy.data() : null
console.log('\npayoutConfig/main exists:', legacy.exists)
if (l) {
  const provider = String(l.payoutProvider||'').toLowerCase()
  const loc = String(l.accountLocation || l.bankDetails?.accountLocation || '').toLowerCase()
  const isStripe = provider === 'stripe_connect' || loc === 'united_states' || loc === 'canada'
  console.log('  payoutProvider  :', provider || '(unset)')
  console.log('  accountLocation :', loc || '(unset)')
  console.log('  status          :', l.status)
  console.log('  classified as   :', isStripe ? 'stripe_connect' : 'haiti')
  console.log('\n  getPayoutProfile(uid,"haiti")  would resolve:',
    prof.docs.find(d=>d.id==='haiti') ? 'the haiti profile doc'
      : (l && !isStripe ? 'the legacy config' : 'NULL  <-- route returns "Payout method not configured"'))
  console.log('  the withdraw route asks for    : "haiti" only')
}
process.exit(0)
