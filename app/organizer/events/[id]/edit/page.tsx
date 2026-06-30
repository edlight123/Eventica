import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import EventComposer from '../../EventComposer'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { getOrganizerVerificationStatus } from '@/lib/organizerVerification'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect(`/auth/login?redirect=/organizer/events/${id}/edit`)
  }

  if (user.role !== 'organizer') {
    redirect(`/organizer?redirect=/organizer/events/${id}/edit`)
  }

  // Demo mode — render the composer with the in-memory demo event.
  if (isDemoMode()) {
    const event = DEMO_EVENTS.find((e) => e.id === id)
    if (!event) notFound()
    return <EventComposer userId={user.id} event={event} isVerified />
  }

  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .single()

  if (!event) notFound()

  // Load the canonical ticket tiers so the composer is prefilled with them.
  const { data: tierRows } = await supabase
    .from('ticket_tiers')
    .select('*')
    .eq('event_id', id)

  const initialTiers = (tierRows || [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t: any) => ({
      id: String(t.id ?? Math.random().toString(36).slice(2, 9)),
      name: t.name ?? '',
      price: String(t.price ?? 0),
      qty: String(t.total_quantity ?? t.quantity ?? 0),
    }))

  const verification = await getOrganizerVerificationStatus(user.id)

  return (
    <EventComposer
      userId={user.id}
      event={event}
      initialTiers={initialTiers.length > 0 ? initialTiers : undefined}
      isVerified={verification.isVerified}
      verificationStatus={verification.status || undefined}
    />
  )
}
