import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import SettingsContent from '@/components/organizer/settings/SettingsContent'
import { redirect } from 'next/navigation'

export const revalidate = 0

async function getOrganizerData(userId: string) {
  try {
    // Get organizer verification data
    const organizerDoc = await adminDb.collection('organizers').doc(userId).get()
    const organizerData = organizerDoc.exists ? organizerDoc.data() : null

    // Get payout config
    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(userId)
      .collection('payoutConfig')
      .doc('main')
      .get()
    
    const payoutConfig = payoutConfigDoc.exists ? payoutConfigDoc.data() : null

    return { organizerData, payoutConfig }
  } catch (error) {
    console.error('Error fetching organizer data:', error)
    return { organizerData: null, payoutConfig: null }
  }
}

export default async function OrganizerSettingsHubPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/organizer/settings')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/settings')
  }

  const { organizerData, payoutConfig } = await getOrganizerData(user.id)

  // Calculate verification status
  const verificationStatus = organizerData?.verification_status || user.verification_status || 'none'
  const isVerified = verificationStatus === 'approved'
  const isPending = verificationStatus === 'pending'

  // Calculate payout status
  const payoutStatus = payoutConfig?.status || 'not_setup'
  const hasPayoutSetup = payoutStatus !== 'not_setup'

  // Default location (can be from organizer preferences)
  const defaultLocation = organizerData?.default_city || 'Not set'

  return (
    <div className="bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <SettingsContent
          isVerified={isVerified}
          isPending={isPending}
          hasPayoutSetup={hasPayoutSetup}
          defaultLocation={defaultLocation}
          payoutStatusText={payoutStatus}
        />
      </div>    </div>
  )
}
