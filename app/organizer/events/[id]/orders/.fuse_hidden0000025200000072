import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import { loadTicketDocsForEvent } from '@/lib/tickets/loadTicketsForEvent'
import { normalizeCurrency } from '@/lib/money'
import { formatMoneyFromCents } from '@/lib/money'
import { ShoppingBag } from 'lucide-react'
import EventOrdersClient from './EventOrdersClient'

export const revalidate = 0

function serializeTs(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof (v as any).toDate === 'function') return (v as any).toDate().toISOString()
  return String(v)
}

export default async function EventOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const { user, error } = await requireAuth()
  if (error || !user) redirect(`/auth/login?redirect=/organizer/events/${eventId}/orders`)
  if (user.role !== 'organizer') redirect('/organizer')

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) notFound()
  const eventData = eventDoc.data()!
  if (eventData.organizer_id !== user.id && !user.isAdmin) notFound()

  const eventCurrency = normalizeCurrency(eventData.currency, 'HTG')

  const ticketDocs = await loadTicketDocsForEvent(eventId)

  // Batch fetch attendees
  const attendeeIds = Array.from(
    new Set(ticketDocs.map((doc) => doc.data().attendee_id).filter(Boolean))
  )
  const attendeesMap = new Map<string, { name: string; email: string }>()

  if (attendeeIds.length > 0) {
    const chunks: string[][] = []
    for (let i = 0; i < attendeeIds.length; i += 30) {
      chunks.push(attendeeIds.slice(i, i + 30))
    }
    const snaps = await Promise.all(
      chunks.map((chunk) =>
        adminDb.collection('users').where('__name__', 'in', chunk).get()
      )
    )
    snaps.forEach((snap) => {
      snap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const d = doc.data()
        attendeesMap.set(doc.id, {
          name: d.full_name || d.name || d.email || 'Unknown',
          email: d.email || '',
        })
      })
    })
  }

  const orders = ticketDocs.map((doc) => {
    const d = doc.data()
    const attendeeId = String(d.attendee_id || '')
    const attendee = attendeesMap.get(attendeeId)
    const currency = normalizeCurrency(d.currency, eventCurrency)
    const cents = Math.round(Number(d.price_paid || 0) * 100)
    return {
      id: doc.id,
      attendeeName: attendee?.name || 'Unknown',
      attendeeEmail: attendee?.email || '',
      tierName: String(d.tier_name || 'General Admission'),
      amount: cents > 0 ? formatMoneyFromCents(cents, currency, 'en-US', { currencyDisplay: 'code' }) : 'Free',
      status: String(d.status || 'active'),
      purchasedAt: serializeTs(d.purchased_at),
      checkedInAt: serializeTs(d.checked_in_at),
    }
  })

  return <EventOrdersClient orders={orders} />
}
