import { NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Deletes abandoned guest poster uploads (guest-uploads/) older than
 * TTL_DAYS. A file whose URL is still referenced by any event is kept, no
 * matter its age — that covers the rare case where promotion at create time
 * failed and the event kept its guest URL. Runs daily via Vercel cron.
 */
const TTL_DAYS = 7

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bucket = adminStorage.bucket()
    // Bounded per run: a flood of junk uploads must not be able to starve the
    // cron into timing out forever (it runs daily; a backlog drains over days).
    const [files] = await bucket.getFiles({
      prefix: 'guest-uploads/',
      maxResults: 2000,
      autoPaginate: false,
    })
    const cutoff = Date.now() - TTL_DAYS * 24 * 3600 * 1000
    const started = Date.now()
    const MAX_DELETES = 500
    const TIME_BUDGET_MS = 90_000

    let deleted = 0
    let kept = 0
    for (const file of files) {
      if (deleted >= MAX_DELETES || Date.now() - started > TIME_BUDGET_MS) break
      const meta = file.metadata || {}
      const custom = (meta.metadata || {}) as Record<string, string>
      const uploadedAt = Date.parse(custom.uploaded_at || String(meta.timeCreated) || '')
      if (!Number.isFinite(uploadedAt) || uploadedAt > cutoff) {
        kept++
        continue
      }
      // Referenced by an event? Then promotion failed once — keep it alive.
      const token = custom.firebaseStorageDownloadTokens || ''
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`
      const ref = await adminDb.collection('events').where('banner_image_url', '==', url).limit(1).get()
      if (!ref.empty) {
        kept++
        continue
      }
      await file.delete({ ignoreNotFound: true })
      deleted++
    }

    return NextResponse.json({ ok: true, scanned: files.length, deleted, kept })
  } catch (err: any) {
    console.error('cleanup-guest-uploads failed:', err)
    return NextResponse.json({ error: err?.message || 'cleanup failed' }, { status: 500 })
  }
}
