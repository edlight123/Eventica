import { getUserCounts } from '@/lib/data/users'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import AdminUsersClient from './AdminUsersClient'

export const revalidate = 60

export default async function AdminUsersPage() {
  const counts = await getUserCounts()

  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Users', href: '/admin/users' }
        ]} 
      />
      <AdminUsersClient counts={counts} />
    </div>
  )
}