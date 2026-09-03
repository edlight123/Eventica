'use client'

// The one quiet search field (posh calibration): icon, input, and the city
// tucked inside on the right — no boxed pin button, no visible Search button.
// Extracted from HeroSection (2026-08-30 refactor) so the statement hero and
// the filtered band share the same field and its instant autocomplete.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import { Search, ChevronDown, ArrowUpRight } from 'lucide-react'
import { getCitiesForCountry } from '@/lib/filters/config'

interface Suggestion {
  id: string
  title: string
  city: string
  image?: string | null
  category?: string
  date?: string
}

/** Compact date used inside autocomplete rows; safe against invalid dates. */
function formatRowDate(date: any): string {
  if (!date) return ''
  const d = new Date(date)
  return isValid(d) ? format(d, 'MMM d') : ''
}

export default function HeroSearch({
  events,
  compact = false,
}: {
  /** Upcoming events powering the instant autocomplete dropdown. */
  events?: any[]
  /** Working-state size (the filtered band); default is hero size. */
  compact?: boolean
}) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  // Seeded from the URL so the control REFLECTS the active filter. It used to
  // start empty always, so on /?city=Paris the field read "All Haiti" while
  // the page showed Paris — and there was no way to clear the filter from
  // here. That did not matter while the city chips existed beside it; it
  // matters now that this is the only city control on the page.
  const [city, setCity] = useState(() => searchParams?.get('city') || '')
  useEffect(() => {
    setCity(searchParams?.get('city') || '')
  }, [searchParams])

  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listboxId = useId()

  const cities = useMemo(() => getCitiesForCountry('HT'), [])
  /**
   * The four diaspora cities, kept as a separate group.
   *
   * These are not decoration: picking one also switches the homepage's country
   * scope (see DIASPORA_CITY_COUNTRY in app/page.tsx), so Miami shows US events
   * rather than an empty Haitian list. They were only ever reachable through
   * the chip row, so dropping the chips without adding them here would have
   * quietly removed the diaspora from the homepage.
   */
  const DIASPORA = useMemo(() => ['Miami', 'New York', 'Montréal', 'Paris'], [])
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

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    },
    []
  )

  /**
   * Picking a city acts immediately — a chip navigated on click, and this
   * select replaced the chips. Before, `onChange` only set state, so a reader
   * chose "Miami", nothing happened, and the control looked broken.
   *
   * City-only selections stay on the homepage at /?city=X, which is where the
   * chips pointed and the only place the diaspora country switch is applied.
   * Once there is a query, the pair belongs on /discover.
   */
  const applyCity = (next: string) => {
    setCity(next)
    const q = query.trim()
    if (q) {
      const params = new URLSearchParams({ search: q })
      if (next) params.set('city', next)
      router.push(`/discover?${params.toString()}`)
      return
    }
    router.push(next ? `/?city=${encodeURIComponent(next)}` : '/')
  }

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

  return (
    <div className={compact ? 'relative w-full max-w-xl' : 'relative w-full max-w-xl'}>
      <form
        onSubmit={handleSearch}
        className={`flex items-center gap-3 border border-white/10 bg-[#141414]/80 px-4 backdrop-blur-md transition-colors focus-within:border-white/25 ${
          compact ? 'h-11 rounded-xl' : 'h-[52px] rounded-2xl'
        }`}
      >
        <Search className="h-[17px] w-[17px] shrink-0 text-white/40" />
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
          placeholder={t('events.hero_search_placeholder', {
            defaultValue: 'Search events, organizers, cities…',
          })}
          // 16px, not 15: iOS Safari zooms the page when a focused field is
          // under 16px. globals.css enforces a floor for every input, but the
          // stated size should match what the browser actually uses.
          className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/45"
          aria-label={t('common.search')}
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          enterKeyHint="search"
        />

        <span aria-hidden className="h-6 w-px shrink-0 bg-white/10" />

        {/* The city lives INSIDE the field: plain text + chevron, a real select
            underneath. Teal only when a city is actually chosen (it means something). */}
        <label className="relative flex max-w-[42%] shrink-0 cursor-pointer select-none items-center gap-1.5 py-2">
          <span
            className={`truncate text-[13px] ${city ? 'font-medium text-brand-300' : 'font-normal text-white/60'}`}
          >
            {city || t('common.all_locations', { defaultValue: 'All Haiti' })}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
          <select
            value={city}
            onChange={(e) => applyCity(e.target.value)}
            aria-label={t('filters.all_cities', { defaultValue: 'All cities' })}
            className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-transparent opacity-0 outline-none"
          >
            <option value="" className="bg-white/[0.03] text-white">
              {t('common.all_locations', { defaultValue: 'All Haiti' })}
            </option>
            <optgroup label={t('common.haiti', { defaultValue: 'Haiti' })}>
              {cities.map((c) => (
                <option key={c} value={c} className="bg-white/[0.03] text-white">
                  {c}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('common.diaspora', { defaultValue: 'Diaspora' })}>
              {DIASPORA.map((c) => (
                <option key={c} value={c} className="bg-white/[0.03] text-white">
                  {c}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <button type="submit" className="sr-only">
          {t('common.search')}
        </button>
      </form>

      {/* Instant autocomplete dropdown */}
      {autocompleteEnabled && open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('common.search')}
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-poster-sm backdrop-blur-md"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-[13px] text-white/50">
              {t('events.no_matches_hint', {
                defaultValue: 'No matches. Press Enter to search all',
              })}
            </li>
          ) : (
            suggestions.map((s, i) => {
              const rowDate = formatRowDate(s.date)
              const meta = [rowDate, s.city].filter(Boolean).join(' · ')
              return (
                <li key={s.id} id={`${listboxId}-opt-${i}`} role="option" aria-selected={i === highlight}>
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
                      <span className="block truncate text-[14px] font-medium text-white">{s.title}</span>
                      {meta && (
                        <span className="mt-0.5 block truncate text-[12px] text-white/50">{meta}</span>
                      )}
                    </span>
                    {i === highlight && <ArrowUpRight className="h-4 w-4 shrink-0 text-brand-400" />}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
