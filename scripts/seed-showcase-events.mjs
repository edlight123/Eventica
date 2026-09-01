// Uploads the generated posters to Firebase Storage and creates one
// published event per entry, cloning the exact field shape of the existing
// demo events (FÒJ 2026 et al): custom doc id, ISO-string start_datetime,
// is_published/rejected/reports_count moderation fields, etc.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import admin from 'firebase-admin'
import { EVENTS } from './showcase-events-data.mjs'

const ENV_PATH = '/Users/tedjacquet/Tikem/.env.local'
const env = readFileSync(ENV_PATH, 'utf8')
const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1)
const serviceAccount = JSON.parse(raw)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'event-haiti.firebasestorage.app',
})
const db = admin.firestore()
const bucket = admin.storage().bucket()

const ORGANIZER_ID = '2Rc7Gq8M19OL4ZNP2RGQyFeDjEA2' // the demo organizer (FÒJ 2026 etc.)
const DRY = process.argv.includes('--dry')

async function uploadPoster(slug) {
  const uuid = randomUUID()
  const token = randomUUID()
  const dest = `event-images/${uuid}.jpg`
  await bucket.upload(`${process.env.HOME}/tikem-showcase-posters/${slug}.jpg`, {
    destination: dest,
    metadata: {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`
}

for (const e of EVENTS) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  if (DRY) { console.log('would create', id, e.title, e.city); continue }
  const banner_image_url = await uploadPoster(e.slug)
  const doc = {
    id,
    title: e.title,
    summary: e.sub,
    description: e.desc,
    category: e.category,
    tags: [],
    start_datetime: new Date(e.date).toISOString(),
    end_datetime: null,
    venue_name: e.venue,
    address: e.address,
    city: e.city,
    commune: '',
    country: e.country,
    currency: e.currency,
    ticket_price: e.price,
    ticket_name: 'General Admission',
    total_tickets: e.total,
    banner_image_url,
    organizer_id: ORGANIZER_ID,
    is_published: true,
    status: 'published',
    rejected: false,
    reports_count: 0,
    featured: false,
    show_on_explore: true,
    is_online: false,
    is_recurring: false,
    password_protected: false,
    enable_waitlist: false,
    show_guestlist: true,
    guestlist: [],
    accent_color: e.accent,
    title_font: 'Default',
    spotify_url: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }
  await db.collection('events').doc(id).set(doc)
  console.log('created', id, '|', e.title, '|', e.city)
  await new Promise((r) => setTimeout(r, 25)) // keep Date.now() ids unique
}
console.log('done')
process.exit(0)
