#!/usr/bin/env node
/**
 * Uploads the Tikèm guide files (interactive HTML + PDF) to Firebase Storage
 * under `guides/`, makes them public, sets correct Content-Type, and writes a
 * manifest. The public site serves them from tikem.co/guides/* via a Next
 * rewrite (see next.config.js) so URLs stay on-brand.
 *
 * Run:  node scripts/upload-guides.mjs /absolute/path/to/guides-staging
 *
 * Requires the same env the app uses:
 *   FIREBASE_SERVICE_ACCOUNT_KEY   (service-account JSON)
 *   FIREBASE_STORAGE_BUCKET        (or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
 * Loaded from .env.local if present.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

// --- load .env.local (simple parser, no dep) ---
try {
  const env = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      process.env[m[1]] = v
    }
  }
} catch { /* no .env.local — rely on real env */ }

const STAGING = process.argv[2]
if (!STAGING) { console.error('Usage: node scripts/upload-guides.mjs <staging-dir>'); process.exit(1) }

const rawBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
if (!rawBucket) { console.error('Missing FIREBASE_STORAGE_BUCKET'); process.exit(1) }
const bucketName = rawBucket.startsWith('gs://') ? rawBucket.slice(5) : rawBucket

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
if (!saRaw) { console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY'); process.exit(1) }
function parseSA(raw) {
  let p
  try { p = JSON.parse(raw) } catch { p = JSON.parse(raw.replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t')) }
  if (typeof p.private_key === 'string') p.private_key = p.private_key.replace(/\\n/g, '\n')
  return p
}

if (!getApps().length) initializeApp({ credential: cert(parseSA(saRaw)), storageBucket: bucketName })
const bucket = getStorage().bucket()

const CT = { '.html': 'text/html; charset=utf-8', '.pdf': 'application/pdf' }
const files = readdirSync(STAGING).filter(f => f.endsWith('.html') || f.endsWith('.pdf')).sort()

const manifest = {}
let done = 0
for (const f of files) {
  const dest = `guides/${f}`
  const contentType = CT[extname(f)]
  // PDFs download; HTML renders inline.
  const contentDisposition = f.endsWith('.pdf')
    ? `attachment; filename="Tikem-${basename(f)}"`
    : 'inline'
  // Objects stay PRIVATE. The bucket uses uniform bucket-level access, so we
  // don't (and can't) set per-object public ACLs. The public site serves these
  // through app/guides/[file]/route.ts, which reads them with the Admin SDK.
  await bucket.upload(join(STAGING, f), {
    destination: dest,
    metadata: { contentType, contentDisposition, cacheControl: 'public, max-age=3600' },
  })
  manifest[f] = `/guides/${f}` // served on-domain via the route handler
  done++
  console.log(`  [${done}/${files.length}] ${f}  →  /guides/${f}`)
}

writeFileSync(join(STAGING, 'guides-manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`\nUploaded ${done} files to gs://${bucketName}/guides/ (private)`)
console.log(`Manifest written to ${join(STAGING, 'guides-manifest.json')}`)
console.log(`Served on-domain via /guides/* (see app/guides/[file]/route.ts)`)
