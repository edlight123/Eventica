import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
const env = readFileSync('/Users/tedjacquet/Tikem/.env.local','utf8')
let raw = env.split('\n').find(l=>l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')).slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'")&&raw.endsWith("'"))||(raw.startsWith('"')&&raw.endsWith('"'))) raw=raw.slice(1,-1)
admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))})
const db=admin.firestore()
const snap = await db.collection('events').where('is_published','==',true).limit(40).get()
const now = Date.now()
const live = []
for (const d of snap.docs) {
  const x=d.data()
  const t = x.start_datetime?.toDate ? x.start_datetime.toDate() : new Date(x.start_datetime)
  if (t && t.getTime() > now) live.push({id:d.id,title:x.title,when:t.toISOString().slice(0,10),price:x.ticket_price,cur:x.currency,rsvp:x.is_rsvp})
}
live.sort((a,b)=>a.when<b.when?-1:1)
live.slice(0,6).forEach(e=>console.log(e.id,'|',e.title,'|',e.when,'|',e.price,e.cur,'| rsvp:',!!e.rsvp))
console.log('total future published:', live.length)
process.exit(0)
