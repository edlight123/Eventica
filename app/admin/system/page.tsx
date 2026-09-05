import { requireDevTools } from '@/lib/auth'
import { ConsoleCaption, ConsolePage, ConsoleTabs } from '@/components/admin/console'
import { PlatformSettingsForm } from './PlatformSettingsForm'
import { systemTabs } from './tabs'

// The admin layout is already force-dynamic (it reads the session cookie), and
// this page reads it too — for the dev-tools tab — so say so rather than
// carrying a revalidate window that could never apply.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'System | Admin | Tikèm',
  description: 'Platform fees, settlement windows and developer tools',
}

/**
 * The System hub index: platform settings.
 *
 * Settings is the index rather than dev tools because it is the screen every
 * admin can use — dev tools is gated, and a hub whose front door most people
 * bounce off is not a front door.
 */
export default async function AdminSystemPage() {
  // Same call the dev subtree's layout makes, so the tab and the route agree.
  const { error: devToolsError } = await requireDevTools()

  return (
    <ConsolePage title="System">
      <ConsoleTabs tabs={systemTabs(!devToolsError)} />
      <ConsoleCaption>
        What the platform charges and how long it holds money, per region. Changes take effect on
        the next ticket sold, not retroactively.
      </ConsoleCaption>

      <PlatformSettingsForm />
    </ConsolePage>
  )
}
