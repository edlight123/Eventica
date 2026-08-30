// Tikèm Picks curation from the CLI.
//
//   node scripts/star-picks.mjs                 list upcoming candidates
//   node scripts/star-picks.mjs <id> [<id>...]  star events (featured: true)
//   node scripts/star-picks.mjs --unstar <id>   unstar
//
// Same field the admin console's Feature button writes; the homepage Picks
// rail needs at least 2 starred events to render. Reads
// FIREBASE_SERVICE_ACCOUNT_KEY from .env.local like the other scripts.
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = env.split('\n').find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
    if (line) {
      let raw = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
      if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
        raw = raw.slice(1, -1)
      }
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY = raw
    }
  } catch {}
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}')
if (!serviceAccount.project_id) {
  console.error('No FIREBASE_SERVICE_ACCOUNT_KEY in env or .env.local')
  process.exit(1)
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

const args = process.argv.slice(2)
const unstar = args[0] === '--unstar'
const ids = unstar ? args.slice(1) : args

if (ids.length === 0) {
  // List mode: upcoming, published, non-rejected, with artwork.
  const snap = await db.collection('events').where('is_published', '==', true).limit(300).get()
  const now = Date.now()
  const rows = []
  for (const doc of snap.docs) {
    const e = doc.data()
    if (e.rejected === true) continue
    if (!e.banner_image_url) continue
    const start = new Date(e.start_datetime).getTime()
    if (Number.isNaN(start) || start < now) continue
    rows.push({
      id: doc.id,
      title: e.title,
      city: e.city || '',
      country: e.country || 'HT',
      start: String(e.start_datetime).slice(0, 10),
      sold: e.tickets_sold || 0,
      featured: e.featured === true || e.is_featured === true,
      category: e.category || '',
    })
  }
  rows.sort((a, b) => (a.start < b.start ? -1 : 1))
  console.log(`upcoming published events with artwork: ${rows.length}`)
  for (const r of rows) {
    console.log(
      `${r.featured ? '★' : ' '} ${r.id}  ${r.start}  sold:${String(r.sold).padEnd(5)} ${r.country} ${r.city.padEnd(16)} [${r.category}] ${r.title}`
    )
  }
} else {
  for (const id of ids) {
    const ref = db.collection('events').doc(id)
    const doc = await ref.get()
    if (!doc.exists) {
      console.error(`✗ ${id}: not found`)
      continue
    }
    await ref.update({ featured: !unstar })
    console.log(`${unstar ? '☆ unstarred' : '★ starred'} ${id} — ${doc.data().title}`)
  }
}
process.exit(0)
