import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { OrganizerSidebar } from '@/components/organizer/OrganizerSidebar'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getOrganizerStats(organizerId: string) {
  try {
    // Get draft events count
    const draftEventsSnap = await adminDb.collection('events')
      .where('organizer_id', '==', organizerId)
      .where('status', '==', 'draft')
      .count()
      .get()

    const draftEvents = draftEventsSnap.data().count || 0

    // Get pending payout requests count
    const pendingPayoutsSnap = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .where('status', '==', 'pending')
      .count()
      .get()

    const pendingPayouts = pendingPayoutsSnap.data().count || 0

    return { draftEvents, pendingPayouts }
  } catch (error) {
    console.error('Error fetching organizer stats:', error)
    return { draftEvents: 0, pendingPayouts: 0 }
  }
}

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/organizer')
  }

  // If not an organizer, show upgrade prompt (handled by each page)
  if (user.role !== 'organizer') {
    return (
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />
        {children}
        <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
      </div>
    )
  }

  // Fetch organizer-specific stats for badges
  const { draftEvents, pendingPayouts } = await getOrganizerStats(user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      <div className="flex">
        {/* Sidebar - Desktop Only */}
        <OrganizerSidebar 
          draftEvents={draftEvents}
          pendingPayouts={pendingPayouts}
        />
        
        {/* Main Content */}
        <main className="flex-1 pb-mobile-nav">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
