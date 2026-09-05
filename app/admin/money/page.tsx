import PayoutReviewQueue from './PayoutReviewQueue'
import { MONEY_TABS } from './tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

export const metadata = {
  title: 'Payout Review Queue | Admin | Tikèm',
  description: 'Payouts the release job flagged for a human decision',
}

// The queue is read live in the client component; keep the shell dynamic-safe.
export const dynamic = 'force-dynamic'

// The hub index is payout review: of the five money screens it is the one that
// is a decision someone is waiting on, so it is what the rail should land on.
export default async function AdminMoneyPage() {
  return (
    <ConsolePage title="Money">
      <ConsoleTabs tabs={MONEY_TABS} />
      <ConsoleCaption>
        Events the release job would not pay on its own. Each one is an organizer waiting on money,
        so decide and move on, approving lets the next run pay it, dismissing closes it without
        paying.
      </ConsoleCaption>

      <PayoutReviewQueue />
    </ConsolePage>
  )
}
