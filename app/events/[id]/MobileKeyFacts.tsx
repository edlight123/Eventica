'use client'

import { useTranslation } from 'react-i18next'
import { Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import { format } from 'date-fns'

interface MobileKeyFactsProps {
  startDate: string
  venueName: string
  city: string
  address: string
  commune: string
  isFree: boolean
  ticketPrice: number
  currency: string
  remainingTickets: number
  isSoldOut: boolean
}

export default function MobileKeyFacts({
  startDate,
  venueName,
  city,
  address,
  commune,
  isFree,
  ticketPrice,
  currency,
  remainingTickets,
  isSoldOut
}: MobileKeyFactsProps) {
  const { t } = useTranslation('common')
  
  const handleOpenMaps = () => {
    const query = encodeURIComponent(address || `${venueName}, ${commune}, ${city}`)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const mapsUrl = isIOS
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`
    window.open(mapsUrl, '_blank')
  }

  return (
    <div className="md:hidden bg-gray-50 border-y border-gray-200 py-4">
      <div className="grid grid-cols-2 gap-3 px-4">
        {/* Date/Time */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">{t('date')}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 line-clamp-1">
            {format(new Date(startDate), 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-gray-600">
            {format(new Date(startDate), 'h:mm a')}
          </p>
        </div>

        {/* Location */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">{t('location')}</span>
          </div>
          <p className="text-sm font-bold text-gray-900 line-clamp-1 min-w-0 break-words">
            {venueName}
          </p>
          <button
            onClick={handleOpenMaps}
            className="text-xs text-brand-600 font-medium hover:text-brand-700 mt-1"
          >
            {t('open_in_maps')} →
          </button>
        </div>

        {/* Price */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">{t('price')}</span>
          </div>
          {isFree ? (
            <p className="text-sm font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              {t('free').toUpperCase()}
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-900">
                {ticketPrice} {currency}
              </p>
              <p className="text-xs text-gray-600">{t('per_ticket')}</p>
            </>
          )}
        </div>

        {/* Availability */}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-gray-500">{t('ticket.tickets')}</span>
          </div>
          <p className={`text-sm font-bold ${isSoldOut ? 'text-red-600' : remainingTickets < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
            {isSoldOut ? t('ticket.sold_out') : t('ticket.remaining', { count: remainingTickets })}
          </p>
          {!isSoldOut && remainingTickets < 10 && (
            <p className="text-xs text-amber-600 font-medium">{t('ticket.almost_gone')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
