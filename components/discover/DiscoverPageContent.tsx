'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EventsSection } from './EventsSection'
import { EmptyState } from './EmptyState'
import { FeaturedCarousel } from './FeaturedCarousel'
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

export function DiscoverPageContent({
  hasActiveFilters,
  featuredEvents,
  upcomingEvents,
  countryEvents,
  nearYouEvents,
  budgetEvents,
  onlineEvents,
  filteredEvents,
  city,
  commune,
  userCountry = 'HT'
}: DiscoverPageContentProps) {
  const { t } = useTranslation('common')
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'

  // Union of every event id currently rendered, so the provider can batch the
  // "friends going" counts in a single request.
  const allEventIds = useMemo(() => {
    const ids: string[] = []
    for (const list of [
      featuredEvents,
      upcomingEvents,
      countryEvents,
      nearYouEvents,
      budgetEvents,
      onlineEvents,
      filteredEvents,
    ]) {
      if (Array.isArray(list)) {
        for (const e of list) if (e?.id) ids.push(e.id)
      }
    }
    return Array.from(new Set(ids))
  }, [
    featuredEvents,
    upcomingEvents,
    countryEvents,
    nearYouEvents,
    budgetEvents,
    onlineEvents,
    filteredEvents,
  ])

  return (
    <FriendsGoingProvider eventIds={allEventIds}>
    <div className="space-y-8">
      {/* Featured Carousel (only if no active filters and has featured) */}
      {!hasActiveFilters && featuredEvents.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              ⭐ {t('events.featured_weekend')}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-1">
              {t('events.featured_weekend_desc')}
            </p>
          </div>
          <FeaturedCarousel events={featuredEvents} />
        </div>
      )}

      {/* Show sections only if no active filters */}
      {!hasActiveFilters ? (
        <>
          {/* Happening Soon */}
          <EventsSection
            title={t('common.happening_soon')}
            description={t('common.happening_soon_desc')}
            emoji="🔥"
            events={upcomingEvents}
            seeAllLink="/discover?date=this-week"
          />

          {/* Events in Your Country */}
          {countryEvents.length > 0 && (
            <EventsSection
              title={`Events in ${countryName}`}
              description={`Discover events happening in ${countryName}`}
              emoji="🌎"
              events={countryEvents}
              seeAllLink={`/discover?country=${userCountry}`}
            />
          )}

          {/* Near You (only if location set) */}
          {nearYouEvents.length > 0 && (
            <EventsSection
              title={t('common.near_you')}
              description={`${t('events.events')} ${city ? `${city}` : ''}${commune ? ` • ${commune}` : ''}`}
              emoji="📍"
              events={nearYouEvents}
              seeAllLink={`/discover?city=${city}`}
            />
          )}

          {/* Free & Budget Events */}
          {budgetEvents.length > 0 && (
            <EventsSection
              title={t('events.budget_friendly')}
              description={t('events.budget_friendly_desc')}
              emoji="💰"
              events={budgetEvents}
              seeAllLink="/discover?price=%3C%3D500"
            />
          )}

          {/* Online Events */}
          {onlineEvents.length > 0 && (
            <EventsSection
              title={t('events.onlineEvents')}
              description={t('events.online_desc')}
              emoji="💻"
              events={onlineEvents}
              seeAllLink="/discover?eventType=online"
            />
          )}

          {/* All Events Fallback */}
          {upcomingEvents.length === 0 && 
           countryEvents.length === 0 &&
           nearYouEvents.length === 0 && 
           budgetEvents.length === 0 && 
           onlineEvents.length === 0 && (
            <EmptyState hasFilters={false} countryName={countryName} />
          )}
        </>
      ) : (
        /* Filtered Results */
        <>
          {filteredEvents.length > 0 ? (
            <EventsSection
              title={t('events.filtered_results')}
              description={filteredEvents.length === 1 
                ? t('events.event_found', { count: filteredEvents.length })
                : t('events.events_found', { count: filteredEvents.length })}
              events={filteredEvents}
            />
          ) : (
            <EmptyState hasFilters={true} countryName={countryName} />
          )}
        </>
      )}
    </div>
    </FriendsGoingProvider>
  )
}
