import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Lightweight order-status endpoint used by the /purchase/processing page to poll for a
 * Sogepay payment outcome while the server-to-server callback finalizes fulfillment.
 *
 * Only the buyer who created the order (or an organizer/admin) can read it.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: pendingTx } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (!pendingTx) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 })
    }

    // Authorization: only the purchaser can poll their own order.
    if (String(pendingTx.user_id) !== String(user.id) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = String(pendingTx.status || 'pending')

    return NextResponse.json({
      status, // 'pending' | 'processing' | 'completed' | 'failed'
      ticketId: pendingTx.ticket_id || null,
      failureReason: pendingTx.failure_reason || null,
    })
  } catch (error: any) {
    console.error('[sogepay] status error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
