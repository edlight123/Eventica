// Read-only: do tickets record the fee that was ACTUALLY charged at checkout?
//
// The payout engine recomputes a flat uncapped 10% (lib/firestore/payout.ts).
// Checkout applies a per-country rate WITH a per-ticket cap (750 HTG / $5.00),
// so for any ticket above the cap threshold the two disagree and the organizer
// is under-paid. If the charged fee is stored per ticket, the payout side
// should read it rather than recompute.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
const env = readFileSync('/Users/tedjacquet/Tikem/.env.local','utf8')
let raw = env.split('\n').find(l=>l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')).slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'")&&raw.endsWith("'"))||(raw.startsWith('"')&&raw.endsWith('"'))) raw=raw.slice(1,-1)
admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))})
const db=admin.firestore()

const snap = await db.collection('tickets').limit(20).get()
console.log('tickets sampled:', snap.size, '\n')
const counts = {}
for (const d of snap.docs) for (const k of Object.keys(d.data())) counts[k]=(counts[k]||0)+1
console.log('fields present:')
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${String(n).padStart(3)}  ${k}`))

const feeish = Object.keys(counts).filter(k=>/fee|platform|net|commission|incidence/i.test(k))
console.log('\nfee-related fields:', feeish.length ? feeish.join(', ') : 'NONE — payout must recompute')
if (!snap.empty) {
  console.log('\nsample:')
  console.log(JSON.stringify(snap.docs[0].data(), null, 2).slice(0, 900))
}
process.exit(0)
