import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import SecurityDashboardClient from './SecurityDashboardClient'


export default async function SecurityDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <AdminBreadcrumbs
        items={[
          { label: 'Security', href: '/admin/security' }
        ]}
      />
      <SecurityDashboardClient />
    </div>
  )
}
