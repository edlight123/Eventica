import WithdrawalsView from './WithdrawalsView'
import { MONEY_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

export const metadata = {
  title: 'Withdrawal Management | Admin | Tikèm',
  description: 'Review and process organizer withdrawal requests',
}

// The list is read live in the client component; keep the shell dynamic-safe.
export const dynamic = 'force-dynamic'

/**
 * Withdrawals get a route of their own for the first time here. The old
 * /admin/withdrawals only redirected into a hash on the disbursements page, so
 * the rail's `withdrawals` source had nowhere to point; the hub tab is now the
 * real destination. The view renders header-less — ConsolePage and the tab
 * strip say where you are.
 */
export default async function AdminWithdrawalsPage() {
  return (
    <ConsolePage title="Money">
      <ConsoleTabs tabs={MONEY_TABS} />
      <ConsoleCaption>Review and process organizer withdrawal requests.</ConsoleCaption>

      <WithdrawalsView embedded showHeader={false} />
    </ConsolePage>
  )
}
