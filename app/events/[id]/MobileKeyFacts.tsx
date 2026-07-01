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
    <div className="md:hidden border-y border-white/10 py-4">
      <div className="grid grid-cols-2 gap-3 px-4">
        {/* Date/Time */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-brand-400" />
            </div>
            <span className="label-mono text-[10px] uppercase text-white/50">{t('date')}</span>
          </div>
          <p className="label-mono text-[13px] text-white line-clamp-1">
            {format(new Date(startDate), 'MMM d, yyyy')}
          </p>
          <p className="label-mono text-[11px] text-white/55">
            {format(new Date(startDate), 'h:mm a')}
          </p>
        </div>

        {/* Location */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-400" />
            </div>
            <span className="label-mono text-[10px] uppercase text-white/50">{t('location')}</span>
          </div>
          <p className="label-mono text-[13px] text-white line-clamp-1 min-w-0 break-words">
            {venueName}
          </p>
          <button
            onClick={handleOpenMaps}
            className="text-xs text-brand-400 font-medium hover:text-brand-300 mt-1"
          >
            {t('open_in_maps')} →
          </button>
        </div>

        {/* Price */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="label-mono text-[10px] uppercase text-white/50">{t('price')}</span>
          </div>
          {isFree ? (
            <p className="label-mono text-[13px] font-semibold uppercase text-brand-300">
              {t('free').toUpperCase()}
            </p>
          ) : (
            <>
              <p className="label-mono text-[13px] font-semibold text-brand-300">
                {ticketPrice.toLocaleString()} <span className="text-[11px] text-white/45">{currency}</span>
              </p>
              <p className="label-mono text-[11px] uppercase text-white/55">{t('per_ticket')}</p>
            </>
          )}
        </div>

        {/* Availability */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-400" />
            </div>
            <span className="label-mono text-[10px] uppercase text-white/50">{t('ticket.tickets')}</span>
          </div>
          <p className={`label-mono text-[13px] uppercase ${isSoldOut ? 'text-red-400' : remainingTickets < 10 ? 'text-amber-400' : 'text-white'}`}>
            {isSoldOut ? t('ticket.sold_out') : t('ticket.remaining', { count: remainingTickets })}
          </p>
          {!isSoldOut && remainingTickets < 10 && (
            <p className="label-mono text-[10px] uppercase text-amber-500">{t('ticket.almost_gone')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
