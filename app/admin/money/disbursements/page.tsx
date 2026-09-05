import { getEndedEventsForDisbursement, getDisbursementStats } from '@/lib/admin/disbursement-tracking'
import { AdminDisbursementDashboard } from '@/components/admin/AdminDisbursementDashboard'
import { DisbursementsTabs } from './DisbursementsTabs'
import { adminDb } from '@/lib/firebase/admin'
import AdminPayoutQueue from './AdminPayoutQueue'
import { MONEY_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

export const metadata = {
  title: 'Disbursements | Admin | Tikèm',
  description: 'Manage event disbursements and pending payout requests',
}

export const revalidate = 60

async function getPendingPayouts() {
  try {
    // Include approved (awaiting-payment) payouts alongside pending ones so an
    // approved payout stays visible in the queue until it is marked paid.
    const payoutsSnapshot = await adminDb
      .collectionGroup('payouts')
      .where('status', 'in', ['pending', 'approved'])
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
    <ConsolePage title="Money">
      <ConsoleTabs tabs={MONEY_TABS} />
      <ConsoleCaption>
        What each ended event owes its organizer, and the payout requests waiting on a decision.
      </ConsoleCaption>

      <DisbursementsTabs
        pendingPayoutsContent={<AdminPayoutQueue initialPayouts={pendingPayouts} />}
        eventSettlementsContent={<AdminDisbursementDashboard endedEvents={endedEvents} stats={stats} />}
      />
    </ConsolePage>
  )
}
