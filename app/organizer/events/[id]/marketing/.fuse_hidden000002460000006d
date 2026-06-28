import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import { Megaphone } from 'lucide-react'
import EventMarketingClient from './EventMarketingClient'

export const revalidate = 30

export default async function EventMarketingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const { user, error } = await requireAuth()
  if (error || !user) redirect(`/auth/login?redirect=/organizer/events/${eventId}/marketing`)
  if (user.role !== 'organizer') redirect('/organizer')

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) notFound()
  const eventData = eventDoc.data()!
  if (eventData.organizer_id !== user.id && !user.isAdmin) notFound()

  // Fetch promo codes for this event
  let promoCodes: Array<{
    id: string
    code: string
    discount_type: string
    discount_value: number
    uses: number
    max_uses: number | null
    is_active: boolean
  }> = []

  try {
    const promoSnap = await adminDb
      .collection('promo_codes')
      .where('event_id', '==', eventId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .get()

    promoCodes = promoSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = doc.data()
      return {
        id: doc.id,
        code: String(d.code || ''),
        discount_type: String(d.discount_type || 'percentage'),
        discount_value: Number(d.discount_value || 0),
        uses: Number(d.uses || 0),
        max_uses: d.max_uses != null ? Number(d.max_uses) : null,
        is_active: Boolean(d.is_active ?? true),
      }
    })
  } catch {
    // promo codes collection may not exist yet
  }

  return (
    <EventMarketingClient
      eventId={eventId}
      eventTitle={String(eventData.title || '')}
      promoCodes={promoCodes}
    />
  )
}
