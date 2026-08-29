'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import { Search, MapPin, ArrowUpRight } from 'lucide-react'
import { getPosterTheme } from '@/lib/posterGradient'
import { getCitiesForCountry } from '@/lib/filters/config'

interface HeroSectionProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  /** Upcoming events used to power the instant autocomplete dropdown. */
  events?: any[]
  brandTagline?: string
}

/**
 * The diaspora, written into the identity: real filters, not decoration.
 * Haiti cities filter within HT; the four diaspora cities also switch the
 * page's country scope (see app/page.tsx DIASPORA_CITY_COUNTRY).
 */
const CITY_CHIPS = ['Port-au-Prince', 'Cap-Haïtien', 'Miami', 'New York', 'Montréal', 'Paris']

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

  // Featured-event carousel. Auto-advances gently; a dot tap takes over, and
  // reduced-motion visitors get a still hero.
  const [slide, setSlide] = useState(0)
  const featuredCount = Math.min(5, Array.isArray(featuredEvents) ? featuredEvents.filter(Boolean).length : 0)
  useEffect(() => {
    if (featuredCount < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSlide((s) => (s + 1) % featuredCount), 6500)
    return () => clearInterval(id)
  }, [featuredCount])

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
        {/* The white pill is THE primary action — teal never fills a CTA. */}
        <button
          type="submit"
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90 active:scale-[0.98]"
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

  // FEATURED-EVENT HERO (posh /explore pattern, owner-picked 2026-08-28): the
  // top event IS the hero — its poster, its details, a white Get Tickets —
  // bathed in the poster's own blurred ambient color. Rotates through the
  // featured list; the tagline shrinks to the serif eyebrow above the title.
  const featured = (Array.isArray(featuredEvents) ? featuredEvents.filter(Boolean) : []).slice(0, 5)
  const hero = featured[slide % Math.max(1, featured.length)]

  const heroDate = (() => {
    if (!hero?.date) return ''
    const d = new Date(hero.date)
    return isValid(d) ? format(d, 'EEE, MMM d · h:mm a') : ''
  })()

  const chips = (
    <div className="reveal reveal-3 mt-5 flex flex-wrap items-center gap-2">
      {CITY_CHIPS.map((c) => (
        <Link
          key={c}
          href={`/?city=${encodeURIComponent(c)}`}
          className="rounded-[10px] border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13px] font-normal text-white/70 transition-colors duration-200 hover:border-white/25 hover:text-white"
        >
          {c}
        </Link>
      ))}
    </div>
  )

  // No events yet (a brand-new market): the clean type hero carries the page.
  if (!hero) {
    return (
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#0a0a0a]" />
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
          {/* `!` beats the legacy `.mobile-typography h1` descendant rule on body. */}
          <h1 className="reveal reveal-1 font-grotesk !text-[clamp(40px,7vw,84px)] font-bold uppercase !leading-[0.98] tracking-[-0.02em] text-white">
            {t('events.hero_line1', { defaultValue: 'Where Haiti' })}
            <br />
            {t('events.hero_line2', { defaultValue: 'goes out.' })}
          </h1>
          <p className="reveal reveal-2 mt-5 max-w-xl font-display lowercase italic text-[clamp(17px,2.2vw,22px)] leading-snug text-white/70">
            {t('events.hero_subtitle')}
          </p>
          {SearchForm}
          {chips}
        </div>
      </section>
    )
  }

  const heroHasImage = hero.imageUrl && hero.imageUrl !== '/placeholder-event.jpg'
  const heroTheme = getPosterTheme(hero.id || hero.title, hero.category)

  return (
    // `isolate` scopes the -z-10 backdrop to THIS section — without it the
    // layer paints behind the page wrapper's own background and disappears.
    <section className="relative isolate overflow-hidden border-b border-white/10">
      {/* The poster's own color, blurred into the room. */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
        {heroHasImage ? (
          <Image
            key={hero.id}
            src={hero.imageUrl}
            alt=""
            fill
            sizes="100vw"
            quality={30}
            className="scale-125 object-cover opacity-60 blur-3xl"
          />
        ) : (
          <div className="absolute inset-0 opacity-70 blur-2xl" style={{ backgroundImage: heroTheme.bg }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/55 to-[#0a0a0a]" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8">
        <div className="grid items-center gap-8 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12">
          {/* Poster */}
          <Link
            href={`/events/${hero.id}`}
            prefetch
            aria-label={hero.title}
            className="reveal reveal-1 group mx-auto block w-full max-w-[260px] md:mx-0 md:max-w-none"
          >
            <div
              className="relative aspect-[4/5] overflow-hidden rounded shadow-[0_18px_60px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition-transform duration-200 ease-out group-hover:-translate-y-1 motion-reduce:transition-none"
              style={heroHasImage ? undefined : { backgroundImage: heroTheme.bg }}
            >
              {heroHasImage ? (
                <Image
                  key={`poster-${hero.id}`}
                  src={hero.imageUrl}
                  alt={hero.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 260px, 320px"
                  quality={82}
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <span className="font-grotesk text-2xl font-bold leading-[1.05] text-white line-clamp-4">
                    {hero.title}
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* Details */}
          <div className="text-center md:text-left">
            {/* The tagline lives on as the serif eyebrow — the site's h1. */}
            <h1 className="reveal reveal-1 font-display lowercase italic !text-[17px] !leading-none text-white/60">
              {t('events.hero_tagline', { defaultValue: 'where Haiti goes out.' })}
            </h1>
            <Link href={`/events/${hero.id}`} className="block">
              <h2 className="reveal reveal-2 mt-3 font-grotesk font-bold !text-[clamp(30px,4.6vw,56px)] !leading-[1.02] tracking-[-0.02em] text-white line-clamp-2">
                {hero.title}
              </h2>
            </Link>
            {hero.location && (
              <p className="reveal reveal-2 mt-3 text-[15px] font-medium text-white/85">{hero.location}</p>
            )}
            {heroDate && <p className="reveal reveal-2 mt-1 text-[14px] text-white/60">{heroDate}</p>}

            <div className="reveal reveal-3 mt-6 flex items-center justify-center gap-4 md:justify-start">
              <Link
                href={`/events/${hero.id}`}
                className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
              >
                {t('events.get_tickets', { defaultValue: 'Get tickets' })}
              </Link>

              {featured.length > 1 && (
                <div className="flex items-center gap-2" role="tablist" aria-label={t('events.featured', { defaultValue: 'Featured' })}>
                  {featured.map((ev, i) => (
                    <button
                      key={ev.id || i}
                      type="button"
                      role="tab"
                      aria-selected={i === slide % featured.length}
                      aria-label={`${i + 1} / ${featured.length}`}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === slide % featured.length ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 max-w-2xl">
          {SearchForm}
          {chips}
        </div>
      </div>
    </section>
  )
}
