'use client'

import { useTranslation } from 'react-i18next'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import CategoryGrid from '@/components/CategoryGrid'
import { Suspense } from 'react'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { LOCATION_CONFIG } from '@/lib/filters/config'
import Link from 'next/link'
import { MapPin, ArrowRight, Search } from 'lucide-react'

interface HomePageContentProps {
  hasActiveFilters: boolean
  events: any[]
  trendingEvents: any[]
  upcomingThisWeek: any[]
  countryEvents?: any[]
  userCountry?: string
}

/* -------------------------------------------------------------------------- */
/*  Editorial building blocks                                                  */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  cta,
}: {
  eyebrow?: string
  title: string
  description?: string
  href?: string
  cta?: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-brand-600">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-[clamp(24px,4.2vw,36px)] leading-[1.02] text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 sm:text-[15px]">{description}</p>
        )}
      </div>
      {href && cta && (
        <Link
          href={href}
          className="eyebrow group inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-1 text-[11px] text-brand-600 transition-colors hover:text-brand-700"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

/** Horizontal, snapping rail of poster cards that bleeds to the screen edges. */
function EventRail({ events }: { events: any[] }) {
  return (
    <div className="rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {events.map((event, index) => (
        <div key={event.id} className="w-[228px] sm:w-[248px]">
          <EventCard event={event} index={index} />
        </div>
      ))}
    </div>
  )
}

// Empty state when no events in the user's country
function NoEventsInCountry({ countryName }: { countryName: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center rounded-3xl border border-gray-200/80 bg-white px-6 py-16 text-center shadow-poster-sm sm:py-20">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <MapPin className="h-8 w-8" />
      </div>
      <h3 className="mt-5 font-display text-2xl text-gray-900">
        No events in {countryName} yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-gray-500">
        We don&apos;t have any upcoming events in {countryName} right now. Check back soon or
        explore events in a different location.
      </p>
      <Link
        href="/profile"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-800"
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
  userCountry = 'HT',
}: HomePageContentProps) {
  const { t } = useTranslation('common')
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'

  /* ----------------------------- Filtered view ---------------------------- */
  if (hasActiveFilters) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow={t('events.eyebrow_browse')}
          title={t('events.filtered_results')}
          description={
            events.length === 1
              ? t('events.event_found', { count: events.length })
              : t('events.events_found', { count: events.length })
          }
        />

        {events.length > 0 ? (
          <>
            {/* Mobile: list rows */}
            <div className="space-y-3 md:hidden">
              {events.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: poster grid */}
            <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-3xl border border-gray-200/80 bg-white px-6 py-20 text-center shadow-poster-sm">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gray-50 text-gray-400">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-display text-2xl text-gray-900">{t('events.no_events')}</h3>
            <p className="mt-2 text-[15px] text-gray-500">{t('common.try_different_search')}</p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700"
            >
              {t('events.all_events')}
            </Link>
          </div>
        )}
      </div>
    )
  }

  /* ------------------------------ Home view ------------------------------- */
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Browse by Category */}
      <section>
        <SectionHeader
          eyebrow={t('events.eyebrow_browse')}
          title={t('events.browse_categories')}
          description={t('events.browse_categories_desc')}
        />
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 sm:h-28" />
              ))}
            </div>
          }
        >
          <CategoryGrid />
        </Suspense>
      </section>

      {/* Trending — editorial rail */}
      {trendingEvents.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_trending')}
            title={t('events.trending_now')}
            description={t('events.trending_desc')}
            href="/discover?sort=popular"
            cta={t('common.viewAll')}
          />
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            <EventRail events={trendingEvents} />
          </Suspense>
        </section>
      )}

      {/* Events in your country — editorial rail */}
      {countryEvents.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_local')}
            title={t('events.in_country', { country: countryName, defaultValue: `Events in ${countryName}` })}
            description={t('events.in_country_desc', { country: countryName, defaultValue: `Discover events happening in ${countryName}` })}
            href={`/discover?country=${userCountry}`}
            cta={t('common.viewAll')}
          />
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            <EventRail events={countryEvents} />
          </Suspense>
        </section>
      )}

      {/* This week — editorial rail */}
      {upcomingThisWeek.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_week')}
            title={t('events.this_week')}
            description={t('events.this_week_desc')}
            href="/discover?date=week"
            cta={t('common.viewAll')}
          />
          <Suspense fallback={<LoadingSkeleton rows={6} animated={false} />}>
            <EventRail events={upcomingThisWeek} />
          </Suspense>
        </section>
      )}

      {/* All upcoming events */}
      <section>
        <SectionHeader
          eyebrow={t('events.eyebrow_all')}
          title={t('events.all_events')}
          description={
            events.length === 1
              ? t('events.event_found', { count: events.length })
              : t('events.events_found', { count: events.length })
          }
        />
        {events.length > 0 ? (
          <Suspense fallback={<LoadingSkeleton rows={8} animated={false} />}>
            {/* Mobile: list rows */}
            <div className="space-y-3 md:hidden">
              {events.slice(0, 12).map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            {/* Desktop: poster grid */}
            <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {events.slice(0, 12).map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          </Suspense>
        ) : (
          <NoEventsInCountry countryName={countryName} />
        )}

        {events.length > 12 && (
          <div className="mt-9 flex justify-center">
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-3 text-sm font-semibold text-gray-900 shadow-poster-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700"
            >
              {t('events.explore_all')}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
