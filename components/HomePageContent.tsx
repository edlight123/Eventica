'use client'

import { useTranslation } from 'react-i18next'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
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
  userCountry?: string
  userCity?: string
  userSubarea?: string
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
        {eyebrow && <p className="eyebrow text-brand-400">{eyebrow}</p>}
        <h2 className="mt-1.5 font-display text-[clamp(24px,4.2vw,36px)] leading-[1.02] text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-white/55 sm:text-[15px]">{description}</p>
        )}
      </div>
      {href && cta && (
        <Link
          href={href}
          className="eyebrow group inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-1 text-[11px] text-brand-400 transition-colors hover:text-brand-300"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

/** Horizontal, snapping rail of poster cards that bleeds to the screen edges. */
function EventRail({ events, userCity }: { events: any[]; userCity?: string }) {
  return (
    <div className="rail -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {events.map((event, index) => (
        <div key={event.id} className="w-[228px] sm:w-[248px]">
          <EventCard event={event} index={index} userCity={userCity} />
        </div>
      ))}
    </div>
  )
}

/** A single category section: a lighter sub-header above its own poster rail. */
function CategoryRail({
  label,
  href,
  cta,
  events,
  userCity,
}: {
  label: string
  href: string
  cta: string
  events: any[]
  userCity?: string
}) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h3 className="font-display text-[clamp(20px,3vw,28px)] leading-tight text-white">
          {label}
        </h3>
        <Link
          href={href}
          className="eyebrow group inline-flex shrink-0 items-center gap-1 whitespace-nowrap pb-1 text-[11px] text-brand-400 transition-colors hover:text-brand-300"
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <EventRail events={events} userCity={userCity} />
    </div>
  )
}

// Empty state when no events in the user's country
function NoEventsInCountry({ countryName }: { countryName: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center rounded-3xl  bg-white/5 px-6 py-16 text-center shadow-poster-sm sm:py-20">
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
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700"
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
                <EventCardHorizontal key={event.id} event={event} userCity={userCity} />
              ))}
            </div>
            {/* Desktop: poster grid */}
            <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} userCity={userCity} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center rounded-3xl  bg-white/5 px-6 py-20 text-center shadow-poster-sm">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-white/40">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-display text-2xl text-white">{t('events.no_events')}</h3>
            <p className="mt-2 text-[15px] text-white/55">{t('common.try_different_search')}</p>
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

  return (
    <div className="space-y-12 sm:space-y-16">
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
          <EventRail events={trendingEvents} userCity={userCity} />
        </section>
      )}

      {/* Recently added — newest on the platform */}
      {recentlyAddedEvents.length > 0 && (
        <section>
          <SectionHeader
            eyebrow={t('events.eyebrow_new')}
            title={t('events.recently_added')}
            description={t('events.recently_added_desc')}
            href="/discover?sort=newest"
            cta={t('common.viewAll')}
          />
          <EventRail events={recentlyAddedEvents} userCity={userCity} />
        </section>
      )}

      {/* Near you (when a location is set) / Events in country — editorial rail */}
      {countryEvents.length > 0 && (
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
          <EventRail events={countryEvents} userCity={userCity} />
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
          <EventRail events={upcomingThisWeek} userCity={userCity} />
        </section>
      )}

      {/* Per-category rails (mirrors mobile) — header + carousel, no wrapper */}
      {eventsByCategory.length > 0 && (
        <section className="space-y-10 sm:space-y-12">
          {eventsByCategory.map(({ category, events: categoryEvents }) => (
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
          <>
            {/* Mobile: list rows */}
            <div className="space-y-3 md:hidden">
              {events.slice(0, 12).map((event) => (
                <EventCardHorizontal key={event.id} event={event} userCity={userCity} />
              ))}
            </div>
            {/* Desktop: poster grid */}
            <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {events.slice(0, 12).map((event, index) => (
                <EventCard key={event.id} event={event} index={index} userCity={userCity} />
              ))}
            </div>
          </>
        ) : (
          <NoEventsInCountry countryName={countryName} />
        )}

        {events.length > 12 && (
          <div className="mt-9 flex justify-center">
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white shadow-poster-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/40 hover:text-brand-300"
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
