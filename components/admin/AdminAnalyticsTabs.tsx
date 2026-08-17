'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAdminMetrics } from '@/lib/realtime/AdminRealtimeProvider'
import { AdminRevenueAnalytics } from './AdminRevenueAnalytics'
import { UserGrowthAnalytics } from './UserGrowthAnalytics'
import { EventPerformanceAnalytics } from './EventPerformanceAnalytics'
import { ConversionFunnelAnalytics } from './ConversionFunnelAnalytics'
import { OrganizerRankingsAnalytics } from './OrganizerRankingsAnalytics'

type TabId = 'overview' | 'revenue' | 'users' | 'events' | 'conversion' | 'organizers'

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'users', label: 'Users' },
  { id: 'events', label: 'Events' },
  { id: 'conversion', label: 'Conversion' },
  { id: 'organizers', label: 'Organizers' },
]

const DEFAULT_TAB: TabId = 'overview'
const tabIds = new Set<string>(tabs.map((t) => t.id))
const normalizeTab = (value: string | null | undefined): TabId =>
  value && tabIds.has(value) ? (value as TabId) : DEFAULT_TAB

/* ----------------------------- helpers ----------------------------- */

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
const fmtHTG = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`

/* ----------------------------- hero scorecard ----------------------------- */

function HeroScorecard() {
  const { metrics, isConnected } = useAdminMetrics()
  const m = metrics

  const cells = [
    { label: 'Total users', value: m ? fmtNum(m.usersCount) : '—' },
    { label: 'Active events', value: m ? fmtNum(m.eventsCount) : '—' },
    { label: 'Tickets · 7d', value: m ? fmtNum(m.tickets7d) : '—' },
    { label: 'Revenue · 7d', value: m ? fmtHTG(m.gmv7d) : '—', sub: 'HTG' },
    { label: 'Refunds · 7d', value: m ? fmtNum(m.refunds7d) : '—' },
    { label: 'Pending', value: m ? fmtNum(m.pendingCount) : '—' },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-console-green' : 'bg-console-faint'}`} />
        <span className="label-mono text-[10px] uppercase tracking-[0.18em] text-console-faint">
          {isConnected ? 'Live' : 'Snapshot'}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {cells.map((c) => (
          <div key={c.label}>
            <div className="label-mono text-[10px] uppercase tracking-[0.18em] text-console-faint">{c.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-xl tabular-nums text-console-text">{c.value}</span>
              {c.sub && <span className="font-mono text-xs text-console-mut">{c.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------- section frame ----------------------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="label-mono text-[10px] uppercase tracking-[0.18em] text-console-faint">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-console-mut">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function AdminAnalyticsTabsInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The URL's ?tab= param is the source of truth for the active tab.
  const activeTab = normalizeTab(searchParams.get('tab'))
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set<TabId>([activeTab]))

  const selectTab = useCallback(
    (tabId: TabId) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (tabId === DEFAULT_TAB) {
        params.delete('tab')
      } else {
        params.set('tab', tabId)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  useEffect(() => {
    if (!visitedTabs.has(activeTab)) {
      setVisitedTabs((prev) => {
        const next = new Set<TabId>(Array.from(prev))
        next.add(activeTab)
        return next
      })
    }
  }, [activeTab, visitedTabs])

  return (
    <div className="space-y-6">
      {/* Live hero scorecard */}
      <HeroScorecard />

      {/* Tab bar — mono caps text tabs */}
      <div
        className="scrollbar-hide flex gap-6 overflow-x-auto"
        role="tablist"
        aria-label="Analytics views"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              id={`atab-${tab.id}`}
              aria-controls={`apanel-${tab.id}`}
              aria-selected={isActive}
              onClick={() => selectTab(tab.id)}
              className={`label-mono shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive ? 'border-console-text text-console-text' : 'border-transparent text-console-mut hover:text-console-text'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content (lazy-mounted) */}
      <div className="min-h-[360px]">
        <div role="tabpanel" id="apanel-overview" aria-labelledby="atab-overview" tabIndex={0} className={activeTab === 'overview' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('overview') && (
            <div className="space-y-6">
              <Section title="Revenue" subtitle="Gross sales across all currencies">
                <AdminRevenueAnalytics showFilters={false} />
              </Section>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="User growth" subtitle="Last 7 days">
                  <UserGrowthAnalytics days={7} />
                </Section>
                <Section title="Top events" subtitle="By tickets sold">
                  <EventPerformanceAnalytics />
                </Section>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Section title="Conversion funnel" subtitle="Views → checkout">
                  <ConversionFunnelAnalytics />
                </Section>
                <Section title="Top organizers" subtitle="By revenue">
                  <OrganizerRankingsAnalytics />
                </Section>
              </div>
            </div>
          )}
        </div>

        <div role="tabpanel" id="apanel-revenue" aria-labelledby="atab-revenue" tabIndex={0} className={activeTab === 'revenue' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('revenue') && (
            <Section title="Revenue analytics" subtitle="Multi-currency breakdown, payment methods & FX">
              <AdminRevenueAnalytics showFilters={true} />
            </Section>
          )}
        </div>

        <div role="tabpanel" id="apanel-users" aria-labelledby="atab-users" tabIndex={0} className={activeTab === 'users' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('users') && (
            <Section title="User growth" subtitle="New signups over the last 30 days">
              <UserGrowthAnalytics days={30} />
            </Section>
          )}
        </div>

        <div role="tabpanel" id="apanel-events" aria-labelledby="atab-events" tabIndex={0} className={activeTab === 'events' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('events') && (
            <Section title="Event performance" subtitle="Top-performing events">
              <EventPerformanceAnalytics />
            </Section>
          )}
        </div>

        <div role="tabpanel" id="apanel-conversion" aria-labelledby="atab-conversion" tabIndex={0} className={activeTab === 'conversion' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('conversion') && (
            <Section title="Conversion funnel" subtitle="From page views to completed orders">
              <ConversionFunnelAnalytics />
            </Section>
          )}
        </div>

        <div role="tabpanel" id="apanel-organizers" aria-labelledby="atab-organizers" tabIndex={0} className={activeTab === 'organizers' ? 'focus:outline-none' : 'hidden'}>
          {visitedTabs.has('organizers') && (
            <Section title="Organizer rankings" subtitle="Best-performing organizers">
              <OrganizerRankingsAnalytics />
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

export function AdminAnalyticsTabs() {
  // useSearchParams requires a Suspense boundary during static prerender.
  return (
    <Suspense fallback={<HeroScorecard />}>
      <AdminAnalyticsTabsInner />
    </Suspense>
  )
}
