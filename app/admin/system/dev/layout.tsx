import { requireDevTools } from '@/lib/auth'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Gates the entire /admin/system/dev/* tree (debug DB, test-data, seed-events).
 * This is a real server-side check, not a rail that hides the link: the tools
 * stay unreachable by URL for an admin who is not allowed them.
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
