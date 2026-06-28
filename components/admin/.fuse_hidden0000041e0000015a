'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminCommandBar } from './AdminCommandBar'

/**
 * Client-side wrapper for admin layout that enables smooth navigation
 * This component prefetches routes and handles client-side transitions
 */
export function AdminClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Prefetch all admin routes for instant navigation
  useEffect(() => {
    const adminRoutes = [
      '/admin',
      '/admin/analytics',
      '/admin/users',
      '/admin/events',
      '/admin/organizers',
      '/admin/orders',
      '/admin/payouts',
      '/admin/disbursements',
      '/admin/withdrawals',
      '/admin/verifications',
      '/admin/bank-verifications',
      '/admin/settings',
      '/admin/security',
      '/admin/verify',
    ]

    adminRoutes.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <AdminSidebar />
      <div className="flex-1 lg:ml-64">
        <AdminCommandBar />
        <main className="p-4 lg:p-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
