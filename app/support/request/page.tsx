import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { I18nProvider } from '@/components/I18nProvider'
import SupportRequestForm from './SupportRequestForm'

export const metadata = {
  title: 'Submit Support Request - Eventica',
  description: 'Submit a detailed support request and our team will get back to you within 24 hours.',
}

// Uses auth cookies for Navbar/user context.
export const dynamic = 'force-dynamic'

export default async function SupportRequestPage() {
  const user = await getCurrentUser()

  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />
        
        <SupportRequestForm />
        
        <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
      </div>
    </I18nProvider>
  )
}
