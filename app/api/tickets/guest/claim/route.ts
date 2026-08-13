// "Keep your tickets in the app": move a guest order's tickets onto a real account.
//
// Two credentials are required together, and neither alone is enough:
//   • a signed-in session — the account the tickets are moving TO;
//   • the guest order's signed retrieval token — proof the caller is the buyer.
// So a signed-in stranger cannot absorb somebody else's order, and holding a token
// without an account changes nothing (the link already renders the tickets anyway).

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getGuestOrderByToken, markGuestOrderClaimed } from '@/lib/guest/identity'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to add these tickets.' }, { status: 401 })
    }

    const { token } = await request.json().catch(() => ({ token: '' }))
    const order = await getGuestOrderByToken(String(token || ''))
    if (!order) {
      return NextResponse.json({ error: 'This ticket link is not valid.' }, { status: 404 })
    }

    if (order.claimedByUid && order.claimedByUid !== user.id) {
      // Already attached to a different account — do not silently move it again.
      return NextResponse.json(
        { error: 'These tickets are already in another Tikèm account.' },
        { status: 409 }
      )
    }

    // Re-point each ticket at the account. `attendee_id` is what /tickets queries and
    // what the scanner displays, so this is the whole move. The guest contact details
    // are LEFT ON the ticket on purpose: a refund or support request that arrives by
    // the email or phone used at checkout must still find this order afterwards.
    const claimedAt = new Date().toISOString()
    const results = await Promise.all(
      order.ticketIds.map(async (ticketId) => {
        try {
          const ref = adminDb.collection('tickets').doc(ticketId)
          const snap = await ref.get()
          if (!snap.exists) return false

          // Only tickets that still belong to THIS guest order may be moved.
          const data = snap.data() as any
          if (String(data?.attendee_id || '') !== order.guestId) return false

          await ref.set(
            {
              attendee_id: user.id,
              user_id: user.id,
              claimed_from_guest_id: order.guestId,
              claimed_at: claimedAt,
              updated_at: claimedAt,
            },
            { merge: true }
          )
          return true
        } catch (err) {
          console.error('[guest-claim] failed to move ticket', { ticketId, message: (err as any)?.message })
          return false
        }
      })
    )

    const moved = results.filter(Boolean).length
    await markGuestOrderClaimed(order.orderKey, user.id)

    return NextResponse.json({ success: true, moved, total: order.ticketIds.length })
  } catch (error: any) {
    console.error('[guest-claim] error', error)
    return NextResponse.json(
      { error: error?.message || 'Could not add these tickets to your account.' },
      { status: 500 }
    )
  }
}
