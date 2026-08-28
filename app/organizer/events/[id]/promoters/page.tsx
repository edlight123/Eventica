import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { adminDb } from '@/lib/firebase/admin'
import PromotersClient from './PromotersClient'

export const dynamic = 'force-dynamic'

export default async function EventPromotersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const { user, error } = await requireAuth()
  if (error || !user) redirect(`/auth/login?redirect=/organizer/events/${eventId}/promoters`)
  if (user.role !== 'organizer') redirect('/organizer')

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) notFound()
  const eventData = eventDoc.data()!
  if (eventData.organizer_id !== user.id && !user.isAdmin) notFound()

  return (
    <PromotersClient
      eventId={eventId}
      eventTitle={String(eventData.title || '')}
      eventCurrency={String(eventData.currency || 'HTG').toUpperCase()}
    />
  )
}
