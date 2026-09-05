import SecurityDashboardClient from './SecurityDashboardClient'
import { TRUST_TABS } from '../tabs'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'

/**
 * Suspicious-activity review. Breadcrumbs are gone from all three Trust &
 * Safety screens: with a hub title and a tab strip naming the section and the
 * screen, a crumb trail says the same thing a third time.
 */
export default async function SecurityDashboard() {
  return (
    <ConsolePage title="Trust & Safety">
      <ConsoleTabs tabs={TRUST_TABS} />
      <ConsoleCaption>
        Suspicious activity the platform flagged, and the admin search index behind it.
      </ConsoleCaption>

      <SecurityDashboardClient />
    </ConsolePage>
  )
}
