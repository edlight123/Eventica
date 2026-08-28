// The promoter portal's data: every promoter record claimed into this account,
// joined with its event, plus lifetime totals per currency.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { promoterTokenFor } from '@/lib/promoters'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const snap = await adminDb
      .collection('event_promoters')
      .where('claimed_by_uid', '==', user.id)
      .orderBy('created_at', 'desc')
      .limit(100)
      .get()

    const origin = new URL(request.url).origin
    const totalsByCurrency: Record<string, { grossCents: number; commissionCents: number; ticketsSold: number }> = {}

    const records = await Promise.all(
      snap.docs.map(async (d: any) => {
        const p = d.data()
        const currency = String(p.currency || 'HTG').toUpperCase()
        const bucket = (totalsByCurrency[currency] ||= { grossCents: 0, commissionCents: 0, ticketsSold: 0 })
        bucket.grossCents += Number(p.gross_cents) || 0
        bucket.commissionCents += Number(p.commission_cents) || 0
        bucket.ticketsSold += Number(p.tickets_sold) || 0

        const eventDoc = await adminDb.collection('events').doc(String(p.event_id)).get()
        const event = eventDoc.exists ? (eventDoc.data() as any) : null
        return {
          id: d.id,
          eventId: String(p.event_id),
          eventTitle: event?.title || 'Event',
          eventStart: event?.start_datetime || null,
          organizerName: event?.organizer_name || null,
          code: p.code,
          isActive: p.is_active !== false,
          ticketsSold: Number(p.tickets_sold) || 0,
          ordersCount: Number(p.orders_count) || 0,
          grossCents: Number(p.gross_cents) || 0,
          commissionCents: Number(p.commission_cents) || 0,
          currency,
          shareUrl: `${origin}/events/${p.event_id}?ref=${encodeURIComponent(p.code)}`,
          statsUrl: `${origin}/promoter/${encodeURIComponent(promoterTokenFor(String(p.stats_key || '')))}`,
        }
      })
    )

    return NextResponse.json({ records, totalsByCurrency })
  } catch (err: any) {
    console.error('[promoter-portfolio] failed', err)
    return NextResponse.json({ error: 'Failed to load your promoter records' }, { status: 500 })
  }
}
