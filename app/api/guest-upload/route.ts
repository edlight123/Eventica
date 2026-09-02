import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { adminStorage } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Signed-out poster upload for the /create composer. Files land under
 * guest-uploads/ (admin SDK — storage rules stay untouched) with an
 * uploaded_at stamp; the cleanup cron deletes unreferenced ones after
 * GUEST_UPLOAD_TTL_DAYS. When the visitor finishes sign-up and creates the
 * event, /api/guest-upload/promote moves the file into event-images/.
 */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, WebP or GIF images are allowed' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const bucket = adminStorage.bucket()
    const token = randomUUID()
    const dest = `guest-uploads/${randomUUID()}.${EXT[file.type]}`

    await bucket.file(dest).save(buf, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=3600',
        metadata: {
          firebaseStorageDownloadTokens: token,
          guest_upload: '1',
          uploaded_at: new Date().toISOString(),
        },
      },
    })

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('guest-upload failed:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
