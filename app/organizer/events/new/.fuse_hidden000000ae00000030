import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import QuickCreateEvent from './QuickCreateEvent'
import { createClient } from '@/lib/firebase-db/server'
import { getOrganizerVerificationStatus } from '@/lib/organizerVerification'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login?redirect=/organizer/events/new')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/events/new')
  }

  // Drafts are allowed for everyone; paid publishing is enforced later in the
  // full editor + API. Keep this first screen light and fast.
  await createClient() // Ensure server db is initialized for this request
  const verification = await getOrganizerVerificationStatus(user.id)

  return <QuickCreateEvent userId={user.id} isVerified={verification.isVerified} />
}
