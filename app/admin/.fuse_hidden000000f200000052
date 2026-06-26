import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { AdminCommandBar } from '@/components/admin/AdminCommandBar'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
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

  return (
    <AdminRealtimeProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} isAdmin={true} />
        
        {/* Command Bar - Global Search & Quick Actions */}
        <AdminCommandBar />
        
        <div className="flex">
          {/* Sidebar - Desktop Only - fetches its own badge data */}
          <AdminSidebar userEmail={user.email} />
          
          {/* Main Content */}
          <main className="flex-1 pb-mobile-nav">
            {children}
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileNavWrapper user={user} isAdmin={true} />
      </div>
    </AdminRealtimeProvider>
  )
}
