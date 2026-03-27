import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { adminDb } from '@/lib/firebase/admin'
import { getOrganizerEarningsSummary } from '@/lib/earnings'
import EarningsView from './EarningsView'

export const metadata = {
  title: 'Earnings | Eventica',
  description: 'View your event earnings and manage payouts',
}

export default async function EarningsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login?redirect=/organizer/earnings')
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    // Ensure this user is an organizer (attendees should go through the upgrade flow)
    try {
      const userDoc = await adminDb.collection('users').doc(organizerId).get()
      const role = userDoc.exists ? userDoc.data()?.role : null
      if (role !== 'organizer') {
        redirect('/organizer?redirect=/organizer/earnings')
      }
    } catch (error) {
      console.error('Error checking user role:', error)
      redirect('/organizer?redirect=/organizer/earnings')
    }

    const summary = await getOrganizerEarningsSummary(organizerId)

    const navbarUser = {
      id: organizerId,
      email: decodedClaims.email || '',
      full_name: decodedClaims.name || decodedClaims.email || '',
      role: 'organizer' as const,
    }

    return (
      <div className="bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <a href="/organizer" className="hover:text-gray-900">Organizer</a>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Earnings</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Earnings</h1>
            <p className="text-gray-600">Track your event revenue and settlement status.</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href="/organizer/earnings"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white"
              >
                Earnings
              </a>
              <a
                href="/organizer/settings/payouts"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
              >
                Payout profile
              </a>
              <a
                href="/organizer/settings/payouts/history"
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
              >
                Payout history
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EarningsView summary={summary} organizerId={organizerId} />
        </div>      </div>
    )
  } catch (error) {
    console.error('Error loading earnings:', error)
    redirect('/auth/login?redirect=/organizer/earnings')
  }
}
