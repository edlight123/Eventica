'use client'

import { Ticket, DollarSign, Users, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatMoneyFromCents, formatMultiCurrencyFromCents, normalizeCurrency } from '@/lib/money'

interface EventKpisProps {
  stats: {
    ticketsSold: number
    capacity: number
    revenueCents: number
    revenueByCurrencyCents?: Record<string, number>
    currency?: string | null
    netRevenueCents?: number
    netRevenueByCurrencyCents?: Record<string, number>
    checkedIn: number
    conversion?: number
    views?: number
  }
}

export function EventKpis({ stats }: EventKpisProps) {
  const { t } = useTranslation('common')
  const progress = stats.capacity > 0 ? (stats.ticketsSold / stats.capacity) * 100 : 0
  const checkInRate = stats.ticketsSold > 0 ? (stats.checkedIn / stats.ticketsSold) * 100 : 0

  const revenueText = (() => {
    const breakdown = stats.revenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length > 1) return formatMultiCurrencyFromCents(breakdown)
    if (nonZero.length === 1) {
      const [currency, cents] = nonZero[0]
      return formatMoneyFromCents(Number(cents || 0), currency, 'en-US', { currencyDisplay: 'code' })
    }
    return formatMoneyFromCents(Number(stats.revenueCents || 0), normalizeCurrency(stats.currency, 'HTG'), 'en-US', { currencyDisplay: 'code' })
  })()

  const netRevenueText = (() => {
    if (stats.netRevenueCents === undefined && !stats.netRevenueByCurrencyCents) return null
    const breakdown = stats.netRevenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length > 1) return formatMultiCurrencyFromCents(breakdown)
    if (nonZero.length === 1) {
      const [currency, cents] = nonZero[0]
      return formatMoneyFromCents(Number(cents || 0), currency, 'en-US', { currencyDisplay: 'code' })
    }
    return formatMoneyFromCents(Number(stats.netRevenueCents || 0), normalizeCurrency(stats.currency, 'HTG'), 'en-US', { currencyDisplay: 'code' })
  })()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Tickets Sold */}
      <div className="bg-[#0a0a0a] rounded-xl  p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg">
            <Ticket className="w-5 h-5 text-brand-300" />
          </div>
          <span className="text-xs font-medium text-white/50">{t('organizer.sold_capacity')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.ticketsSold}</span>
            <span className="text-sm text-white/50">/ {stats.capacity}</span>
          </div>
          <div className="w-full bg-[#0a0a0a] rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/60">{t('organizer.capacity_percent', { percent: progress.toFixed(1) })}</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-[#0a0a0a] rounded-xl  p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg">
            <DollarSign className="w-5 h-5 text-brand-300" />
          </div>
          <span className="text-xs font-medium text-white/50">{t('organizer.revenue')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white truncate" title={revenueText}>
              {revenueText}
            </span>
          </div>
          {netRevenueText && <p className="text-xs text-white/60">Net: {netRevenueText}</p>}
        </div>
      </div>

      {/* Check-ins */}
      <div className="bg-[#0a0a0a] rounded-xl  p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg">
            <Users className="w-5 h-5 text-brand-300" />
          </div>
          <span className="text-xs font-medium text-white/50">{t('organizer.check_ins')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white">{stats.checkedIn}</span>
            <span className="text-sm text-white/50">/ {stats.ticketsSold}</span>
          </div>
          {stats.ticketsSold > 0 && (
            <>
              <div className="w-full bg-[#0a0a0a] rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(checkInRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/60">{t('organizer.checked_in_percent', { percent: checkInRate.toFixed(1) })}</p>
            </>
          )}
        </div>
      </div>

      {/* Conversion (only if views exist) */}
      {stats.views !== undefined && stats.views > 0 && (
        <div className="bg-[#0a0a0a] rounded-xl  p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-brand-300" />
            </div>
            <span className="text-xs font-medium text-white/50">CONVERSION</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-white">
                {((stats.ticketsSold / stats.views) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-white/60">{stats.views} views</p>
          </div>
        </div>
      )}
    </div>
  )
}
