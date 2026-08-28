// A promoter's own numbers, addressed by their signed stats token — no account
// needed, same discipline as guest ticket links: verify before any read, and
// return nothing that isn't theirs (no buyer names/emails, ever).

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getPromoterByStatsKey, verifyPromoterToken } from '@/lib/promoters'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const statsKey = verifyPromoterToken(url.searchParams.get('token'))
    if (!statsKey) {
      return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
    }

    const promoter = await getPromoterByStatsKey(statsKey)
    if (!promoter) {
      return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })
    }

    const eventDoc = await adminDb.collection('events').doc(String(promoter.event_id)).get()
    const event = eventDoc.exists ? (eventDoc.data() as any) : null

    const salesSnap = await adminDb
      .collection('promoter_sales')
      .where('promoter_id', '==', promoter.id)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    const sales = salesSnap.docs.map((d: any) => {
      const s = d.data()
      return {
        quantity: Number(s.quantity) || 0,
        grossCents: Number(s.order_gross_cents) || 0,
        commissionCents: Number(s.commission_cents) || 0,
        currency: s.currency || promoter.currency || 'HTG',
        paymentMethod: s.payment_method || 'unknown',
        status: s.status || 'accrued',
        createdAt: s.created_at || null,
      }
    })

    return NextResponse.json({
      promoter: {
        name: promoter.name,
        code: promoter.code,
        isActive: promoter.is_active !== false,
        claimed: Boolean(promoter.claimed_by_uid),
        ticketsSold: Number(promoter.tickets_sold) || 0,
        ordersCount: Number(promoter.orders_count) || 0,
        grossCents: Number(promoter.gross_cents) || 0,
        commissionCents: Number(promoter.commission_cents) || 0,
        commissionType:
          promoter.commission_type === 'flat_per_ticket' ? 'flat_per_ticket' : 'percentage',
        commissionValue: Number(promoter.commission_value) || 0,
        currency: promoter.currency || 'HTG',
        shareUrl: `${url.origin}/events/${promoter.event_id}?ref=${encodeURIComponent(promoter.code)}`,
      },
      event: event
        ? {
            id: String(promoter.event_id),
            title: event.title || 'Event',
            startDatetime: event.start_datetime || null,
            venueName: event.venue_name || null,
            city: event.city || null,
            currency: event.currency || 'HTG',
          }
        : null,
      sales,
    })
  } catch (err: any) {
    console.error('[promoter-stats] failed', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
