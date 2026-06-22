'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, DollarSign, Edit, Eye, QrCode, Share2, Sparkles } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { formatMoneyFromCents, formatPrimaryMoneyFromCentsByCurrency } from '@/lib/money'

interface OrganizerEventCardProps {
  event: {
    id: string
    title: string
    banner_image_url?: string
    start_datetime: string
    status: 'published' | 'draft'
    ticketsSold: number
    capacity: number
    city?: string
    venue_name?: string
    currency?: string
    revenue?: number
    revenueByCurrencyCents?: Record<string, number>
  }
}

export function OrganizerEventCard({ event }: OrganizerEventCardProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const manageHref = `/organizer/events/${event.id}`
  const safeCapacity = Number.isFinite(event.capacity) ? event.capacity : Number(event.capacity || 0)
  const safeTicketsSold = Number.isFinite(event.ticketsSold) ? event.ticketsSold : Number(event.ticketsSold || 0)
  const progress = safeCapacity > 0 ? (safeTicketsSold / safeCapacity) * 100 : 0
  const startDate = new Date(event.start_datetime)

  const revenueText = (() => {
    const breakdown = event.revenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length >= 1) {
      return formatPrimaryMoneyFromCentsByCurrency(breakdown, event.currency, 'en-US', { currencyDisplay: 'code' })
    }

    const cents = typeof event.revenue === 'number' ? event.revenue : Number(event.revenue || 0)
    if (!Number.isFinite(cents) || cents === 0) return '—'
    return formatMoneyFromCents(cents, event.currency || 'HTG', 'en-US', { currencyDisplay: 'code' })
  })()

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(manageHref)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(manageHref)
        }
      }}
      className="block bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-medium transition-all group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-brand-100 to-accent-100">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-white/40 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={event.status === 'published' ? 'success' : 'neutral'} size="sm">
            {event.status === 'published' ? t('event_card.published') : t('event_card.draft')}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          <span>
            {startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          {(event.venue_name || event.city) && (
            <>
              <span>•</span>
              <span className="truncate">{event.venue_name || event.city}</span>
            </>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">{t('event_card.tickets_sold')}</span>
            <span className="font-semibold text-gray-900">
              {safeTicketsSold} / {safeCapacity}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress.toFixed(0)}% {t('event_card.capacity')}</p>
        </div>

        {/* Revenue */}
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Revenue:</span>
          <span className="font-semibold text-gray-900 truncate">{revenueText}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-5 gap-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-brand-50 transition-colors group/btn"
            title={t('event_card.manage')}
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="w-4 h-4 text-gray-600 group-hover/btn:text-brand-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-brand-600 font-medium">{t('event_card.manage')}</span>
          </Link>

          <Link
            href={`/organizer/events/${event.id}/earnings`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-green-50 transition-colors group/btn"
            title="Earnings"
            onClick={(e) => e.stopPropagation()}
          >
            <DollarSign className="w-4 h-4 text-gray-600 group-hover/btn:text-green-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-green-600 font-medium">Earnings</span>
          </Link>

          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-purple-50 transition-colors group/btn"
            title={t('event_card.promote')}
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="w-4 h-4 text-gray-600 group-hover/btn:text-purple-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-purple-600 font-medium">{t('event_card.promote')}</span>
          </Link>

          <Link
            href={`/organizer/events/${event.id}/attendees`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-teal-50 transition-colors group/btn"
            title={t('event_card.attendees')}
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-4 h-4 text-gray-600 group-hover/btn:text-teal-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-teal-600 font-medium">{t('event_card.attendees')}</span>
          </Link>

          <Link
            href={`/organizer/scan/${event.id}`}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-orange-50 transition-colors group/btn"
            title={t('event_card.checkin')}
            onClick={(e) => e.stopPropagation()}
          >
            <QrCode className="w-4 h-4 text-gray-600 group-hover/btn:text-orange-600" />
            <span className="text-xs text-gray-600 group-hover/btn:text-orange-600 font-medium">{t('event_card.checkin')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
