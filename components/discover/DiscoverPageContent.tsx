'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from './EmptyState'
import { FeaturedCarousel } from './FeaturedCarousel'
import { DiscoverEventCard } from './DiscoverEventCard'
import { FriendsGoingProvider } from './FriendsGoingContext'
import { LOCATION_CONFIG } from '@/lib/filters/config'

interface DiscoverPageContentProps {
  hasActiveFilters: boolean
  featuredEvents: any[]
  upcomingEvents: any[]
  countryEvents: any[]
  nearYouEvents: any[]
  budgetEvents: any[]
  onlineEvents: any[]
  filteredEvents: any[]
  city?: string
  commune?: string
  userCountry?: string
}

/**
 * Discover is intentionally NOT the homepage. The home feed is editorial —
 * stacked, horizontally-scrolling rails. Discover is a search/browse surface:
 * a featured carousel up top, then one big responsive grid of everything that
 * matches the current filters. Cleaner, denser, and built for scanning.
 */
export function DiscoverPageContent({
  hasActiveFilters,
  featuredEvents,
  filteredEvents,
  userCountry = 'HT',
}: DiscoverPageContentProps) {
  const { t } = useTranslation('common')
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'

  // De-dupe the grid (featured events can also appear in the full list).
  const gridEvents = useMemo(() => {
    const seen = new Set<string>()
    const out: any[] = []
    for (const e of filteredEvents || []) {
      if (e?.id && !seen.has(e.id)) {
        seen.add(e.id)
        out.push(e)
      }
    }
    return out
  }, [filteredEvents])

  const allEventIds = useMemo(() => {
    const ids = new Set<string>()
    for (const list of [featuredEvents, gridEvents]) {
      if (Array.isArray(list)) for (const e of list) if (e?.id) ids.add(e.id)
    }
    return Array.from(ids)
  }, [featuredEvents, gridEvents])

  const showFeatured = !hasActiveFilters && featuredEvents.length > 0

  return (
    <FriendsGoingProvider eventIds={allEventIds}>
      <div className="space-y-10">
        {/* Featured carousel — only on the unfiltered browse view */}
        {showFeatured && (
          <section className="space-y-4">
            <div>
              <h2 className="font-grotesk text-2xl sm:text-3xl font-bold lowercase tracking-tight text-white">
                {t('events.featured_weekend')}
              </h2>
              <p className="mt-1 text-sm text-white/55 sm:text-base">
                {t('events.featured_weekend_desc')}
              </p>
            </div>
            <FeaturedCarousel events={featuredEvents} />
          </section>
        )}

        {/* One big grid feed of everything that matches */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-grotesk text-2xl sm:text-3xl font-bold lowercase tracking-tight text-white">
              {hasActiveFilters ? t('events.filtered_results') : t('events.all_events')}
            </h2>
            {gridEvents.length > 0 && (
              <span className="shrink-0 text-sm text-white/45">
                {gridEvents.length === 1
                  ? t('events.event_found', { count: gridEvents.length })
                  : t('events.events_found', { count: gridEvents.length })}
              </span>
            )}
          </div>

          {gridEvents.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {gridEvents.map((event) => (
                <DiscoverEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState hasFilters={hasActiveFilters} countryName={countryName} />
          )}
        </section>
      </div>
    </FriendsGoingProvider>
  )
}
