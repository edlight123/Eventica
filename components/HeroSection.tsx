'use client'

// The homepage's FILTERED working state: one compact row — the shared search
// field — aligned to the content container. The statement
// hero (components/home/HeroPase) renders when no filters are active; this
// band renders when they are. (2026-08-30 refactor: the featured-event
// carousel hero retired in favor of HeroPase.)

import { useTranslation } from 'react-i18next'
import HeroSearch from '@/components/home/HeroSearch'

// CityChips and CITY_CHIPS lived here until 2026-09-03. Both homepage heroes
// dropped the chip row on owner ask — the search's city dropdown is the city
// control the hero needs — which left them with no callers, so they go rather
// than sit as a dead export waiting to be re-adopted by accident.

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
          {/* z-20 so the suggestion dropdown is never painted through by a
              later sibling — the pairing that broke on the statement hero. */}
          <div className="relative z-20 w-full lg:max-w-md">
            <HeroSearch events={events} compact />
          </div>
          {/* City chips removed here too (owner ask): this is the same homepage
              in its filtered state, and the search's city dropdown is the one
              city control the hero needs. */}
        </div>
      </div>
    </section>
  )
}
