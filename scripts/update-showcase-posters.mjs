// Re-uploads the regenerated showcase posters (location/price removed — the
// event card already shows them) and points each seeded event's
// banner_image_url at the new file. Matches events by title+city for the
// demo organizer. Posters live in ~/tikem-showcase-posters/. `--dry` previews.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import admin from 'firebase-admin'
import { EVENTS } from './showcase-events-data.mjs'

const env = readFileSync('/Users/tedjacquet/Tikem/.env.local', 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(raw)),
  storageBucket: 'event-haiti.firebasestorage.app',
})
const db = admin.firestore()
const bucket = admin.storage().bucket()

const ORGANIZER_ID = '2Rc7Gq8M19OL4ZNP2RGQyFeDjEA2'
const DRY = process.argv.includes('--dry')

for (const e of EVENTS) {
  const snap = await db
    .collection('events')
    .where('organizer_id', '==', ORGANIZER_ID)
    .where('title', '==', e.title)
    .where('city', '==', e.city)
    .get()
  if (snap.empty) {
    console.log('SKIP (not found):', e.title, '|', e.city)
    continue
  }
  if (DRY) {
    console.log('would update', snap.docs.map((d) => d.id).join(', '), '|', e.title, '|', e.city)
    continue
  }
  const uuid = randomUUID()
  const token = randomUUID()
  const dest = `event-images/${uuid}.jpg`
  await bucket.upload(`${process.env.HOME}/tikem-showcase-posters/${e.slug}.jpg`, {
    destination: dest,
    metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } },
  })
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`
  for (const d of snap.docs) {
    // Best effort: delete the old poster object so the bucket stays clean.
    const old = d.get('banner_image_url') || ''
    const m = old.match(/\/o\/([^?]+)\?/)
    if (m) {
      try {
        await bucket.file(decodeURIComponent(m[1])).delete()
      } catch {}
    }
    await d.ref.update({
      banner_image_url: url,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    })
    console.log('updated', d.id, '|', e.title, '|', e.city)
  }
}
console.log('done')
process.exit(0)
