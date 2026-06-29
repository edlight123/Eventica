import { getUserCounts } from '@/lib/data/users'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 60

export default async function AdminUsersPage() {
  const counts = await getUserCounts()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      <AdminBreadcrumbs items={[{ label: 'Users', href: '/admin/users' }]} />
      <AdminUsersClient counts={counts} />
    </div>
  )
}