import { getCurrentUser } from '@/lib/auth'
import { getContentPage } from '@/lib/content-pages'
import ContentPageView from '@/components/ContentPageView'

export const dynamic = 'force-dynamic'

export default async function TermsOfServicePage() {
  const [user, page] = await Promise.all([getCurrentUser(), getContentPage('terms')])

  return <ContentPageView page={page} user={user} fallbackTitle="Terms of Service" />
}
