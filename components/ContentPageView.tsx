import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import type { getCurrentUser } from '@/lib/auth'
import type { ContentPage, ContentBlock, Locale } from '@/lib/content-pages'

type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>

interface ContentPageViewProps {
  /** The page loaded from Firestore, or null when it is missing/unreadable. */
  page: ContentPage | null
  user: CurrentUser
  /** Title to show in the shell when `page` is null. */
  fallbackTitle?: string
  /** Locale the content was resolved for; used to localize the draft note. */
  locale?: Locale
}

/**
 * Localized "this translation is a draft" note. The app's runtime i18n is
 * client-only (react-i18next via localStorage), so a server component can't use
 * it here — we localize this single line inline from the resolved locale.
 */
const DRAFT_NOTE: Record<Locale, string> = {
  en: 'Draft translation — being reviewed. The English version is the reference.',
  fr: 'Traduction provisoire — en cours de révision. La version anglaise fait référence.',
  ht: 'Tradiksyon pwovizwa — n ap revize l. Vèsyon anglè a se referans lan.',
}

/** Render a single content block using the same markup the pages used inline. */
function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return block.level === 3 ? <h3>{block.text}</h3> : <h2>{block.text}</h2>
    case 'paragraph':
      return <p>{block.text}</p>
    case 'list':
      return block.ordered ? (
        <ol>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'callout':
      return (
        <div className="border-l-4 border-brand-500 p-6 mt-8">
          {block.title ? (
            <h3 className="text-lg font-semibold text-brand-300 mt-0">{block.title}</h3>
          ) : null}
          {block.items && block.items.length > 0 ? (
            <ul className="mb-0">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
          {block.text ? <p className="mb-0">{block.text}</p> : null}
        </div>
      )
    default:
      return null
  }
}

/**
 * Shared shell + renderer for legal/help content pages backed by
 * `content_pages/{slug}` in Firestore. Preserves the exact prose layout the
 * pages used inline: dark canvas, navbars, max-width container, an <h1> title
 * with a "Last updated" line, and the bordered `prose prose-teal` content box.
 */
export default function ContentPageView({
  page,
  user,
  fallbackTitle,
  locale = 'en',
}: ContentPageViewProps) {
  const title = page?.title || fallbackTitle || 'Content'

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 md:mb-4">
          {title}
        </h1>
        {page?.updated ? (
          <p className="text-[11px] sm:text-[13px] md:text-base text-white/65 mb-4 sm:mb-6 md:mb-8">
            Last updated: {page.updated}
          </p>
        ) : null}

        {page?.draft ? (
          <p className="text-[11px] sm:text-[13px] md:text-sm text-amber-300/90 mb-4 sm:mb-6">
            {DRAFT_NOTE[locale] ?? DRAFT_NOTE.en}
          </p>
        ) : null}

        <div className="bg-white/[0.03] rounded-xl shadow-sm border border-white/10 p-3 sm:p-4 md:p-6 lg:p-8 prose prose-sm sm:prose prose-teal max-w-none">
          {page && page.blocks.length > 0 ? (
            page.blocks.map((block, i) => <Block key={i} block={block} />)
          ) : (
            <p className="text-white/65">
              This content is currently unavailable. Please check back shortly or contact{' '}
              <a href="mailto:support@tikem.co">support@tikem.co</a>.
            </p>
          )}
        </div>
      </div>

      <MobileNavWrapper user={user} />
    </div>
  )
}
