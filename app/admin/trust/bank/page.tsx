import BankVerificationsClient from './BankVerificationsClient'
import { TRUST_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

export const metadata = {
  title: 'Bank verifications | Admin | Tikèm',
  description: 'Review organizer bank account verification documents',
}

/**
 * Bank verification review. Until now this queue had a page but no way in: the
 * rail's Verifications entry counted it and linked past it, and the standalone
 * /admin/bank-verifications route was a redirect into a tab of the identity
 * screen. It is a route of its own again, one click from Identity.
 */
export default function TrustBankPage() {
  return (
    <ConsolePage title="Trust & Safety">
      <ConsoleTabs tabs={TRUST_TABS} />
      <ConsoleCaption>
        Bank account documents organizers submitted to be paid, waiting on a decision.
      </ConsoleCaption>

      <BankVerificationsClient />
    </ConsolePage>
  )
}
