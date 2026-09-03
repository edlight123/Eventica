'use client'

// The homepage's FILTERED working state: one compact row — the shared search
// field and the city chips — aligned to the content container. The statement
// hero (components/home/HeroPase) renders when no filters are active; this
// band renders when they are. (2026-08-30 refactor: the featured-event
// carousel hero retired in favor of HeroPase.)

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import HeroSearch from '@/components/home/HeroSearch'

/**
 * The diaspora, written into the identity: real filters, not decoration.
 * Haiti cities filter within HT; the four diaspora cities also switch the
 * page's country scope (see app/page.tsx DIASPORA_CITY_COUNTRY).
 */
export const CITY_CHIPS = ['Port-au-Prince', 'Cap-Haïtien', 'Miami', 'New York', 'Montréal', 'Paris']

/** City chips: the active city reads teal (semantic) and clicking it clears. */
export function CityChips({ className = '' }: { className?: string }) {
  const searchParams = useSearchParams()
  const activeCity = searchParams?.get('city') || ''
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {CITY_CHIPS.map((c) => {
        const isActive = c === activeCity
        return (
          <Link
            key={c}
            href={isActive ? '/' : `/?city=${encodeURIComponent(c)}`}
            aria-pressed={isActive}
            // See FilterChip: 44px touch floor on phones, unchanged above sm.
            className={`inline-flex min-h-11 items-center rounded-[10px] border px-3.5 py-1.5 text-[13px] font-normal transition-colors duration-200 sm:min-h-0 ${
              isActive
                ? 'border-brand-500/40 bg-brand-500/[0.08] text-brand-300 hover:border-brand-400/60'
                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white'
            }`}
          >
            {c}
          </Link>
        )
      })}
    </div>
  )
}

export default function HeroSection({ events }: { events?: any[] }) {
  const { t } = useTranslation('common')
  return (
    // No bottom rule: the navbar above already draws one, so this hairline
    // sat a few pixels below another and read as a seam across the page. The
    // search row is separated from the results by its own padding instead.
    <section>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="sr-only">{t('events.find_perfect_event')}</h1>
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-6">
          {/* Same guard as HeroPase: the search sits above the chips so its
              suggestion dropdown can never be painted through by them. There
              is no transform here today, so this is belt-and-braces, but it is
              the pairing that broke on the hero. */}
          <div className="relative z-20 w-full lg:max-w-md">
            <HeroSearch events={events} compact />
          </div>
          <CityChips />
        </div>
      </div>
    </section>
  )
}
