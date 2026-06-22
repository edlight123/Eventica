'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { MoreVertical, Eye, Edit, Copy, Trash2, AlertCircle, Users, DollarSign, Calendar, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMoneyFromCents, formatPrimaryMoneyFromCentsByCurrency, normalizeCurrency } from '@/lib/money'
import { StatusChip } from '@/components/ui/kit'

interface EventData {
  id: string
  title: string
  start_datetime: string
  city: string
  commune?: string
  category: string
  is_published: boolean
  banner_image_url?: string
  tickets_sold?: number
  total_tickets?: number
  revenue?: number
  revenueByCurrencyCents?: Record<string, number>
  currency?: string
  checked_in?: number
  ticket_tiers?: any[]
  location_name?: string
  join_url?: string
}

interface OrganizerEventCardProps {
  event: EventData
  showNeedsAttention?: boolean
  onDuplicate?: (eventId: string) => void
  onDelete?: (eventId: string) => void
}

export default function OrganizerEventCard({
  event,
  showNeedsAttention = true,
  onDuplicate,
  onDelete
}: OrganizerEventCardProps) {
  const { t } = useTranslation('organizer')
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const ticketsSold = event.tickets_sold || 0
  const totalTickets = event.total_tickets || 0
  const salesPercentage = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0
  const isSoldOut = ticketsSold >= totalTickets && totalTickets > 0
  const revenue = event.revenue
  const checkedIn = event.checked_in || 0

  const revenueText = (() => {
    const breakdown = event.revenueByCurrencyCents || {}
    const nonZero = Object.entries(breakdown).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length >= 1) {
      return formatPrimaryMoneyFromCentsByCurrency(breakdown, event.currency, 'en-US', { currencyDisplay: 'code' })
    }

    const major = typeof revenue === 'number' ? revenue : Number(revenue || 0)
    if (!Number.isFinite(major) || major === 0) return '—'
    return formatMoneyFromCents(
      Math.round(major * 100),
      normalizeCurrency(event.currency, 'HTG'),
      'en-US',
      { currencyDisplay: 'code' }
    )
  })()

  // Needs attention logic
  const missingCover = !event.banner_image_url
  // In Firestore-backed list views, `ticket_tiers` is often not embedded on the event.
  // Avoid showing a false “needs attention” warning in that case.
  const missingTickets = Array.isArray(event.ticket_tiers) ? event.ticket_tiers.length === 0 : false
  const isDraft = !event.is_published
  const noSales = ticketsSold === 0 && event.is_published

  const needsAttention = missingCover || missingTickets || noSales

  return (
    <div className="bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 overflow-hidden border border-gray-100 group">
      {/* Event Banner/Thumbnail */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {event.banner_image_url ? (
          <Image
            src={event.banner_image_url}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-700 to-[#0C5E57]">
            <span className="font-display text-6xl leading-none text-[#F8F5EE]">T</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          {isSoldOut && (
            <StatusChip tone="danger" className="shadow-sm">
              {t('event_card_detail.sold_out')}
            </StatusChip>
          )}
          {showNeedsAttention && needsAttention && (
            <StatusChip tone="warning" icon={AlertCircle} className="shadow-sm">
              {t('event_card_detail.needs_attention')}
            </StatusChip>
          )}
        </div>

        {/* Status Pill (Bottom Left) */}
        <div className="absolute bottom-3 left-3">
          <StatusChip tone={event.is_published ? 'success' : 'neutral'} className="shadow-sm">
            {event.is_published ? t('event_card_detail.published') : t('event_card_detail.draft')}
          </StatusChip>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Category Badge */}
        <div className="mb-3">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md">
            {event.category}
          </span>
        </div>

        {/* Event Title */}
        <Link
          href={`/organizer/events/${event.id}`}
          className="block mb-3 group/title"
        >
          <h3 className="font-display text-lg text-gray-900 line-clamp-2 group-hover/title:text-brand-700 transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mr-2">
              <Calendar className="w-4 h-4 text-brand-700" />
            </div>
            <span className="font-medium text-xs">
              {format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center mr-2">
              <MapPin className="w-4 h-4 text-brand-700" />
            </div>
            <span className="font-medium text-xs line-clamp-1">
              {event.location_name || event.commune || event.city}
            </span>
          </div>
        </div>

        {/* Ticket Sales Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600">{t('event_card_detail.ticket_sales')}</span>
            <span className="text-xs font-bold text-gray-900">
              {ticketsSold} / {totalTickets}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                salesPercentage >= 100 ? 'bg-red-600' : 'bg-brand-600'
              }`}
              style={{ width: `${Math.min(salesPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{salesPercentage.toFixed(0)}% {t('event_card_detail.sold')}</p>
        </div>

        {/* Revenue & Check-ins */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <DollarSign className="w-3.5 h-3.5 text-brand-700" />
              <p className="text-xs text-gray-500 font-medium">{t('event_card_detail.revenue')}</p>
            </div>
            <p className="text-base font-bold text-gray-900 truncate">
              {revenueText}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Users className="w-3.5 h-3.5 text-brand-700" />
              <p className="text-xs text-gray-500 font-medium">{t('event_card_detail.check_ins')}</p>
            </div>
            <p className="text-base font-bold text-gray-900">{checkedIn}</p>
          </div>
        </div>

        {/* Needs Attention Messages */}
        {showNeedsAttention && needsAttention && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ Issues to Fix:</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {missingCover && <li>• Add a cover image</li>}
              {missingTickets && <li>• Add at least one ticket tier</li>}
              {noSales && <li>• No tickets sold yet</li>}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link
            href={`/organizer/events/${event.id}`}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 transition-all text-center flex items-center justify-center gap-1"
          >
            <Eye className="w-4 h-4" />
            <span>{t('event_card_detail.view')}</span>
          </Link>
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-sm transition-all text-center flex items-center justify-center gap-1"
          >
            <Edit className="w-4 h-4" />
            <span>{t('event_card_detail.edit')}</span>
          </Link>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="px-3 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-medium border border-gray-200 py-1 z-20">
                  {onDuplicate && (
                    <button
                      onClick={() => {
                        onDuplicate(event.id)
                        setShowActionsMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{t('event_card_detail.duplicate')}</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete(event.id)
                        setShowActionsMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('event_card_detail.delete')}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
