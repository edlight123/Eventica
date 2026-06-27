import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { notFound, redirect } from 'next/navigation'
import TrackingLinksClient from './TrackingLinksClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TrackingLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  const { user, error } = await requireAuth('organizer')

  if (error || !user) {
    redirect(`/auth/login?redirect=/organizer/events/${eventId}/tracking`)
  }

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) notFound()

  const eventData = eventDoc.data() as { organizer_id?: string; title?: string }
  if (eventData?.organizer_id !== user.id) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <TrackingLinksClient
        eventId={eventId}
        eventTitle={eventData.title ?? ''}
      />
    </div>
  )
}
