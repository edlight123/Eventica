import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { I18nProvider } from '@/components/I18nProvider'
import SupportContent from './SupportContent'

export const metadata = {
  title: 'Support - Eventica Help Center',
  description: 'Get help with tickets, events, and your organizer account. Browse FAQs and contact support.',
}

// Uses auth cookies for Navbar/user context.
export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const user = await getCurrentUser()

  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />
        
        <SupportContent />
        
        <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
      </div>
    </I18nProvider>
  )
}
