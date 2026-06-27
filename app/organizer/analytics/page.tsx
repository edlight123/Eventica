import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SalesChart from '@/components/charts/SalesChart'
import CategoryChart from '@/components/charts/CategoryChart'
import { TrendingUp, DollarSign, Ticket, Calendar } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { formatMoneyFromCents, normalizeCurrency } from '@/lib/money'
import { PageHeader, MetricCard, SectionHeader, OrgEmptyState } from '@/components/organizer/ui'

export const revalidate = 120 // Cache for 2 minutes

// Depends on auth cookies and organizer-specific data.
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/organizer/analytics')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/analytics')
  }

  const supabase = await createClient()

  // Fetch organizer's events only.
  const eventsQuery = await supabase
    .from('events')
    .select('id,title,start_datetime,is_published,category,organizer_id,currency')
    .eq('organizer_id', user.id)

  const allOrganizerEvents = eventsQuery.data || []

  // Organizer-facing analytics should be shown in the event currency (no FX conversion).
  // If an organizer has mixed currencies (unexpected), prefer USD and scope analytics to that currency.
  const eventCurrencies = new Set<string>(
    allOrganizerEvents.map((e: any) => normalizeCurrency(e?.currency, 'HTG'))
  )

  const organizerCurrency: string = (() => {
    const values = Array.from(eventCurrencies)
    if (values.length === 1) return values[0]
    if (eventCurrencies.has('USD')) return 'USD'
    return values[0] || 'HTG'
  })()

  const eventsData = allOrganizerEvents.filter(
    (e: any) => normalizeCurrency(e?.currency, 'HTG') === organizerCurrency
  )

  // Fetch tickets for organizer's events in the chosen currency.
  // Join through events to avoid large `IN (...)` lists as event count grows.
  const ticketsQuery = eventsData.length
    ? await supabase
        .from('tickets')
        .select('event_id,price_paid,created_at,status,events!inner(organizer_id,currency)')
        .eq('events.organizer_id', user.id)
        .eq('events.currency', organizerCurrency)
    : { data: [] as any[] }

  const allTickets = (ticketsQuery as any).data || []

  const isValidTicketStatus = (raw: unknown) => {
    const status = String(raw || '').toLowerCase()
    // Legacy + current accepted values.
    if (!status) return true
    return status === 'valid' || status === 'confirmed'
  }
  
  // Group tickets by event
  const ticketsByEvent = new Map<string, { ticketCount: number; revenueCents: number }>()

  allTickets.forEach((ticket: any) => {
    if (!isValidTicketStatus(ticket?.status)) return
    const eventId = String(ticket?.event_id || '')
    if (!eventId) return

    const pricePaid = Number(ticket?.price_paid || 0)
    const revenueCents = Math.round(pricePaid * 100)
    if (!Number.isFinite(revenueCents) || revenueCents <= 0) {
      // Free tickets still count as tickets sold.
      const existing = ticketsByEvent.get(eventId) || { ticketCount: 0, revenueCents: 0 }
      ticketsByEvent.set(eventId, { ticketCount: existing.ticketCount + 1, revenueCents: existing.revenueCents })
      return
    }

    const existing = ticketsByEvent.get(eventId) || { ticketCount: 0, revenueCents: 0 }
    ticketsByEvent.set(eventId, {
      ticketCount: existing.ticketCount + 1,
      revenueCents: existing.revenueCents + revenueCents,
    })
  })

  // Calculate analytics
  const totalEvents = eventsData.length
  let totalTicketsSold = 0
  let totalRevenueCents = 0
  
  eventsData.forEach((event: any) => {
    const stats = ticketsByEvent.get(String(event.id)) || { ticketCount: 0, revenueCents: 0 }
    totalTicketsSold += stats.ticketCount
    totalRevenueCents += stats.revenueCents
  })
  
  const publishedEvents = eventsData.filter((e: any) => e.is_published).length

  // Events with ticket sales
  const eventsWithSales = eventsData.map((event: any) => {
    const stats = ticketsByEvent.get(String(event.id)) || { ticketCount: 0, revenueCents: 0 }
    return {
      ...event,
      ticketCount: stats.ticketCount,
      revenueCents: stats.revenueCents,
    }
  }).sort((a: any, b: any) => b.ticketCount - a.ticketCount)

  // Prepare chart data - Sales over time (last 7 days)
  const salesByDay: Record<string, { sales: number; revenueCents: number }> = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfWindow = new Date(today)
  startOfWindow.setDate(startOfWindow.getDate() - 6)

  for (const t of allTickets) {
    if (!isValidTicketStatus(t?.status)) continue
    const createdAt = new Date(t?.created_at)
    if (isNaN(createdAt.getTime())) continue
    if (createdAt < startOfWindow) continue

    const key = createdAt.toISOString().split('T')[0]
    const existing = salesByDay[key] || { sales: 0, revenueCents: 0 }
    const cents = Math.round(Number(t?.price_paid || 0) * 100)

    salesByDay[key] = {
      sales: existing.sales + 1,
      revenueCents: existing.revenueCents + (Number.isFinite(cents) ? Math.max(0, cents) : 0),
    }
  }

  const salesChartData = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const day = salesByDay[dateStr] || { sales: 0, revenueCents: 0 }

    salesChartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: day.sales,
      revenue: day.revenueCents / 100,
    })
  }

  // Category distribution
  const categoryData: Record<string, number> = {}
  eventsData.forEach((event: any) => {
    categoryData[event.category] = (categoryData[event.category] || 0) + 1
  })
  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }))

  async function refreshPage() {
    'use server'
    revalidatePath('/organizer/analytics')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <PageHeader
          eyebrow="Organizer"
          title="Analytics"
          subtitle="Track your event performance and insights."
        />

        {/* KPI row */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Calendar}
            label="Total Events"
            value={totalEvents}
            sublabel={`${publishedEvents} published`}
          />
          <MetricCard
            icon={Ticket}
            label="Tickets Sold"
            value={totalTicketsSold}
            sublabel="Across all events"
          />
          <MetricCard
            icon={DollarSign}
            label="Total Revenue"
            value={formatMoneyFromCents(totalRevenueCents, organizerCurrency, 'en-US', { currencyDisplay: 'code' })}
            sublabel="Lifetime earnings"
          />
          <MetricCard
            icon={TrendingUp}
            label="Avg / Event"
            value={totalEvents > 0 ? (totalTicketsSold / totalEvents).toFixed(1) : '0'}
            sublabel="Tickets per event"
          />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#141414] p-6">
            <SectionHeader eyebrow="Last 7 days" title="Sales trend" className="mb-5" />
            <SalesChart data={salesChartData} currency={organizerCurrency} />
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-brand-700" />
                <span className="text-xs text-white/50">Tickets Sold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-brand-400" />
                <span className="text-xs text-white/50">Revenue</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141414] p-6">
            <SectionHeader title="Events by category" className="mb-5" />
            {categoryChartData.length > 0 ? (
              <CategoryChart data={categoryChartData} />
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-white/40">
                No category data yet
              </div>
            )}
          </div>
        </div>

        {/* Top events */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#141414] p-6">
          <SectionHeader eyebrow="Leaderboard" title="Top performing events" className="mb-6" />
          {eventsWithSales.length === 0 ? (
            <OrgEmptyState
              icon={Calendar}
              title="No events yet"
              description="Create your first event to see analytics."
              action={
                <Link
                  href="/organizer/events/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-6 py-3 font-semibold text-white hover:bg-brand-800 transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                  Create Event
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {eventsWithSales.slice(0, 10).map((event: any, index: number) => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-4 transition-colors hover:bg-[#1c1c1c]"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 font-bold text-white text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="block truncate font-semibold text-white hover:text-brand-300 transition-colors"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-white/50 mt-0.5">
                      {new Date(event.start_datetime).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Tickets</p>
                      <p className="text-xl font-bold text-brand-300">{event.ticketCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Revenue</p>
                      <p className="text-xl font-bold text-white">
                        {formatMoneyFromCents(event.revenueCents, organizerCurrency, 'en-US', { currencyDisplay: 'code' })}
                      </p>
                    </div>
                    {!event.is_published && (
                      <span className="rounded-full bg-[#242424] px-2.5 py-1 text-xs font-medium text-white/60">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
