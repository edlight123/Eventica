'use client'

import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Users, DollarSign, Edit, Eye, QrCode, Share2, Sparkles } from 'lucide-react'
import { formatMoneyFromCents, formatMultiCurrencyFromCents } from '@/lib/money'

interface NextEventHeroProps {
  event: {
    id: string
    title: string
    banner_image_url?: string
    start_datetime: string
    venue_name?: string
    city?: string
    ticketsSold: number
    capacity: number
    revenue: number
    currency?: string
    revenueByCurrencyCents?: Record<string, number>
  } | null
}

export function NextEventHero({ event }: NextEventHeroProps) {
  const { t } = useTranslation('common')
  
  if (!event) {
    return (
      <div className="bg-gradient-to-br from-brand-500/15 to-brand-600/10 rounded-2xl  p-8 text-center">
        <div className="w-16 h-16 bg-[#0a0a0a] rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{t('next_event.no_upcoming_title')}</h3>
        <p className="text-white/60 mb-6">{t('next_event.no_upcoming_desc')}</p>
        <Link
          href="/organizer/events/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl font-bold hover:shadow-glow transition-all"
        >
          <Calendar className="w-5 h-5" />
          {t('next_event.create_event')}
        </Link>
      </div>
    )
  }

  const startDate = new Date(event.start_datetime)
  const now = new Date()
  const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const progress = event.capacity > 0 ? (event.ticketsSold / event.capacity) * 100 : 0

  const revenueText = (() => {
    const breakdown = event.revenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length > 1) return formatMultiCurrencyFromCents(breakdown)
    if (nonZero.length === 1) {
      const [currency, cents] = nonZero[0]
      return formatMoneyFromCents(Number(cents || 0), currency, 'en-US', { currencyDisplay: 'code' })
    }

    return formatMoneyFromCents(event.revenue, event.currency || 'HTG', 'en-US', { currencyDisplay: 'code' })
  })()

  const getCountdownText = () => {
    if (daysUntil < 0) return t('next_event.event_passed')
    if (daysUntil === 0) return t('next_event.today')
    if (daysUntil === 1) return t('next_event.tomorrow')
    if (daysUntil <= 7) return t('next_event.in_days', { count: daysUntil })
    return t('next_event.in_weeks', { count: Math.ceil(daysUntil / 7) })
  }

  return (
    <div className="bg-[#0a0a0a] rounded-2xl shadow-soft  overflow-hidden">
      {/* Banner Section */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-brand-600 to-brand-700">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/15 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
          <p className="text-sm font-bold text-brand-300">{getCountdownText()}</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{event.title}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {startDate.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {(event.venue_name || event.city) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{event.venue_name || event.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#0a0a0a] rounded-xl p-4 ">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-brand-300" />
              <p className="text-xs font-medium text-white/50">{t('next_event.tickets_sold')}</p>
            </div>
            <p className="text-2xl font-bold text-white">{event.ticketsSold}</p>
            <p className="text-xs text-white/50">{t('next_event.of')} {event.capacity}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl p-4 ">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-brand-300" />
              <p className="text-xs font-medium text-white/50">{t('next_event.revenue')}</p>
            </div>
            <p className="text-2xl font-bold text-white truncate" title={revenueText}>
              {revenueText}
            </p>
            <p className="text-xs text-white/50">{t('next_event.earned')}</p>
          </div>

          <div className="bg-[#0a0a0a] rounded-xl p-4 ">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-brand-300" />
              <p className="text-xs font-medium text-white/50">{t('next_event.capacity')}</p>
            </div>
            <p className="text-2xl font-bold text-white">{progress.toFixed(0)}%</p>
            <p className="text-xs text-white/50">{t('next_event.filled')}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors text-sm"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">{t('next_event.edit')}</span>
          </Link>
          
          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0a0a0a] border-2 border-white/10 text-white/70 rounded-xl font-semibold hover:border-brand-500 hover:text-brand-300 transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">{t('next_event.attendees')}</span>
          </Link>
          
          <Link
            href={`/organizer/scan/${event.id}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0a0a0a] border-2 border-white/10 text-white/70 rounded-xl font-semibold hover:border-brand-500 hover:text-brand-300 transition-colors text-sm"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">{t('next_event.check_in')}</span>
          </Link>
          
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: event.title,
                  url: `${window.location.origin}/events/${event.id}`
                })
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
              }
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0a0a0a] border-2 border-white/10 text-white/70 rounded-xl font-semibold hover:border-brand-500 hover:text-brand-300 transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('next_event.share')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
