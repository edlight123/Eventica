// Verification helper for the event lineup (event.guestlist).
//
// `--set <eventId>` writes a rich three-act lineup onto one event so the public
// renderer can be checked against real Firestore data; `--clear <eventId>`
// removes it again. `--find` lists a few published events to pick from.
//
// This exists because `guestlist` is read through the explicit field whitelist
// in lib/data/events.ts — the only way to prove the field survives that path is
// to put real data behind it and load the page.
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

const LINEUP = [
  {
    name: 'Michael Brun',
    role: 'DJ',
    photo_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&q=80',
    link: 'https://instagram.com/michaelbrun',
    description: 'Haitian producer and DJ, founder of the Bayo series.',
    start_time: '23:00',
    end_time: '01:00',
  },
  {
    name: 'Rutshelle Guillaume',
    role: 'Performer',
    photo_url: null,
    link: 'spotify.com/artist/rutshelle',
    description: null,
    start_time: '21:30',
    end_time: '22:45',
  },
  // Deliberately bare: proves the renderer degrades to just a name + role.
  { name: 'Ti Jo Zenny', role: 'Special Guest' },
]

const [, , mode, id] = process.argv

if (mode === '--find') {
  const snap = await db.collection('events').where('is_published', '==', true).limit(6).get()
  snap.docs.forEach((d) => console.log(d.id, '|', d.get('title'), '|', d.get('city')))
} else if (mode === '--set' && id) {
  await db.collection('events').doc(id).update({ guestlist: LINEUP })
  console.log('lineup written to', id)
} else if (mode === '--clear' && id) {
  await db.collection('events').doc(id).update({ guestlist: admin.firestore.FieldValue.delete() })
  console.log('lineup cleared from', id)
} else {
  console.log('usage: verify-lineup.mjs --find | --set <eventId> | --clear <eventId>')
}
process.exit(0)
