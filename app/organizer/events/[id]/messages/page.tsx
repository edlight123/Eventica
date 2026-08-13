/**
 * /organizer/events/[id]/messages
 *
 * The destination the "New message about …" notification has been deep-linking
 * to since attendee messaging shipped. Threads are loaded server-side with the
 * Admin SDK — `organizer_messages` replies are deliberately unreadable by
 * clients, so there is no Firestore listener here by design.
 */
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { notFound, redirect } from 'next/navigation'
import { listThreadsForOrganizer, MAX_REPLY_LENGTH } from '@/lib/organizer-messages'
import MessagesClient from './MessagesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EventMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const { user, error } = await requireAuth('organizer')

  if (error || !user) {
    redirect(`/auth/login?redirect=/organizer/events/${eventId}/messages`)
  }

  const eventDoc = await adminDb.collection('events').doc(eventId).get()
  if (!eventDoc.exists) notFound()

  const eventData = eventDoc.data() as { organizer_id?: string; title?: string }
  if (eventData?.organizer_id !== user.id) notFound()

  const threads = await listThreadsForOrganizer({ organizerId: user.id, eventId })

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <MessagesClient
        eventTitle={eventData.title ?? ''}
        threads={threads}
        maxReplyLength={MAX_REPLY_LENGTH}
      />
    </div>
  )
}
