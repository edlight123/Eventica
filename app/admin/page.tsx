import { getRecentAdminActivities } from '@/lib/admin/audit-log'
import { getNeedsYouItems } from '@/lib/admin/needs-you-data'
import { AdminPage } from '@/components/admin/AdminPage'
import { ClearedToday } from '@/components/admin/ClearedToday'
import { NeedsYouClient } from './NeedsYouClient'

export const revalidate = 30

/**
 * The admin landing: one oldest-first list of everything waiting on a decision.
 *
 * Deliberately NOT a dashboard. It used to show totals — users, events, 7-day
 * GMV — which answer "how big is the platform", not "what do I do now". Totals
 * live at /admin/analytics, where a chart means something.
 */
export default async function AdminDashboard() {
  const [items, recentActivities] = await Promise.all([
    getNeedsYouItems(),
    getRecentAdminActivities(50),
  ])

  const description = items.length === 0 ? 'Every queue is clear' : `${items.length} waiting`

  return (
    <AdminPage title="Needs you" description={description}>
      <NeedsYouClient items={items} />
      <ClearedToday activities={recentActivities} />
    </AdminPage>
  )
}
