import { NextRequest } from 'next/server'
import { adminStorage } from '@/lib/firebase/admin'

// Guide docs (interactive HTML + downloadable PDF) live as PRIVATE objects in
// Firebase Storage under guides/. The bucket uses uniform bucket-level access,
// so objects are not individually public; we read them here with the Admin SDK
// (service-account credentials) and stream them from our own domain. This keeps
// URLs on tikem.co/guides/* and never exposes the bucket publicly.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Only slug filenames like "organizer-program-en.html" / "getting-paid-fr.pdf".
// No slashes or dots-dots, so path traversal outside guides/ is impossible.
const ALLOWED = /^[a-z0-9-]+\.(html|pdf)$/

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params

  if (!ALLOWED.test(file)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const object = adminStorage.bucket().file(`guides/${file}`)
    const [exists] = await object.exists()
    if (!exists) {
      return new Response('Not found', { status: 404 })
    }

    const [buffer] = await object.download()
    const isPdf = file.endsWith('.pdf')

    const headers = new Headers()
    headers.set('Content-Type', isPdf ? 'application/pdf' : 'text/html; charset=utf-8')
    // Cache at the browser + CDN; guides change rarely.
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    if (isPdf) {
      headers.set('Content-Disposition', `attachment; filename="Tikem-${file}"`)
    } else {
      // Contain the guide HTML: sandbox gives it a unique origin so a
      // compromised or future user-supplied guide can't read tikem.co cookies
      // or storage. allow-scripts keeps the scroll/reveal choreography;
      // allow-popups lets outbound links open. The guides are self-contained
      // (inline JS, data-URI assets), so nothing else is needed.
      headers.set('Content-Security-Policy', 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox')
    }

    return new Response(new Uint8Array(buffer), { status: 200, headers })
  } catch (err) {
    console.error('Failed to serve guide', file, err)
    return new Response('Not found', { status: 404 })
  }
}
