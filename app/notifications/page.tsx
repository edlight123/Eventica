import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { getUserNotificationsServer, getUnreadCountServer } from '@/lib/notifications/helpers'
import { NotificationsClient } from '@/components/NotificationsClient'

export const metadata = {
  title: 'Notifications | Eventica',
  description: 'View your notifications'
}

export const revalidate = 30 // Cache for 30 seconds

// Depends on auth cookies and per-user notifications.
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/notifications')
  }

  // Fetch notifications and unread count
  const [notifications, unreadCount] = await Promise.all([
    getUserNotificationsServer(user.id, 50),
    getUnreadCountServer(user.id)
  ])

  return (
    <>
      <Navbar user={user} isAdmin={isAdmin(user.email)} />
      <NotificationsClient 
        userId={user.id}
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
      <MobileNavWrapper user={user} isAdmin={isAdmin(user.email)} />
    </>
  )
}
