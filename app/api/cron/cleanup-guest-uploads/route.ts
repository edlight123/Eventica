import { NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Nightly storage cleanup. Two sweeps, both reference-aware and bounded:
 *
 *  1. guest-uploads/  — posters composed while signed out. Deleted after
 *     GUEST_TTL_DAYS unless an event still points at them (which happens when
 *     promotion at create time failed and the event kept its guest URL).
 *
 *  2. event-images/   — the permanent poster/logo store. Deletes only objects
 *     that NOTHING references and that are older than ORPHAN_MIN_AGE_DAYS.
 *     This one is deliberately paranoid: `ImageUpload` writes organizer LOGOS
 *     into the same prefix, so the reference set is built from every collection
 *     that can hold an image URL, not just events. A generous age floor also
 *     protects an image uploaded into a draft that is still being composed.
 *
 * Pass ?dryRun=1 to see what WOULD be deleted without touching anything.
 * Runs daily via Vercel cron (see vercel.json).
 */
const GUEST_TTL_DAYS = 7
const ORPHAN_MIN_AGE_DAYS = 30
const MAX_DELETES_PER_SWEEP = 500
const TIME_BUDGET_MS = 90_000

/** Object path out of a Firebase download URL, or null. */
function objectPathFromUrl(url: string, bucketName: string): string | null {
  const m = url.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/)
  if (!m || m[1] !== bucketName) return null
  try {
    return decodeURIComponent(m[2])
  } catch {
    return null
  }
}

/**
 * Every storage object path referenced by Firestore. Scans whole documents for
 * download URLs rather than named fields, so a new image field somewhere does
 * not silently turn live files into "orphans".
 */
async function collectReferencedPaths(bucketName: string): Promise<Set<string>> {
  const refs = new Set<string>()
  const collections = ['events', 'users', 'public_profiles', 'organizers']

  const walk = (value: unknown) => {
    if (typeof value === 'string') {
      if (value.includes('firebasestorage.googleapis.com')) {
        const p = objectPathFromUrl(value, bucketName)
        if (p) refs.add(p)
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(walk)
    }
  }

  for (const col of collections) {
    try {
      const snap = await adminDb.collection(col).get()
      snap.forEach((doc: any) => walk(doc.data()))
    } catch (err) {
      // A collection we cannot read must never be treated as "no references" —
      // that would make its images look orphaned. Fail the whole sweep instead.
      throw new Error(`could not read ${col} for the reference set: ${String(err)}`)
    }
  }
  return refs
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  const started = Date.now()
  const outOfTime = () => Date.now() - started > TIME_BUDGET_MS

  try {
    const bucket = adminStorage.bucket()
    const referenced = await collectReferencedPaths(bucket.name)

    // ---- sweep 1: abandoned guest uploads ----
    const [guestFiles] = await bucket.getFiles({
      prefix: 'guest-uploads/',
      maxResults: 2000,
      autoPaginate: false,
    })
    const guestCutoff = Date.now() - GUEST_TTL_DAYS * 24 * 3600 * 1000
    let guestDeleted = 0
    let guestKept = 0
    for (const file of guestFiles) {
      if (guestDeleted >= MAX_DELETES_PER_SWEEP || outOfTime()) break
      const meta = file.metadata || {}
      const custom = (meta.metadata || {}) as Record<string, string>
      const uploadedAt = Date.parse(custom.uploaded_at || String(meta.timeCreated) || '')
      if (!Number.isFinite(uploadedAt) || uploadedAt > guestCutoff || referenced.has(file.name)) {
        guestKept++
        continue
      }
      if (!dryRun) await file.delete({ ignoreNotFound: true })
      guestDeleted++
    }

    // ---- sweep 2: orphaned event images ----
    const [eventFiles] = await bucket.getFiles({
      prefix: 'event-images/',
      maxResults: 5000,
      autoPaginate: false,
    })
    const orphanCutoff = Date.now() - ORPHAN_MIN_AGE_DAYS * 24 * 3600 * 1000
    let orphansDeleted = 0
    let orphansKept = 0
    let orphanBytes = 0
    for (const file of eventFiles) {
      if (orphansDeleted >= MAX_DELETES_PER_SWEEP || outOfTime()) break
      if (referenced.has(file.name)) {
        orphansKept++
        continue
      }
      const created = Date.parse(String(file.metadata?.timeCreated || ''))
      if (!Number.isFinite(created) || created > orphanCutoff) {
        orphansKept++ // too new to judge — a draft may still be claiming it
        continue
      }
      orphanBytes += Number(file.metadata?.size || 0)
      if (!dryRun) await file.delete({ ignoreNotFound: true })
      orphansDeleted++
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      referencedPaths: referenced.size,
      guestUploads: { scanned: guestFiles.length, deleted: guestDeleted, kept: guestKept },
      eventImages: {
        scanned: eventFiles.length,
        deleted: orphansDeleted,
        kept: orphansKept,
        reclaimedMB: Number((orphanBytes / 1048576).toFixed(2)),
      },
    })
  } catch (err: any) {
    console.error('storage cleanup failed:', err)
    return NextResponse.json({ error: err?.message || 'cleanup failed' }, { status: 500 })
  }
}
