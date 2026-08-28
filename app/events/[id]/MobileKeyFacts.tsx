'use client'

// The mobile key-facts grid: date / location / price / availability.
//
// Two rules learned the hard way (live screenshots, 2026-08-28):
// - every t() here carries a defaultValue — a missing key was rendering raw
//   ("open_in_maps →", "PER_TICKET") on the page organizers share the most;
// - mono is for identifiers only. Dates, venues and prices are language, so
//   they take the sans; the tiny uppercase labels are the Inter utility voice.

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
  /**
   * True for a 'mixed' event (free AND paid tiers side by side). `ticketPrice` is
   * then the cheapest PAID tier and the price reads as a "Free – X" range, so we
   * never advertise "0" for an event that actually charges.
   */
  hasFreeOption?: boolean
  /**
   * The ALL-IN per-ticket price. In a buyer-pays market (US/CA/FR) the caller has
   * already added the fee, so this is what the buyer is charged rather than the face
   * value — `feesIncluded` says so on the card.
   */
  ticketPrice: number
  feesIncluded?: boolean
  currency: string
  remainingTickets: number
  isSoldOut: boolean
}

const LABEL_CLASS = 'text-[10px] font-medium uppercase tracking-[0.14em] text-white/50'

export default function MobileKeyFacts({
  startDate,
  venueName,
  city,
  address,
  commune,
  isFree,
  hasFreeOption = false,
  ticketPrice,
  feesIncluded = false,
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
            <span className={LABEL_CLASS}>{t('date', { defaultValue: 'Date' })}</span>
          </div>
          <p className="text-[14px] font-semibold text-white line-clamp-1">
            {format(new Date(startDate), 'MMM d, yyyy')}
          </p>
          <p className="text-[12px] text-white/55">
            {format(new Date(startDate), 'h:mm a')}
          </p>
        </div>

        {/* Location */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-brand-400" />
            </div>
            <span className={LABEL_CLASS}>{t('location', { defaultValue: 'Location' })}</span>
          </div>
          <p className="text-[14px] font-semibold text-white line-clamp-1 min-w-0 break-words">
            {venueName}
          </p>
          <button
            onClick={handleOpenMaps}
            className="text-xs text-brand-400 font-medium hover:text-brand-300 mt-1"
          >
            {t('open_in_maps', { defaultValue: 'Open in maps' })} →
          </button>
        </div>

        {/* Price */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <span className={LABEL_CLASS}>{t('price', { defaultValue: 'Price' })}</span>
          </div>
          {isFree ? (
            <p className="text-[14px] font-semibold text-brand-300">
              {t('free', { defaultValue: 'Free' })}
            </p>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-brand-300">
                {hasFreeOption && <span>{t('free', { defaultValue: 'Free' })} – </span>}
                {ticketPrice.toLocaleString()}{' '}
                <span className="text-[11px] text-white/45">{currency}</span>
              </p>
              <p className="text-[12px] text-white/55">
                {feesIncluded
                  ? t('events.fees_included', { defaultValue: 'Fees included' })
                  : t('per_ticket', { defaultValue: 'per ticket' })}
              </p>
            </>
          )}
        </div>

        {/* Availability */}
        <div className="rounded-xl p-3 ">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-brand-400" />
            </div>
            <span className={LABEL_CLASS}>{t('ticket.tickets', { defaultValue: 'Tickets' })}</span>
          </div>
          <p
            className={`text-[14px] font-semibold ${
              isSoldOut ? 'text-red-400' : remainingTickets < 10 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {isSoldOut
              ? t('ticket.sold_out', { defaultValue: 'Sold out' })
              : t('ticket.remaining', { count: remainingTickets, defaultValue: '{{count}} remaining' })}
          </p>
          {!isSoldOut && remainingTickets < 10 && (
            <p className="text-[11px] text-amber-500">
              {t('ticket.almost_gone', { defaultValue: 'Almost gone' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
