import { getCurrentUser } from '@/lib/auth'
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs'
import { AdminEventsModerationConsole } from './AdminEventsModerationConsole'

export const revalidate = 60

export default async function AdminEventsPage() {
  const user = await getCurrentUser()
  
  return (
    <div className="min-h-screen bg-console-ground">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <AdminBreadcrumbs
          items={[
            { label: 'Events', href: '/admin/events' }
          ]}
        />
      </div>
      <AdminEventsModerationConsole userId={user!.id} userEmail={user!.email!} />
    </div>
  )
}
