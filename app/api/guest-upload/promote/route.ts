import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { adminStorage } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Moves a guest-uploaded poster into event-images/ once its author has an
 * account and is actually creating the event, so the cleanup cron's expiry
 * never touches a poster in use. Auth required; only guest-uploads/ objects
 * in OUR bucket are accepted.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { url } = await request.json()
    if (typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    const bucket = adminStorage.bucket()
    const m = url.match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)\?/)
    const objectPath = m ? decodeURIComponent(m[2]) : ''
    if (!m || m[1] !== bucket.name || !objectPath.startsWith('guest-uploads/')) {
      return NextResponse.json({ error: 'Not a guest upload' }, { status: 400 })
    }

    const src = bucket.file(objectPath)
    const [exists] = await src.exists()
    if (!exists) {
      return NextResponse.json({ error: 'File no longer exists' }, { status: 404 })
    }

    const ext = objectPath.split('.').pop() || 'jpg'
    const dest = `event-images/${randomUUID()}.${ext}`
    const token = randomUUID()
    await src.copy(bucket.file(dest))
    await bucket.file(dest).setMetadata({
      metadata: { firebaseStorageDownloadTokens: token, promoted_by: user.id },
    })
    // The source is deliberately NOT deleted here: promote stays idempotent
    // under retries/double-submits, and the cleanup cron removes the guest
    // copy once nothing references it (after the TTL).

    const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`
    return NextResponse.json({ url: permanentUrl })
  } catch (err: any) {
    console.error('guest-upload promote failed:', err)
    return NextResponse.json({ error: 'Could not finalize the poster' }, { status: 500 })
  }
}
