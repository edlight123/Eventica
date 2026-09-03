import DisputesLog from './DisputesLog'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'

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

      <header className="mb-8">
        <p className="label-mono text-[10px] uppercase tracking-[0.18em] text-console-faint">Risk</p>
        <h1 className="label-mono mt-1 text-[15px] font-bold uppercase tracking-[0.14em] text-console-text">
          Chargebacks
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] text-console-mut">
          Every card dispute filed against a ticket sale. Tikèm is the merchant of record on the Stripe rail, so each
          of these has already been debited from the platform balance, and each one has a deadline we answer, not the
          organizer.
        </p>
      </header>

      <DisputesLog />
    </div>
  )
}
