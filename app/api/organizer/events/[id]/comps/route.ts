import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Issue complimentary (free) tickets for an event.
 * Owner/admin only. Creates `quantity` ticket docs with source='comp', price 0,
 * status 'valid', carrying recipient info + the chosen tier_id. Mirrors the
 * free-claim issuance shape so comps behave like any other valid ticket at scan.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = String(params?.id || '')
    if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (user.role !== 'organizer' && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Organizer access required' }, { status: 403 })
    }

    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    if (!eventDoc.exists) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    const event = eventDoc.data() as any

    // Organizers must own the event; admins may act on any event.
    if (user.role === 'organizer' && event?.organizer_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this event' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const recipientName = String(body?.recipient_name || '').trim()
    const recipientEmail = String(body?.recipient_email || '').trim()
    const note = String(body?.note || '').trim()
    let tierId = String(body?.tier_id || '').trim()
    const quantity = Math.max(1, Math.min(20, Math.round(Number(body?.quantity) || 1)))

    if (!recipientName) {
      return NextResponse.json({ error: 'Recipient name is required' }, { status: 400 })
    }

    // Validate the tier belongs to this event; fall back to the event's first tier.
    try {
      const tiersSnap = await adminDb.collection('ticket_tiers').where('event_id', '==', eventId).get()
      const tierDocs = tiersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      if (tierId && !tierDocs.some((t: any) => t.id === tierId)) tierId = ''
      if (!tierId && tierDocs.length > 0) {
        const sorted = [...tierDocs].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        tierId = String(sorted[0].id)
      }
    } catch {
      // Tier resolution is best-effort; issue with tier_id='' if it fails.
    }

    const created: string[] = []
    for (let i = 0; i < quantity; i++) {
      const ref = await adminDb.collection('tickets').add({
        event_id: eventId,
        event_title: event?.title || '',
        source: 'comp',
        status: 'valid',
        price_paid: 0,
        currency: event?.currency || 'HTG',
        tier_id: tierId,
        tier_name: 'Complimentary',
        recipient_name: recipientName,
        recipient_email: recipientEmail || null,
        comp_note: note || null,
        issued_by: user.id,
        quantity: 1,
        checked_in: false,
        checked_in_at: null,
        start_datetime: event?.start_datetime || null,
        end_datetime: event?.end_datetime || null,
        venue_name: event?.venue_name || null,
        city: event?.city || null,
        purchased_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
      })
      created.push(ref.id)
    }

    return NextResponse.json({ success: true, count: created.length, ticketIds: created })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to issue comps' }, { status: 500 })
  }
}
