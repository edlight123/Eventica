import { getEndedEventsForDisbursement, getDisbursementStats } from '@/lib/admin/disbursement-tracking'
import { AdminDisbursementDashboard } from '@/components/admin/AdminDisbursementDashboard'
import WithdrawalsView from '@/app/admin/withdrawals/WithdrawalsView'
import { PayoutOperationsClient } from '@/components/admin/PayoutOperationsClient'
import { adminDb } from '@/lib/firebase/admin'
import AdminPayoutQueue from '@/app/admin/payouts/AdminPayoutQueue'

export const metadata = {
  title: 'Payout Operations | Admin | Eventica',
  description: 'Manage event disbursements, pending requests, and withdrawals',
}

export const revalidate = 60

async function getPendingPayouts() {
  try {
    const payoutsSnapshot = await adminDb
      .collectionGroup('payouts')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get()

    const payouts = await Promise.all(
      payoutsSnapshot.docs.map(async (doc: any) => {
        const data = doc.data()
        const organizerId = data.organizerId

        const organizerDoc = await adminDb.collection('users').doc(organizerId).get()
        const organizerData = organizerDoc.data()

        const configDoc = await adminDb
          .collection('organizers')
          .doc(organizerId)
          .collection('payoutConfig')
          .doc('main')
          .get()
        const config = configDoc.data()

        return {
          id: doc.id,
          ...data,
          organizer: {
            id: organizerId,
            name: organizerData?.full_name || 'Unknown',
            email: organizerData?.email || '',
          },
          payoutConfig: config || {},
        }
      })
    )

    return payouts
  } catch (error) {
    console.error('Error fetching pending payouts:', error)
    return []
  }
}

export default async function AdminDisbursementsPage() {
  const [endedEvents, stats, pendingPayouts] = await Promise.all([
    getEndedEventsForDisbursement(365, 500),
    getDisbursementStats(),
    getPendingPayouts()
  ])

  return (
    <PayoutOperationsClient
      pendingPayoutsContent={<AdminPayoutQueue initialPayouts={pendingPayouts} />}
      eventSettlementsContent={<AdminDisbursementDashboard endedEvents={endedEvents} stats={stats} />}
      withdrawalsContent={<WithdrawalsView embedded={true} showHeader={false} />}
    />
  )
}
