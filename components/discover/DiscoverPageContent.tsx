'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { EmptyState } from './EmptyState'
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
  userId?: string
}

type DiscoverTab = 'forYou' | 'saved'

/**
 * Web Discover mirrors the mobile app: a single-column feed with For You /
 * Saved tabs (no hero, no multi-column grid). The filter bar above
 * (DiscoverFilterManager) drives the For You feed.
 */
export function DiscoverPageContent({
  hasActiveFilters,
  filteredEvents,
  userCountry = 'HT',
  userId,
}: DiscoverPageContentProps) {
  const countryName = LOCATION_CONFIG[userCountry]?.name || 'Haiti'
  const [tab, setTab] = useState<DiscoverTab>('forYou')
  const [savedEvents, setSavedEvents] = useState<any[] | null>(null)

  // De-dupe the feed.
  const feed = useMemo(() => {
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

  // Saved tab — intersect the user's favorites with the loaded events.
  useEffect(() => {
    if (tab !== 'saved' || !userId) return
    let active = true
    ;(async () => {
      try {
        const favs = await getDocs(
          query(collection(db, 'event_favorites'), where('user_id', '==', userId))
        )
        const ids = new Set(favs.docs.map((d) => d.data().event_id))
        if (active) setSavedEvents(feed.filter((e) => ids.has(e.id)))
      } catch {
        if (active) setSavedEvents([])
      }
    })()
    return () => {
      active = false
    }
  }, [tab, userId, feed])

  const allEventIds = useMemo(() => feed.map((e) => e.id).filter(Boolean), [feed])

  const tabs: { key: DiscoverTab; label: string }[] = [
    { key: 'forYou', label: 'For You' },
    { key: 'saved', label: 'Saved' },
  ]

  const renderFeed = (list: any[]) =>
    list.length > 0 ? (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((event) => (
          <DiscoverEventCard key={event.id} event={event} />
        ))}
      </div>
    ) : null

  return (
    <FriendsGoingProvider eventIds={allEventIds}>
      {/* Tabs — left-aligned with a hairline rule and live count */}
      <div className="mb-6 flex items-end justify-between border-b border-white/10">
        <div className="flex items-center gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative -mb-px pb-3 text-[15px] font-semibold transition-colors ${
                tab === t.key ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-400" />}
            </button>
          ))}
        </div>
        {tab === 'forYou' && feed.length > 0 && (
          <span className="hidden pb-3 text-sm text-white/70 sm:block">
            {feed.length} event{feed.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* For You */}
      {tab === 'forYou' &&
        (feed.length > 0 ? (
          renderFeed(feed)
        ) : (
          <EmptyState hasFilters={hasActiveFilters} countryName={countryName} />
        ))}

      {/* Saved */}
      {tab === 'saved' &&
        (!userId ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 py-16 text-center text-white/70">
            <Link href="/auth/login?redirect=/discover" className="font-semibold text-brand-300 hover:text-brand-200">
              Sign in
            </Link>{' '}
            to see events you&rsquo;ve saved.
          </div>
        ) : savedEvents === null ? (
          <div className="mx-auto max-w-2xl py-16 text-center text-white/70">Loading saved events…</div>
        ) : savedEvents.length > 0 ? (
          renderFeed(savedEvents)
        ) : (
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 py-16 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-white/30" />
            <p className="text-white/70">No saved events yet</p>
            <p className="mt-1 text-sm text-white/70">Tap the bookmark on any event to save it here.</p>
          </div>
        ))}
    </FriendsGoingProvider>
  )
}
