import { PayoutReleaseSettingsForm } from './PayoutReleaseSettingsForm'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { EditorialHeader } from '@/components/ui/EditorialHeader'

export const metadata = {
  title: 'Payout Release Settings | Admin | Tikèm',
  description: 'Holds, established tiers, reserve and review triggers for organizer payouts',
}

// Thresholds are read live in the client component; keep the shell dynamic-safe.
export const revalidate = 30

export default async function AdminPayoutReleaseSettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminBreadcrumbs
        items={[
          { label: 'Payout Operations', href: '/admin/disbursements' },
          { label: 'Release Settings' },
        ]}
      />

      <EditorialHeader
        eyebrow="Payouts"
        title="Payout Release Settings"
        subtitle="When ticket money is allowed to reach an organizer: holds, the established tier, the chargeback reserve, and what gets sent to review."
        tone="dark"
        className="mb-8"
      />

      <PayoutReleaseSettingsForm />
    </div>
  )
}
