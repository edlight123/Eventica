import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { createMonCashGatewayPayment, isMonCashConfigured } from '@/lib/moncash'
import crypto from 'crypto'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

/**
 * Starts a MonCash Button checkout using the standard gateway flow:
 *   CreatePayment -> redirect the browser to the MonCash payment page.
 * The customer completes payment on MonCash, then MonCash returns them to our
 * ReturnUrl (handled by /api/moncash-button/return), which verifies the payment
 * via RetrieveOrderPayment and issues the ticket.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (!isMonCashConfigured()) {
      return new NextResponse('MonCash is not configured', { status: 500 })
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

    const amount = Number(pending.amount) || 0

    // Create the gateway payment and get the MonCash redirect URL.
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

    // Correlation cookies so the (cross-site) Return URL can map back to this order.
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'none' as const,
      secure: true,
      path: '/',
      maxAge: 60 * 60,
    }
    response.cookies.set('moncash_button_order_id', orderId, cookieOpts)
    response.cookies.set('__Host-moncash_button_order_id', orderId, cookieOpts)

    // Also set a domain cookie to survive www <-> apex ReturnUrl mismatches.
    const host = new URL(request.url).hostname
    const apex = host.startsWith('www.') ? host.slice(4) : host
    if (apex && apex.includes('.') && !/localhost/i.test(apex) && !/vercel\.app$/i.test(apex)) {
      response.cookies.set('moncash_button_order_id_domain', orderId, {
        ...cookieOpts,
        domain: `.${apex}`,
      })
    }

    return response
  } catch (err: any) {
    console.error('MonCash Button checkout error:', err)
    return new NextResponse('Failed to start MonCash checkout', { status: 500 })
  }
}
