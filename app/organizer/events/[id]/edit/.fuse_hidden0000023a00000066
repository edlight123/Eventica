import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import EventFormPremium from '../../EventFormPremium'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { getOrganizerVerificationStatus } from '@/lib/organizerVerification'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect(`/auth/login?redirect=/organizer/events/${id}/edit`)
  }

  if (user.role !== 'organizer') {
    redirect(`/organizer?redirect=/organizer/events/${id}/edit`)
  }
  let event: any = null

  if (isDemoMode()) {
    // Find demo event
    event = DEMO_EVENTS.find(e => e.id === id)
    if (!event) {
      notFound()
    }
  } else {
    // Fetch from database
    const supabase = await createClient()
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('organizer_id', user.id)
      .single()

    event = eventData || null

    if (!event) {
      notFound()
    }

    const verification = await getOrganizerVerificationStatus(user.id)
    return (
      <EventFormPremium
        userId={user.id}
        event={event}
        isVerified={verification.isVerified}
        verificationStatus={verification.status || undefined}
      />
    )
  }

  return <EventFormPremium userId={user.id} event={event} />
}
