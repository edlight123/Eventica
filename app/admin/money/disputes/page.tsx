import DisputesLog from './DisputesLog'
import { MONEY_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

export const metadata = {
  title: 'Chargebacks | Admin | Tikèm',
  description: 'Card disputes filed against ticket sales',
}

// Read live in the client component; keep the shell dynamic-safe.
export const dynamic = 'force-dynamic'

export default async function AdminDisputesPage() {
  return (
    <ConsolePage title="Money">
      <ConsoleTabs tabs={MONEY_TABS} />
      <ConsoleCaption>
        Every card dispute filed against a ticket sale. Tikèm is the merchant of record on the
        Stripe rail, so each of these has already been debited from the platform balance, and each
        one has a deadline we answer, not the organizer.
      </ConsoleCaption>

      <DisputesLog />
    </ConsolePage>
  )
}
