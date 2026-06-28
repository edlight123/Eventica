import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'
import NotificationPreferences from '@/components/settings/NotificationPreferences'

export const revalidate = 0

export const dynamic = 'force-dynamic'

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?redirect=/settings/notifications')

  async function refreshPage() {
    'use server'
    revalidatePath('/settings/notifications')
  }

  return (
    
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
            <p className="text-sm text-gray-600 mt-1">Choose which updates you receive and manage push subscription.</p>
          </div>
          <NotificationPreferences userId={user.id} />
        </div>
        <MobileNavWrapper user={user} />
      </div>
    
  )
}
