import PayoutReviewQueue from './PayoutReviewQueue'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'

export const metadata = {
  title: 'Payout Review Queue | Admin | Tikèm',
  description: 'Payouts the release job flagged for a human decision',
}

// The queue is read live in the client component; keep the shell dynamic-safe.
export const dynamic = 'force-dynamic'

export default async function AdminPayoutReviewPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminBreadcrumbs
        items={[
          { label: 'Payout Operations', href: '/admin/disbursements' },
          { label: 'Review Queue' },
        ]}
      />

      <div className="mb-8">
        <h1 className="label-mono text-[15px] font-bold uppercase tracking-[0.14em] text-console-text">
          Payout Review Queue
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-console-mut">
          Events the release job would not pay on its own. Each one is an organizer waiting on
          money, so decide and move on, approving lets the next run pay it, dismissing closes it
          without paying.
        </p>
      </div>

      <PayoutReviewQueue />
    </div>
  )
}
