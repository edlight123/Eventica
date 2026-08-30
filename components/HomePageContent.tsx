'use client'

import { useTranslation } from 'react-i18next'
import { DiscoverEventCard } from '@/components/discover/DiscoverEventCard'
import { SectionHeader, EventRail, CategoryRail } from '@/components/ui/EditorialRails'
import { LOCATION_CONFIG, CATEGORIES } from '@/lib/filters/config'
import Link from 'next/link'
import { MapPin, ArrowRight, Search } from 'lucide-react'

interface HomePageContentProps {
  hasActiveFilters: boolean
  events: any[]
  trendingEvents: any[]
  upcomingThisWeek: any[]
  countryEvents?: any[]
  recentlyAddedEvents?: any[]
  /** Starts today (through late night) — the most urgent rail, shown first. */
  tonightEvents?: any[]
  /** Events OUTSIDE the visitor's country scope — the identity rail. */
  diasporaEvents?: any[]
  /** Tikèm Picks — human-curated (admin Feature star). Curation leads the page. */
  picksEvents?: any[]
  /** True for a diaspora visitor: the rail shows Haiti and reads "back home". */
  diasporaIsHome?: boolean
  userCountry?: string
  userCity?: string
  userSubarea?: string
}

// Empty state when no events in the user's country
function NoEventsInCountry({ countryName }: { countryName: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center rounded-3xl  px-6 py-16 text-center shadow-poster-sm sm:py-20">
      <div className="grid h-16 w-16 place-items-center rounded-2xl text-brand-400">
        <MapPin className="h-8 w-8" />
      </div>
      <h3 className="mt-5 font-display text-2xl text-white">
        No events in {countryName} yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-white/55">
        We don&apos;t have any upcoming events in {countryName} right now. Check back soon or
        explore events in a different location.
      </p>
      <Link
        href="/profile"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
      >
        <MapPin className="h-4 w-4" />
        {t('common.change_location', { defaultValue: 'Change your location' })}
      </Link>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePageContent({
  hasActiveFilters,
  events,
  trendingEvents,
  upcomingThisWeek,
  countryEvents = [],
  recentlyAddedEvents = [],
  tonightEvents = [],
  diasporaEvents = [],
  picksEvents = [],
  diasporaIsHome = false,
  userCountry = 'HT',
  userCity = '',
  userSubarea = '',
}: HomePageContentProps) {
  const { t } = useTranslation('common')
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'
  // When the user has set a specific location (commune/neighborhood or city),
  // the local rail becomes "Near You" with that place name instead of a
  // generic "Events in {country}" label.
  const nearLocation = (userSubarea || userCity || '').trim()

  /* ----------------------------- Filtered view ---------------------------- */
  if (hasActiveFilters) {
    return (
      <div className="space-y-6">
        {/* No eyebrow — the compact filter band above already frames the
            working state; one serif line + the count is enough. */}
        <SectionHeader
          title={t('events.filtered_results')}
          description={
            events.length === 1
              ? t('events.event_found', { count: events.length })
              : t('events.events_found', { count: events.length })
          }
        />

        {events.length > 0 ? (
          // One poster grid at every width — a wall of flyers, phone included.
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {events.map((event) => (
              <DiscoverEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-3xl  px-6 py-20 text-center shadow-poster-sm">
            <div className="grid h-16 w-16 place-items-center rounded-2xl text-white/40">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-display text-2xl text-white">{t('events.no_events')}</h3>
            <p className="mt-2 text-[15px] text-white/55">{t('common.try_different_search')}</p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
            >
              {t('events.all_events')}
            </Link>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------ Home view ------------------------------- */
  // Inventory-aware home. With a tiny catalog the curated rails just replay the
  // same handful of events over and over (and half-fill their rows), so below a
  // threshold we collapse to a single "All Events" grid. Above it, we keep the
  // editorial rails but dedupe across them and only show a rail once it can fill
  // a desktop row.
  const LOW_INVENTORY_THRESHOLD = 8
  const MIN_RAIL_EVENTS = 4
  const isLowInventory = events.length < LOW_INVENTORY_THRESHOLD

  // Group events into one editorial rail per category that actually has events
  // (mirrors the mobile home). Group by the real category value on each event
  // so custom / legacy categories like "Festival" or "Cultural" still appear,
  // then order the canonical categories first with any extras after.
  const groupedByCategory = events.reduce<Record<string, any[]>>((acc, event) => {
    const category = (event?.category || '').toString().trim()
    if (!category) return acc
    ;(acc[category] = acc[category] || []).push(event)
    return acc
  }, {})

  const eventsByCategory = [
    ...CATEGORIES.filter((category) => groupedByCategory[category]?.length),
    ...Object.keys(groupedByCategory).filter((category) => !CATEGORIES.includes(category)),
  ].map((category) => ({
    category,
    events: groupedByCategory[category].slice(0, 12),
  }))

  // Dedupe across rails: process in priority order, each rail keeps only events
  // not already shown in an earlier rail, and a rail is dropped entirely unless
  // it still has enough fresh events to fill a row. The final All Events grid is
  // intentionally exempt — it's the comprehensive catalog.
  const seen = new Set<string>()
  const dedupeRail = (list: any[] = [], min: number = MIN_RAIL_EVENTS) => {
    const fresh = list.filter((e) => e?.id && !seen.has(e.id))
    if (fresh.length < min) return []
    fresh.forEach((e) => seen.add(e.id))
    return fresh
  }

  // Tonight is urgency — worth showing with as few as two events. The diaspora
  // rail draws from OUTSIDE the country scope, so it never starves the others.
  const tonightRail = isLowInventory ? [] : dedupeRail(tonightEvents, 2)
  const diasporaRail = isLowInventory ? [] : dedupeRail(diasporaEvents, 3)
  const trendingRail = isLowInventory ? [] : dedupeRail(trendingEvents)
  const recentlyAddedRail = isLowInventory ? [] : dedupeRail(recentlyAddedEvents)
  const countryRail = isLowInventory ? [] : dedupeRail(countryEvents)
  const thisWeekRail = isLowInventory ? [] : dedupeRail(upcomingThisWeek)
  const categoryRails = isLowInventory
    ? []
    : eventsByCategory
        .map(({ category, events: categoryEvents }) => ({
          category,
          events: dedupeRail(categoryEvents),
        }))
        .filter(({ events: railEvents }) => railEvents.length > 0)

  const allEventsGrid = (
    <section>
      <SectionHeader
        title={t('events.all_events')}
        description={
          events.length === 1
            ? t('events.event_found', { count: events.length })
            : t('events.events_found', { count: events.length })
        }
      />
      {events.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.slice(0, 12).map((event) => (
            <DiscoverEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <NoEventsInCountry countryName={countryName} />
      )}

      {events.length > 12 && (
        <div className="mt-9 flex justify-center">
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/12 px-6 py-2.5 text-sm font-medium text-white/80 transition-colors duration-200 hover:border-white/25 hover:text-white"
          >
            {t('events.explore_all')}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </section>
  )

  // Tikèm Picks — human curation leads the page. Deliberately exempt from the
  // cross-rail dedupe: a pick repeating in tonight/trending is fine, the
  // endorsement IS the content. Needs 2+ picks to read as a rail.
  const picksRail =
    picksEvents.length >= 2 ? (
      <section>
        <SectionHeader
          title={t('events.rail_picks', { defaultValue: 'tikèm picks' })}
          description={t('events.rail_picks_desc', {
            defaultValue: 'our favorite events this week',
          })}
        />
        <EventRail events={picksEvents} userCity={userCity} />
      </section>
    ) : null

  // Low inventory: hero (rendered by the parent) + picks if any + one clean grid.
  if (isLowInventory) {
    return (
      <div className="space-y-12 sm:space-y-16">
        {picksRail}
        {allEventsGrid}
      </div>
    )
  }

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Tikèm Picks — curation first */}
      {picksRail}

      {/* Tonight — the most urgent rail, always first */}
      {tonightRail.length > 0 && (
        <section>
          <SectionHeader
            title={t('events.rail_tonight', { defaultValue: 'tonight' })}
            href="/discover?date=today"
            cta={t('common.viewAll')}
          />
          <EventRail events={tonightRail} userCity={userCity} />
        </section>
      )}

      {/* In the diaspora / back home — the identity rail */}
      {diasporaRail.length > 0 && (
        <section>
          <SectionHeader
            title={
              diasporaIsHome
                ? t('events.rail_back_home', { defaultValue: 'back home in Haiti' })
                : t('events.rail_diaspora', { defaultValue: 'in the diaspora' })
            }
            description={
              diasporaIsHome
                ? undefined
                : t('events.rail_diaspora_desc', {
                    defaultValue: 'Miami · New York · Montréal · Paris',
                  })
            }
          />
          <EventRail events={diasporaRail} userCity={userCity} />
        </section>
      )}

      {/* Trending — editorial rail */}
      {trendingRail.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_trending')}
            title={t('events.trending_now')}
            description={t('events.trending_desc')}
            href="/discover?sort=popular"
            cta={t('common.viewAll')}
          />
          <EventRail events={trendingRail} userCity={userCity} />
        </section>
      )}

      {/* Recently added — newest on the platform */}
      {recentlyAddedRail.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_new')}
            title={t('events.recently_added')}
            description={t('events.recently_added_desc')}
            href="/discover?sort=newest"
            cta={t('common.viewAll')}
          />
          <EventRail events={recentlyAddedRail} userCity={userCity} />
        </section>
      )}

      {/* Near you (when a location is set) / Events in country — editorial rail */}
      {countryRail.length > 0 && (
        <section>
          {nearLocation ? (
            <SectionHeader
              eyebrow={nearLocation}
              title={t('events.near_you_title', { defaultValue: 'Near You' })}
              description={t('events.near_you_around', { location: nearLocation, defaultValue: `What's happening around ${nearLocation}` })}
              href={`/discover?country=${userCountry}`}
              cta={t('common.viewAll')}
            />
          ) : (
            <SectionHeader
              eyebrow={t('events.eyebrow_local')}
              title={t('events.in_country', { country: countryName, defaultValue: `Events in ${countryName}` })}
              description={t('events.in_country_desc', { country: countryName, defaultValue: `Discover events happening in ${countryName}` })}
              href={`/discover?country=${userCountry}`}
              cta={t('common.viewAll')}
            />
          )}
          <EventRail events={countryRail} userCity={userCity} />
        </section>
      )}

      {/* This week — editorial rail */}
      {thisWeekRail.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_week')}
            title={t('events.this_week')}
            description={t('events.this_week_desc')}
            href="/discover?date=week"
            cta={t('common.viewAll')}
          />
          <EventRail events={thisWeekRail} userCity={userCity} />
        </section>
      )}

      {/* Per-category rails (mirrors mobile) — header + carousel, no wrapper */}
      {categoryRails.length > 0 && (
        <section className="space-y-10 sm:space-y-12">
          {categoryRails.map(({ category, events: categoryEvents }) => (
            <CategoryRail
              key={category}
              label={t(`categories.${category}`, { defaultValue: category })}
              href={`/categories/${encodeURIComponent(category)}`}
              cta={t('common.viewAll')}
              events={categoryEvents}
              userCity={userCity}
            />
          ))}
        </section>
      )}

      {/* All upcoming events. (The cultural worlds render as full scroll
          chapters after this store — WorldsChapters in app/page.tsx — so the
          flat grid section retired from the home; it lives on /categories.) */}
      {allEventsGrid}
    </div>
  )
}
