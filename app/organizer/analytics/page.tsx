import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SalesChart from '@/components/charts/SalesChart'
import CategoryChart from '@/components/charts/CategoryChart'
import { TrendingUp, DollarSign, Ticket, Calendar, ArrowLeft } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { revalidatePath } from 'next/cache'
import { formatMoneyFromCents, normalizeCurrency } from '@/lib/money'

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
    
      <div className="bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-10 h-10 text-brand-600" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track your event performance and insights</p>
          </div>
          <Link
            href="/organizer/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-medium transition-all font-semibold text-gray-700 hover:text-brand-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Events
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Events</h3>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{totalEvents}</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">{publishedEvents} Published</Badge>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tickets Sold</h3>
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-brand-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-brand-700 mb-2">{totalTicketsSold}</p>
            <p className="text-sm text-gray-600">Across all events</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</h3>
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-accent-700 mb-2">
              {formatMoneyFromCents(totalRevenueCents, organizerCurrency, 'en-US', { currencyDisplay: 'code' })}
            </p>
            <p className="text-sm text-gray-600">Lifetime earnings</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg per Event</h3>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-700 mb-2">
              {totalEvents > 0 ? (totalTicketsSold / totalEvents).toFixed(1) : '0'}
            </p>
            <p className="text-sm text-gray-600">Tickets per event</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <h2 className="font-display text-xl text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              Sales Trend (Last 7 Days)
            </h2>
            <SalesChart data={salesChartData} currency={organizerCurrency} />
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Tickets Sold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <h2 className="font-display text-xl text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-accent-600" />
              Events by Category
            </h2>
            {categoryChartData.length > 0 ? (
              <CategoryChart data={categoryChartData} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Events */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
          <h2 className="font-display text-2xl text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-brand-600" />
            Top Performing Events
          </h2>
          {eventsWithSales.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">📊</div>
              <h3 className="font-display text-xl text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to see analytics!</p>
              <Link
                href="/organizer/events/new"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold hover:shadow-glow transition-all"
              >
                <Calendar className="w-5 h-5" />
                Create Event
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsWithSales.slice(0, 10).map((event: any, index: number) => (
                <div key={event.id} className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/organizer/events/${event.id}`} className="font-bold text-gray-900 hover:text-brand-700 transition-colors block truncate">
                      {event.title}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Tickets</p>
                      <p className="text-2xl font-bold text-brand-700">{event.ticketCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Revenue</p>
                      <p className="text-2xl font-bold text-accent-700">
                        {formatMoneyFromCents(event.revenueCents, organizerCurrency, 'en-US', { currencyDisplay: 'code' })}
                      </p>
                    </div>
                    {!event.is_published && (
                      <Badge variant="neutral" size="md">Draft</Badge>
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
