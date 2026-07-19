import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { createMonCashButtonCheckoutFormPost, isMonCashButtonConfigured } from '@/lib/moncash-button'
import { createMonCashGatewayPayment, isMonCashConfigured } from '@/lib/moncash'
import crypto from 'crypto'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

/**
 * Starts a mobile-money checkout.
 *
 * - MonCash: standard REST gateway flow — CreatePayment -> 303 redirect to the
 *   hosted MonCash payment page (/Moncash-business/Payment/Redirect). The customer
 *   pays on MonCash, then MonCash returns them to our ReturnUrl (handled by
 *   /api/moncash-button/return), which verifies via RetrieveOrderPayment.
 * - NatCash: unchanged form-POST "Hosted Page" flow.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId') || ''
    if (!orderId) {
      return new NextResponse('Missing orderId', { status: 400 })
    }

    const orderHash = crypto.createHash('sha256').update(orderId).digest('hex').slice(0, 10)

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

    const provider = String(pending.mobile_money_provider || pending.payment_method || 'moncash').toLowerCase()
    const amount = Number(pending.amount) || 0

    // Correlation cookies so the (cross-site) Return URL can map back to this order,
    // even if cookies are dropped on the round trip. Set on this top-level navigation.
    const setCorrelationCookies = (response: NextResponse) => {
      const cookieOpts = {
        httpOnly: true as const,
        sameSite: 'none' as const,
        secure: true as const,
        path: '/',
        maxAge: 60 * 60,
      }
      response.cookies.set('moncash_button_order_id', orderId, cookieOpts)
      response.cookies.set('__Host-moncash_button_order_id', orderId, cookieOpts)

      // Also set a domain cookie to survive www <-> apex ReturnUrl mismatches.
      // (A __Host- cookie cannot set Domain.)
      const host = new URL(request.url).hostname
      const apex = host.startsWith('www.') ? host.slice(4) : host
      if (apex && apex.includes('.') && !/localhost/i.test(apex) && !/vercel\.app$/i.test(apex)) {
        response.cookies.set('moncash_button_order_id_domain', orderId, { ...cookieOpts, domain: `.${apex}` })
      }
    }

    // --- MonCash: standard REST gateway flow (CreatePayment -> redirect) ---
    if (provider !== 'natcash') {
      if (!isMonCashConfigured()) {
        return new NextResponse('MonCash is not configured', { status: 500 })
      }

      const { redirectUrl, token } = await createMonCashGatewayPayment({ amount, orderId })
      console.info('[moncash_button] checkout: redirecting to MonCash gateway', { orderHash, amount })

      // Persist the gateway token so the Return handler can correlate back to this order
      // even if cookies are dropped on the cross-site round trip. (Best effort.)
      try {
        await supabase
          .from('pending_transactions')
          .update({ moncash_button_token: token })
          .eq('order_id', orderId)
      } catch {
        /* non-fatal */
      }

      const response = NextResponse.redirect(redirectUrl, 303)
      response.headers.set('Cache-Control', 'no-store')
      setCorrelationCookies(response)
      return response
    }

    // --- NatCash: unchanged form-POST "Hosted Page" flow ---
    if (!isMonCashButtonConfigured()) {
      return new NextResponse('MonCash Button is not configured', { status: 500 })
    }
    console.info('[moncash_button] checkout: serving FORM POST page (natcash)', { orderHash })

    const { actionUrl, fields, meta } = createMonCashButtonCheckoutFormPost({
      amount,
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
  <title>Redirecting to NatCash…</title>
</head>
<body>
  <form id="moncashForm" method="post" action="${actionUrl}">
    <input type="hidden" name="amount" value="${fields.amount}" />
    <input type="hidden" name="orderId" value="${fields.orderId}" />
    <noscript>
      <p>JavaScript is required to continue. Click the button below.</p>
      <button type="submit">Continue</button>
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
    setCorrelationCookies(response)
    return response
  } catch (err: any) {
    console.error('MonCash Button checkout error:', err)
    return new NextResponse('Failed to start checkout', { status: 500 })
  }
}
