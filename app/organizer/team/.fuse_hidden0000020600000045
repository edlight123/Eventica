import type { QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/organizer/ui'
import OrgTeamClient from './OrgTeamClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function OrganizerTeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/organizer/team')

  // Fetch org-level team members from organizers/{uid}/team
  let members: Array<{
    id: string
    email: string
    name: string
    role: string
    joined_at: string | null
  }> = []

  try {
    const teamSnap = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('team')
      .orderBy('joined_at', 'desc')
      .get()

    members = teamSnap.docs.map((doc: QueryDocumentSnapshot) => {
      const d = doc.data()
      return {
        id: doc.id,
        email: (d.email as string) || '',
        name: (d.name as string) || '',
        role: (d.role as string) || 'staff',
        joined_at: d.joined_at?.toDate?.()?.toISOString() ?? null,
      }
    })
  } catch {
    // Collection may not exist yet for new organizers; treat as empty
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
      <PageHeader
        eyebrow="Organization"
        title="Team"
        subtitle="Invite administrators and staff. Assign event-level check-in access from each event's Staff tab."
      />
      <div className="mt-8">
        <OrgTeamClient
          organizerId={user.id}
          ownerName={user.full_name || user.email || 'You'}
          ownerEmail={user.email || ''}
          members={members}
        />
      </div>
    </div>
  )
}
