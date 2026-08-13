import DisputesLog from './DisputesLog'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

export const metadata = {
  title: 'Chargebacks | Admin | Tikèm',
  description: 'Card disputes filed against ticket sales',
}

// Read live in the client component; keep the shell dynamic-safe.
export const dynamic = 'force-dynamic'

export default async function AdminDisputesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminBreadcrumbs
        items={[
          { label: 'Payout Operations', href: '/admin/disbursements' },
          { label: 'Chargebacks' },
        ]}
      />

      <EditorialHeader
        eyebrow="Risk"
        title="Chargebacks"
        subtitle="Every card dispute filed against a ticket sale. Tikèm is the merchant of record on the Stripe rail, so each of these has already been debited from the platform balance — and each one has a deadline we answer, not the organizer."
        tone="dark"
        className="mb-8"
      />

      <DisputesLog />
    </div>
  )
}
