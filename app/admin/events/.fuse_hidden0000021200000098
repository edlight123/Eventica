import { getCurrentUser } from '@/lib/auth'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminEventsModerationConsole } from './AdminEventsModerationConsole'

export const revalidate = 60

export default async function AdminEventsPage() {
  const user = await getCurrentUser()
  
  return (
    <div className="p-6 space-y-6">
      <AdminBreadcrumbs 
        items={[
          { label: 'Events', href: '/admin/events' }
        ]} 
      />
      <AdminEventsModerationConsole userId={user!.id} userEmail={user!.email!} />
    </div>
  )
}
