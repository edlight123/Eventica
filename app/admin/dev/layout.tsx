import { requireDevTools } from '@/lib/auth'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Gates the entire /admin/dev/* tree (debug DB, test-data, seed-events).
 * Production: super_admin only. Non-prod (or ENABLE_DEV_TOOLS=true): any admin.
 */
export default async function AdminDevLayout({ children }: { children: React.ReactNode }) {
  const { error } = await requireDevTools()
  if (error) {
    const user = await getCurrentUser()
    return <AdminAccessDenied userEmail={user?.email} />
  }
  return <>{children}</>
}
