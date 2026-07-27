import { getCurrentUser } from '@/lib/auth'
import { getContentPage } from '@/lib/content-pages'
import ContentPageView from '@/components/ContentPageView'

export const dynamic = 'force-dynamic'

export default async function PrivacyPolicyPage() {
  const [user, page] = await Promise.all([getCurrentUser(), getContentPage('privacy')])

  return <ContentPageView page={page} user={user} fallbackTitle="Privacy Policy" />
}
