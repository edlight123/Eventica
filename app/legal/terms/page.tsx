import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { getContentPage, resolveLocale } from '@/lib/content-pages'
import ContentPageView from '@/components/ContentPageView'

export const dynamic = 'force-dynamic'

export default async function TermsOfServicePage() {
  // Locale: the language switcher's cookie wins (works for anonymous
  // visitors too), then the signed-in user's saved language, then English.
  const user = await getCurrentUser()
  const cookieLng = cookies().get('i18nextLng')?.value?.slice(0, 2)
  const locale = resolveLocale(cookieLng || (user as { language?: string } | null)?.language)
  const page = await getContentPage('terms', locale)

  return (
    <ContentPageView page={page} user={user} fallbackTitle="Terms of Service" locale={locale} />
  )
}
