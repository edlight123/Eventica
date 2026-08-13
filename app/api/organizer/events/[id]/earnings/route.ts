import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getEventEarnings } from '@/lib/earnings'
import { previewRelease } from '@/lib/payouts/withdrawal-gate'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'organizer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const eventDoc = await adminDb.collection('events').doc(id).get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data() as any
    if (eventData?.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
    }

    // Prefer stored earnings, but fall back to a derived view from tickets.
    // This prevents mobile from showing 0 forever when `event_earnings` isn't populated yet.
    const earnings = await getEventEarnings(id)
    if (!earnings) {
      return NextResponse.json({ earnings: null }, { status: 200 })
    }

    /**
     * WHEN the money is actually due, not just whether settlement has elapsed.
     *
     * "Available to withdraw" used to be derived from settlementStatus alone, so
     * an organizer could read a figure that the release ladder then refused the
     * instant they tapped withdraw. This asks the ladder the same question the
     * withdrawal routes ask, and hands the answer to the screen.
     *
     * previewRelease writes nothing — the gate files review-queue rows, and
     * opening an earnings screen must never queue work for an admin. A failure
     * here degrades to the old behaviour rather than breaking the page: money
     * figures still render, they just carry no release date.
     */
    let release = null
    try {
      const availableMinor = Math.max(
        0,
        Number((earnings as any)?.netAmount || 0) - Number((earnings as any)?.withdrawnAmount || 0)
      )
      release = await previewRelease({
        eventId: id,
        organizerId: user.id,
        eventData,
        grossMinor: Number((earnings as any)?.grossSales || 0),
        currency: String((earnings as any)?.currency || 'HTG'),
        availableMinor,
      })
    } catch (e) {
      console.error('earnings release preview failed', (e as any)?.message)
    }

    return NextResponse.json(
      {
        earnings: {
          // Keep legacy fields for backwards compatibility.
          availableToWithdraw: Number((earnings as any)?.availableToWithdraw || 0),
          totalEarned: Number((earnings as any)?.grossSales ?? (earnings as any)?.totalEarned ?? 0),

          // Canonical earnings fields (cents)
          grossSales: Number((earnings as any)?.grossSales || 0),
          netAmount: Number((earnings as any)?.netAmount || 0),
          ticketsSold: Number((earnings as any)?.ticketsSold || 0),
          withdrawnAmount: Number((earnings as any)?.withdrawnAmount || 0),

          currency: String((earnings as any)?.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG',
          settlementStatus: (earnings as any)?.settlementStatus || 'pending',
          settlementReadyDate: (earnings as any)?.settlementReadyDate || null,
          lastCalculatedAt: (earnings as any)?.lastCalculatedAt || null,
          dataSource: (earnings as any)?.dataSource || 'unknown',

          // The release ladder's verdict. Null when it could not be computed —
          // clients must treat that as "unknown", never as "released".
          release,
        },
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('GET /api/organizer/events/[id]/earnings error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
