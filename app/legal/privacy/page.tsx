import { getCurrentUser } from '@/lib/auth'
import { getContentPage, resolveLocale } from '@/lib/content-pages'
import ContentPageView from '@/components/ContentPageView'

export const dynamic = 'force-dynamic'

export default async function PrivacyPolicyPage() {
  // Locale comes from the signed-in user's saved language (server-readable);
  // anonymous visitors fall back to English.
  const user = await getCurrentUser()
  const locale = resolveLocale((user as { language?: string } | null)?.language)
  const page = await getContentPage('privacy', locale)

  return (
    <ContentPageView page={page} user={user} fallbackTitle="Privacy Policy" locale={locale} />
  )
}
