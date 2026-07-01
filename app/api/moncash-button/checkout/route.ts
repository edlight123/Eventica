import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { createMonCashButtonCheckoutFormPost, isMonCashButtonConfigured } from '@/lib/moncash-button'
import crypto from 'crypto'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!isMonCashButtonConfigured()) {
      return new NextResponse('MonCash Button is not configured', { status: 500 })
    }

    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId') || ''
    if (!orderId) {
      return new NextResponse('Missing orderId', { status: 400 })
    }

    const orderHash = crypto.createHash('sha256').update(orderId).digest('hex').slice(0, 10)
    console.info('[moncash_button] checkout: serving FORM POST page', { orderHash })

    const supabase = await createClient()
    const { data: pending, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error || !pending) {
      return new NextResponse('Pending transaction not found', { status: 404 })
    }

    if (pending.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { actionUrl, fields, meta } = createMonCashButtonCheckoutFormPost({
      amount: Number(pending.amount) || 0,
      orderId,
    })

    console.info('[moncash_button] checkout: form meta', {
      orderHash,
      mode: meta.mode,
      paddingMode: meta.paddingMode,
      ciphertextEncoding: meta.ciphertextEncoding,
      amountPlaintext: meta.amountPlaintext,
      businessKeySegmentKind: meta.businessKeySegmentKind,
      businessKeySegmentHash: meta.businessKeySegmentHash,
    })

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redirecting to MonCash…</title>
</head>
<body>
  <form id="moncashForm" method="post" action="${actionUrl}">
    <input type="hidden" name="amount" value="${fields.amount}" />
    <input type="hidden" name="orderId" value="${fields.orderId}" />
    <noscript>
      <p>JavaScript is required to continue. Click the button below.</p>
      <button type="submit">Continue to MonCash</button>
    </noscript>
  </form>
  <script>
    document.getElementById('moncashForm').submit();
  </script>
</body>
</html>`

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })

    // IMPORTANT: Set correlation cookies here as well.
    // This endpoint is a top-level navigation, so cookies are much more likely to stick
    // than when setting them on a fetch() JSON response.
    //
    // Use an __Host- cookie to avoid domain mismatch issues.
    response.cookies.set('moncash_button_order_id', orderId, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 60 * 60,
    })
    response.cookies.set('__Host-moncash_button_order_id', orderId, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 60 * 60,
    })

    // Also set a domain cookie to survive www <-> apex ReturnUrl mismatches.
    // (A __Host- cookie cannot set Domain.)
    const host = new URL(request.url).hostname
    const apex = host.startsWith('www.') ? host.slice(4) : host
    if (apex && apex.includes('.') && !/localhost/i.test(apex) && !/vercel\.app$/i.test(apex)) {
      response.cookies.set('moncash_button_order_id_domain', orderId, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
        domain: `.${apex}`,
        maxAge: 60 * 60,
      })
    }

    return response
  } catch (err: any) {
    console.error('MonCash Button checkout form error:', err)
    return new NextResponse('Failed to render MonCash checkout', { status: 500 })
  }
}
