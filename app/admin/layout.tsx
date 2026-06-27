import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminTopNav } from '@/components/admin/AdminTopNav'
import { AdminRealtimeProvider } from '@/lib/realtime/AdminRealtimeProvider'

// force-dynamic is required because we use cookies() for authentication
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/admin')
  }

  const { error } = await requireAdmin()
  if (error) {
    return <AdminAccessDenied userEmail={user.email} />
  }

  const accountInitial = (user.full_name || user.email || 'A').trim().charAt(0).toUpperCase()

  return (
    <AdminRealtimeProvider>
      <div className="surface-dark min-h-screen">
        {/* Single admin top bar (replaces the global navbar + left sidebar) */}
        <AdminTopNav userEmail={user.email} accountInitial={accountInitial} />

        {/* Global search & quick actions */}
        <AdminCommandBar />

        {/* Main Content */}
        <main className="pb-mobile-nav">{children}</main>

        {/* Mobile Bottom Navigation */}
        <MobileNavWrapper user={user} isAdmin={true} />
      </div>
    </AdminRealtimeProvider>
  )
}
