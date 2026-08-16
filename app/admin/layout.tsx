import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminRealtimeProvider } from '@/lib/realtime/AdminRealtimeProvider'
import { ConfirmProvider } from '@/components/ui/ConfirmProvider'

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

  return (
    <AdminRealtimeProvider>
      <ConfirmProvider>
      {/* Control Room ground — the console's own world, not the site's black. */}
      <div className="flex min-h-screen bg-console-ground text-console-text">
        {/*
          The rail is sticky and full-height. Below md it is hidden and
          MobileNavWrapper carries navigation, so no admin route becomes
          unreachable on a phone. There is deliberately no icon-only tier: an
          icon rail cannot carry `count · oldest`, which is the whole point of
          the rail — losing it at one breakpoint would drop the console's
          organizing signal exactly where scanning is hardest.
        */}
        <div className="sticky top-0 hidden h-screen md:block">
          <AdminSidebar userEmail={user.email} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Global search & quick actions */}
          <AdminCommandBar />

          {/* Main Content */}
          <main className="min-w-0 flex-1 pb-mobile-nav">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNavWrapper user={user} isAdmin={true} />
      </div>
      </ConfirmProvider>
    </AdminRealtimeProvider>
  )
}
