'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'
import { formatMoneyFromCents, formatMultiCurrencyFromCents } from '@/lib/money'

type TimeRange = '7d' | '30d' | 'lifetime'

interface SalesSnapshotProps {
  data: {
    '7d': {
      upcomingEvents: number
      ticketsSold: number
      revenueCents: number
      revenueByCurrencyCents?: Record<string, number>
      avgTicketsPerEvent: number
    }
    '30d': {
      upcomingEvents: number
      ticketsSold: number
      revenueCents: number
      revenueByCurrencyCents?: Record<string, number>
      avgTicketsPerEvent: number
    }
    lifetime: {
      upcomingEvents: number
      ticketsSold: number
      revenueCents: number
      revenueByCurrencyCents?: Record<string, number>
      avgTicketsPerEvent: number
    }
  }
  currency?: string
}

export function SalesSnapshot({ data, currency = 'HTG' }: SalesSnapshotProps) {
  const { t } = useTranslation('common')
  const [range, setRange] = useState<TimeRange>('7d')
  const metrics = data[range]

  const hasMultipleCurrencies = (() => {
    const breakdown = metrics.revenueByCurrencyCents || {}
    const nonZeroCurrencies = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    return nonZeroCurrencies.length > 1
  })()

  const formatRevenue = () => {
    const breakdown = metrics.revenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)

    if (hasMultipleCurrencies) {
      return formatMultiCurrencyFromCents(breakdown)
    }

    if (nonZero.length === 1) {
      const [onlyCurrency, cents] = nonZero[0]
      if ((cents || 0) === 0) return 'No earnings yet'
      return formatMoneyFromCents(Number(cents || 0), onlyCurrency, 'en-US', { currencyDisplay: 'code' })
    }

    if (metrics.revenueCents === 0) return 'No earnings yet'
    return formatMoneyFromCents(metrics.revenueCents, currency, 'en-US', { currencyDisplay: 'code' })
  }

  const getRangeLabel = (r: TimeRange) => {
    switch (r) {
      case '7d': return t('sales_snapshot.7d')
      case '30d': return t('sales_snapshot.30d')
      case 'lifetime': return t('sales_snapshot.lifetime')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 text-lg">{t('sales_snapshot.title')}</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', 'lifetime'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                range === r
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {r === '7d' ? '7d' : r === '30d' ? '30d' : 'Lifetime'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">{getRangeLabel(range)}</p>

      {/* Metrics Grid — unified brand-chip styling (calm + on-brand, matches admin) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-brand-700" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sales_snapshot.events')}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.upcomingEvents}</p>
          <p className="text-xs text-gray-500">{t('sales_snapshot.upcoming')}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-700" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sales_snapshot.tickets')}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.ticketsSold}</p>
          <p className="text-xs text-gray-500">{t('sales_snapshot.sold')}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-brand-700" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sales_snapshot.revenue')}</p>
          </div>
          <p className={`font-bold text-gray-900 mb-1 ${metrics.revenueCents === 0 ? 'text-xl' : 'text-3xl'}`}>
            {formatRevenue()}
          </p>
          <p className="text-xs text-gray-500">
            {metrics.revenueCents === 0
              ? 'Start selling tickets'
              : hasMultipleCurrencies
                ? 'Multiple currencies'
                : t('sales_snapshot.earned')}
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-700" />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('sales_snapshot.avg_event')}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {metrics.avgTicketsPerEvent.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">{t('sales_snapshot.tickets_per_event')}</p>
        </div>
      </div>
    </div>
  )
}
