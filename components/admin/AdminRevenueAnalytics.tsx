'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/currency'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Smartphone,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface RevenueData {
  totalRevenueUSD: number
  totalRevenueHTG: number
  totalTickets: number
  totalRevenueUSDWithFxSpread: number
  fxSpread: {
    ticketCount: number
    usdVolume: number
    profitHTG: number
    profitUSD: number
    averageSpreadPercent: number
  }
  byCurrency: {
    HTG: {
      revenue: number
      tickets: number
      averagePrice: number
      convertedToUSD: number
    }
    USD: {
      revenue: number
      tickets: number
      averagePrice: number
    }
  }
  byPaymentMethod: {
    stripe: {
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    moncash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
    natcash: {
      revenueHTG: number
      revenueUSD: number
      tickets: number
      averagePrice: number
    }
  }
  exchangeRates: {
    averageRate: number
    minRate: number
    maxRate: number
    rateSpread: number
  }
}

interface GrowthData {
  revenueGrowth7d: number
  ticketsGrowth7d: number
  revenueGrowth30d: number
  ticketsGrowth30d: number
}

interface Props {
  showFilters?: boolean
}

export function AdminRevenueAnalytics({ showFilters = false }: Props) {
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [growth, setGrowth] = useState<GrowthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/admin/revenue-analytics?type=platform'
      
      if (dateRange !== 'all') {
        const days = parseInt(dateRange)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        
        url += `&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      setRevenue(data.revenue)
      setGrowth(data.growth)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load revenue analytics:', err)
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!revenue) {
    return (
      <div className="text-center py-12 text-white/50">
        Failed to load revenue analytics
      </div>
    )
  }

  const GrowthBadge = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-white/50 text-sm">No change</span>
    const isPositive = value > 0
    return (
      <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All Time' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-[#0a0a0a] text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Total Revenue Overview — compact divided strip */}
      <div className="grid grid-cols-1 divide-y divide-white/10 rounded-lg border border-white/10 md:grid-cols-3 md:divide-y-0 md:divide-x">
        <div className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
              <DollarSign className="h-3.5 w-3.5 text-brand-300" /> Revenue (USD)
            </span>
            {growth && <GrowthBadge value={growth.revenueGrowth7d} />}
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(revenue.totalRevenueUSDWithFxSpread ?? revenue.totalRevenueUSD, 'USD')}
          </div>
          {revenue.fxSpread?.ticketCount > 0 && (
            <div className="mt-1 text-xs text-white/40">
              Incl. FX spread {formatCurrency(revenue.fxSpread.profitUSD || 0, 'USD')}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
              <CreditCard className="h-3.5 w-3.5 text-brand-300" /> Tickets sold
            </span>
            {growth && <GrowthBadge value={growth.ticketsGrowth7d} />}
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">{revenue.totalTickets.toLocaleString()}</div>
        </div>

        <div className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
            <TrendingUp className="h-3.5 w-3.5 text-brand-300" /> Avg ticket price
          </div>
          <div className="text-2xl font-bold tabular-nums text-white">
            {formatCurrency(revenue.totalRevenueUSD / revenue.totalTickets || 0, 'USD')}
          </div>
          <div className="mt-1 text-xs text-white/40">Across all currencies</div>
        </div>
      </div>

      {/* Currency Breakdown */}
      <div className="rounded-xl border border-white/10 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Revenue by Currency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* HTG Revenue */}
          <div className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white/70">HTG (Haitian Gourde)</h4>
              <span className="text-xs bg-[#0a0a0a] text-white/60 px-2 py-0.5 rounded">
                {revenue.byCurrency.HTG.tickets} tickets
              </span>
            </div>
            <div className="space-y-1.5">
              <div>
                <div className="text-xs text-white/50">Total Revenue</div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(revenue.byCurrency.HTG.revenue, 'HTG')}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50">Converted to USD</div>
                <div className="text-base font-semibold text-brand-300">
                  {formatCurrency(revenue.byCurrency.HTG.convertedToUSD, 'USD')}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50">Average Price</div>
                <div className="text-sm font-medium text-white/70">
                  {formatCurrency(revenue.byCurrency.HTG.averagePrice, 'HTG')}
                </div>
              </div>
            </div>
          </div>

          {/* USD Revenue */}
          <div className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white/70">USD (US Dollar)</h4>
              <span className="text-xs bg-[#0a0a0a] text-white/60 px-2 py-0.5 rounded">
                {revenue.byCurrency.USD.tickets} tickets
              </span>
            </div>
            <div className="space-y-1.5">
              <div>
                <div className="text-xs text-white/50">Total Revenue</div>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(revenue.byCurrency.USD.revenue, 'USD')}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/50">Average Price</div>
                <div className="text-sm font-medium text-white/70">
                  {formatCurrency(revenue.byCurrency.USD.averagePrice, 'USD')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FX Spread Profit */}
      {revenue.fxSpread?.ticketCount > 0 && (
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">FX Spread Profit (MonCash USD Events)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-white/50">USD Volume</div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(revenue.fxSpread.usdVolume, 'USD')}
              </div>
              <div className="text-xs text-white/50 mt-1">{revenue.fxSpread.ticketCount} tickets</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-white/50">Spread Profit</div>
              <div className="text-lg font-semibold text-white">
                {formatCurrency(revenue.fxSpread.profitHTG, 'HTG')}
              </div>
              <div className="text-xs text-white/50 mt-1">{formatCurrency(revenue.fxSpread.profitUSD || 0, 'USD')}</div>
              <div className="text-xs text-white/50 mt-1">Computed from base vs effective rate</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-xs text-white/50">Avg Spread</div>
              <div className="text-lg font-semibold text-white">
                {(revenue.fxSpread.averageSpreadPercent * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-white/50 mt-1">From quote metadata</div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white">Revenue by payment method</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              name: 'Stripe',
              icon: CreditCard,
              accent: 'text-blue-300',
              code: 'USD',
              primary: formatCurrency(revenue.byPaymentMethod.stripe.revenueUSD, 'USD'),
              meta: [
                `${revenue.byPaymentMethod.stripe.tickets.toLocaleString()} tickets`,
                `Avg ${formatCurrency(revenue.byPaymentMethod.stripe.averagePrice, 'USD')}`,
              ],
            },
            {
              name: 'MonCash',
              icon: Smartphone,
              accent: 'text-red-300',
              code: 'HTG',
              primary: formatCurrency(revenue.byPaymentMethod.moncash.revenueHTG, 'HTG'),
              meta: [
                `${revenue.byPaymentMethod.moncash.tickets.toLocaleString()} tickets`,
                `≈ ${formatCurrency(revenue.byPaymentMethod.moncash.revenueUSD, 'USD')}`,
              ],
            },
            {
              name: 'NatCash',
              icon: Smartphone,
              accent: 'text-emerald-300',
              code: 'HTG',
              primary: formatCurrency(revenue.byPaymentMethod.natcash.revenueHTG, 'HTG'),
              meta: [
                `${revenue.byPaymentMethod.natcash.tickets.toLocaleString()} tickets`,
                `≈ ${formatCurrency(revenue.byPaymentMethod.natcash.revenueUSD, 'USD')}`,
              ],
            },
          ].map((m) => {
            const Icon = m.icon
            return (
              <div key={m.name} className="rounded-xl border border-white/10 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${m.accent}`} />
                  <h4 className="text-sm font-semibold text-white">{m.name}</h4>
                  <span className="ml-auto text-[11px] font-medium uppercase tracking-wide text-white/35">
                    {m.code}
                  </span>
                </div>
                <div className="text-[26px] font-bold leading-none tabular-nums text-white">
                  {m.primary}
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-3 text-xs text-white/50">
                  {m.meta.map((x, i) => (
                    <span key={i} className="tabular-nums">{x}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Exchange Rate Info */}
      {revenue.exchangeRates.averageRate > 0 && (
        <div className="rounded-xl border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Exchange Rate Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-white/50">Average Rate</div>
              <div className="text-base font-semibold text-white">
                {revenue.exchangeRates.averageRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/50">Min Rate</div>
              <div className="text-base font-semibold text-white">
                {revenue.exchangeRates.minRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/50">Max Rate</div>
              <div className="text-base font-semibold text-white">
                {revenue.exchangeRates.maxRate.toFixed(6)}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/50">Rate Spread</div>
              <div className="text-base font-semibold text-white">
                {revenue.exchangeRates.rateSpread.toFixed(6)}
              </div>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-3">
            HTG to USD conversion rates across all transactions
          </p>
        </div>
      )}
    </div>
  )
}
