'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import { Search, MapPin, ArrowUpRight, CalendarDays } from 'lucide-react'
import { getPosterTheme } from '@/lib/posterGradient'
import { getCitiesForCountry } from '@/lib/filters/config'

interface HeroSectionProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  /** Upcoming events used to power the instant autocomplete dropdown. */
  events?: any[]
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
      className="absolute inset-0 flex items-center justify-center p-6 text-center [container-type:inline-size]"
      style={{ backgroundImage: theme.bg }}
    >
      <span className="font-display text-[clamp(20px,7cqw,28px)] leading-[0.98] text-white/95 drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-5 [hyphens:auto] [overflow-wrap:anywhere]">
        {ev.title}
      </span>
    </div>
  )
}

function formatFeaturedDate(date: string) {
  const d = new Date(date)
  return isValid(d) ? format(d, 'EEE, MMM d · h:mm a') : ''
}

/** Compact date used inside autocomplete rows; safe against invalid dates. */
function formatRowDate(date: any): string {
  if (!date) return ''
  const d = new Date(date)
  return isValid(d) ? format(d, 'MMM d') : ''
}

interface Suggestion {
  id: string
  title: string
  city: string
  image?: string | null
  category?: string
  date?: string
}

export default function HeroSection({ hasActiveFilters, featuredEvents, events }: HeroSectionProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')

  // Autocomplete state
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listboxId = useId()

  const cities = useMemo(() => getCitiesForCountry('HT'), [])
  const source = useMemo(() => (Array.isArray(events) ? events.filter(Boolean) : []), [events])
  const autocompleteEnabled = source.length > 0

  // Debounce the query (~150ms) before computing suggestions.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setDebouncedQuery('')
      return
    }
    const id = setTimeout(() => setDebouncedQuery(q.toLowerCase()), 150)
    return () => clearTimeout(id)
  }, [query])

  const suggestions: Suggestion[] = useMemo(() => {
    if (!autocompleteEnabled || debouncedQuery.length < 2) return []
    const q = debouncedQuery
    return source
      .filter((ev) => {
        const hay = [
          ev?.title,
          ev?.city,
          ev?.category,
          ev?.venue_name,
          ev?.organizer_name,
          ev?.organizer?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 6)
      .map((ev) => ({
        id: String(ev?.id ?? ''),
        title: String(ev?.title ?? 'Untitled'),
        city: String(ev?.city ?? ''),
        image: ev?.banner_image_url || ev?.image_url || null,
        category: ev?.category,
        date: ev?.start_datetime,
      }))
      .filter((s) => s.id)
  }, [source, debouncedQuery, autocompleteEnabled])

  // Keep the dropdown open state / highlight in sync with results.
  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true)
      setHighlight(-1)
    } else {
      setOpen(false)
    }
  }, [suggestions])

  useEffect(() => () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
  }, [])

  const submitSearch = () => {
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('search', q)
    if (city) params.set('city', city)
    const qs = params.toString()
    router.push(qs ? `/discover?${qs}` : '/discover')
  }

  const openEvent = (id: string) => {
    if (!id) return
    setOpen(false)
    router.push(`/events/${id}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    submitSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlight((h) => (h + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1))
        break
      case 'Enter':
        if (highlight >= 0 && highlight < suggestions.length) {
          e.preventDefault()
          openEvent(suggestions[highlight].id)
        }
        // otherwise let the form submit (search all)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  const activeOptionId =
    open && highlight >= 0 && highlight < suggestions.length
      ? `${listboxId}-opt-${highlight}`
      : undefined

  const SearchForm = (
    <div className="reveal reveal-3 relative mt-6 w-full max-w-2xl">
      <form
        onSubmit={handleSearch}
        className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-poster-sm backdrop-blur-md"
      >
        {/* Real city selector — default "All Haiti" (no filter) */}
        <label className="relative flex select-none items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-white/80 focus-within:text-white">
          <MapPin className="h-[15px] w-[15px] text-brand-400" />
          <span className="pointer-events-none">{city || t('common.all_locations', { defaultValue: 'All Haiti' })}</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label={t('filters.all_cities', { defaultValue: 'All cities' })}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-transparent opacity-0 outline-none"
          >
            <option value="" className="bg-[#0a0a0a] text-white">
              {t('common.all_locations', { defaultValue: 'All Haiti' })}
            </option>
            {cities.map((c) => (
              <option key={c} value={c} className="bg-[#0a0a0a] text-white">
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="flex min-w-[150px] flex-1 items-center gap-2 px-2">
          <Search className="h-[18px] w-[18px] shrink-0 text-white/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true)
            }}
            onBlur={() => {
              // Delay so a row click registers before the dropdown closes.
              blurTimer.current = setTimeout(() => setOpen(false), 150)
            }}
            placeholder={t('events.hero_search_placeholder', { defaultValue: 'Search events, organizers, cities…' })}
            className="w-full bg-transparent py-1 text-[15px] text-white outline-none placeholder:text-white/70"
            aria-label={t('common.search')}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 active:scale-[0.98]"
        >
          {t('common.search')}
        </button>
      </form>

      {/* Instant autocomplete dropdown */}
      {autocompleteEnabled && open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('common.search')}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 shadow-poster-sm backdrop-blur-md"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-[13px] text-white/50">
              {t('events.no_matches_hint', {
                defaultValue: 'No matches — press Enter to search all',
              })}
            </li>
          ) : (
            suggestions.map((s, i) => {
              const rowDate = formatRowDate(s.date)
              const meta = [rowDate, s.city].filter(Boolean).join(' · ')
              return (
                <li
                  key={s.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                >
                  <button
                    type="button"
                    // onMouseDown fires before input blur, so the click always registers.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      openEvent(s.id)
                    }}
                    onMouseEnter={() => setHighlight(i)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      i === highlight ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="block h-full w-full bg-gradient-to-br from-brand-500 to-brand-800" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-white">
                        {s.title}
                      </span>
                      {meta && (
                        <span className="mt-0.5 block truncate text-[12px] text-white/50">
                          {meta}
                        </span>
                      )}
                    </span>
                    {i === highlight && (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-brand-400" />
                    )}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
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
  const priceText = (price: any, currency?: string) =>
    Number(price) > 0 ? `${Number(price).toLocaleString()} ${currency || 'HTG'}` : t('common.free')

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

          <p className="reveal reveal-3 mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-lg">
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
                  className="absolute -right-5 top-7 hidden aspect-[4/5] w-[82%] rotate-6 overflow-hidden rounded-none shadow-poster-sm ring-1 ring-white/10 sm:block"
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
                <div className="poster-vignette relative aspect-[4/5] overflow-hidden rounded-none shadow-card-hover ring-1 ring-white/10 transition-transform duration-500 group-hover:-translate-y-1">
                  <PosterMedia ev={front} zoom />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/25" />

                  {/* Top row */}
                  <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
                    <span className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] tracking-[0.14em] text-brand-700 shadow-sm">
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
                    <h3 className="mt-1 font-display italic text-[26px] leading-[1.0] drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] line-clamp-2">
                      {front.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="label-mono inline-flex items-center gap-1.5 text-[11px] uppercase text-white/85">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatFeaturedDate(front.date)}
                      </span>
                      <span className="label-mono shrink-0 rounded-lg bg-white px-2.5 py-1 text-[12px] font-semibold text-black backdrop-blur-md">
                        {priceText(front.price, front.currency)}
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
