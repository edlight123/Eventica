'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Award,
  BarChart3,
  Ticket,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react'
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
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'conversion', label: 'Conversion', icon: TrendingUp },
  { id: 'organizers', label: 'Organizers', icon: Award },
]

/* ----------------------------- helpers ----------------------------- */

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
const fmtHTG = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`

/* ----------------------------- hero scorecard ----------------------------- */

function HeroScorecard() {
  const { metrics, isConnected } = useAdminMetrics()
  const m = metrics

  const cells = [
    { label: 'Total users', value: m ? fmtNum(m.usersCount) : '—', icon: Users },
    { label: 'Active events', value: m ? fmtNum(m.eventsCount) : '—', icon: Calendar },
    { label: 'Tickets · 7d', value: m ? fmtNum(m.tickets7d) : '—', icon: Ticket },
    { label: 'Revenue · 7d', value: m ? fmtHTG(m.gmv7d) : '—', sub: 'HTG', icon: DollarSign },
    { label: 'Refunds · 7d', value: m ? fmtNum(m.refunds7d) : '—', icon: RefreshCcw },
    { label: 'Pending', value: m ? fmtNum(m.pendingCount) : '—', icon: ShieldAlert },
  ]

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/30'}`} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
          {isConnected ? 'Live' : 'Snapshot'}
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {cells.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/50">
                <Icon className="h-3.5 w-3.5 text-white/30" />
                <span className="truncate">{c.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums text-white">{c.value}</span>
                {c.sub && <span className="text-xs text-white/50">{c.sub}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------- section frame ----------------------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

export function AdminAnalyticsTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set<TabId>(['overview']))

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

      {/* Segmented tab control */}
      <div
        className="scrollbar-hide flex gap-1 overflow-x-auto rounded-full border border-white/10 p-1"
        role="tablist"
        aria-label="Analytics views"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              id={`atab-${tab.id}`}
              aria-controls={`apanel-${tab.id}`}
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive ? 'bg-white/[0.08] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
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
