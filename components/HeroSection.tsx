'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import { Search, MapPin, ChevronDown, ArrowUpRight, CalendarDays } from 'lucide-react'
import { getPosterTheme } from '@/lib/posterGradient'

interface HeroSectionProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  brandTagline?: string
}

/** Full-bleed poster media for the featured hero card (image, or teal gradient fallback). */
function PosterMedia({ ev, zoom = false }: { ev: any; zoom?: boolean }) {
  const hasImage = ev.imageUrl && ev.imageUrl !== '/placeholder-event.jpg'
  if (hasImage) {
    return (
      <Image
        src={ev.imageUrl}
        alt={ev.title}
        fill
        priority
        quality={82}
        sizes="(max-width: 1024px) 360px, 400px"
        className={`object-cover ${zoom ? 'transition-transform duration-[1.2s] ease-out group-hover:scale-[1.07]' : ''}`}
      />
    )
  }
  const theme = getPosterTheme(ev.id || ev.title, ev.category)
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-6 text-center"
      style={{ backgroundImage: theme.bg }}
    >
      <span className="font-display text-[28px] leading-[0.98] text-white/95 drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-5">
        {ev.title}
      </span>
    </div>
  )
}

function formatFeaturedDate(date: string) {
  const d = new Date(date)
  return isValid(d) ? format(d, 'EEE, MMM d · h:mm a') : ''
}

export default function HeroSection({ hasActiveFilters, featuredEvents }: HeroSectionProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [query, setQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    if (query.trim()) params.set('q', query.trim())
    else params.delete('q')
    router.push(`/?${params.toString()}`)
  }

  const SearchForm = (
    <form
      onSubmit={handleSearch}
      className="reveal reveal-3 mt-6 flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl  p-2 shadow-poster-sm backdrop-blur-md"
    >
      <div className="flex select-none items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-white/80">
        <MapPin className="h-[15px] w-[15px] text-brand-400" />
        {t('common.all_locations', { defaultValue: 'All Haiti' })}
        <ChevronDown className="h-3.5 w-3.5 text-white/40" />
      </div>
      <div className="flex min-w-[150px] flex-1 items-center gap-2 px-2">
        <Search className="h-[18px] w-[18px] shrink-0 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search_placeholder')}
          className="w-full bg-transparent py-1 text-[15px] text-white outline-none placeholder:text-white/40"
          aria-label={t('common.search')}
        />
      </div>
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 active:scale-[0.98]"
      >
        {t('common.search')}
      </button>
    </form>
  )

  // Compact band when the visitor is actively filtering / searching
  if (hasActiveFilters) {
    return (
      <section className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#0a0a0a]" />
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-8 sm:px-6 lg:px-8">
          <p className="eyebrow text-brand-400">{t('events.hero_eyebrow')}</p>
          <h1 className="mt-2.5 font-display text-[clamp(30px,5vw,46px)] leading-[1.0] text-white">
            {t('events.find_perfect_event')}
          </h1>
          {SearchForm}
        </div>
      </section>
    )
  }

  const featured = Array.isArray(featuredEvents) ? featuredEvents.filter(Boolean) : []
  const front = featured[0]
  const back = featured[1]
  const priceText = (price: any) =>
    Number(price) > 0 ? `${Number(price).toLocaleString()} HTG` : t('common.free')

  return (
    <section className="relative overflow-hidden">
      {/* Dark canvas + soft brand glows */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#0a0a0a]" />
      <div aria-hidden className="absolute right-[-12%] top-[-30%] -z-10 h-[460px] w-[460px] rounded-full blur-[130px]" />
      <div aria-hidden className="absolute left-[-10%] top-[-8%] -z-10 h-[320px] w-[320px] rounded-full blur-[120px]" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:grid-cols-12 lg:gap-6 lg:px-8">
        {/* Copy + search */}
        <div className={front ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <p className="eyebrow reveal reveal-1 text-brand-400">{t('events.hero_eyebrow')}</p>

          <h1 className="reveal reveal-2 mt-3 max-w-[15ch] text-balance font-display text-[clamp(40px,6.2vw,68px)] leading-[0.95] text-white">
            {t('events.hero_headline')}{' '}
            <span className="italic text-brand-400">{t('events.hero_headline_accent')}</span>.
          </h1>

          <p className="reveal reveal-3 mt-4 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-lg">
            {t('events.hero_subtitle')}
          </p>

          {SearchForm}
        </div>

        {/* Featured poster stack */}
        {front && (
          <div className="reveal reveal-3 lg:col-span-5">
            <div className="relative mx-auto w-full max-w-[330px] sm:max-w-[360px]">
              {back && (
                <div
                  aria-hidden
                  className="absolute -right-5 top-7 hidden aspect-[4/5] w-[82%] rotate-6 overflow-hidden rounded-3xl shadow-poster-sm ring-1 ring-white/10 sm:block"
                >
                  <PosterMedia ev={back} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                </div>
              )}

              <Link
                href={`/events/${front.id}`}
                prefetch
                aria-label={front.title}
                className="group relative block"
              >
                <div className="poster-vignette relative aspect-[4/5] overflow-hidden rounded-3xl shadow-card-hover ring-1 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1">
                  <PosterMedia ev={front} zoom />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />

                  {/* Top row */}
                  <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
                    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] tracking-[0.14em] text-brand-300 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                      {t('events.featured', { defaultValue: 'Featured' })}
                    </span>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md transition-transform duration-200 group-hover:rotate-45">
                      <ArrowUpRight className="h-[18px] w-[18px]" />
                    </span>
                  </div>

                  {/* Bottom meta */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white">
                    {front.category && (
                      <span className="eyebrow text-[10px] tracking-[0.16em] text-white/70">
                        {front.category}
                      </span>
                    )}
                    <h3 className="mt-1 font-display text-[26px] leading-[1.0] drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] line-clamp-2">
                      {front.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/85">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatFeaturedDate(front.date)}
                      </span>
                      <span className="shrink-0 rounded-lg bg-white/95 px-2.5 py-1 text-[12px] font-bold text-white backdrop-blur-md">
                        {priceText(front.price)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
