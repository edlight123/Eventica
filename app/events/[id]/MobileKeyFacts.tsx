'use client'

// The mobile key facts: four quiet lines, no icon tiles, no boxes (owner call,
// 2026-08-29: "heavy boxes and icons"). Hierarchy is typographic — the date
// leads, the price is teal because price is semantic, everything else recedes.
//
// Every t() carries a defaultValue — a missing key once rendered raw
// ("open_in_maps →") on the page organizers share the most.

import { useTranslation } from 'react-i18next'
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

  const priceLine = isFree
    ? t('free', { defaultValue: 'Free' })
    : `${hasFreeOption ? `${t('free', { defaultValue: 'Free' })} – ` : ''}${ticketPrice.toLocaleString()} ${currency}`

  return (
    <div className="md:hidden border-b border-white/10 px-4 py-5">
      <p className="text-[15px] font-medium text-white">
        {format(new Date(startDate), 'EEE, MMM d, yyyy · h:mm a')}
      </p>

      <p className="mt-1.5 text-[14px] text-white/60">
        {venueName}
        <span className="text-white/25"> · </span>
        <button onClick={handleOpenMaps} className="text-brand-400 hover:text-brand-300">
          {t('open_in_maps', { defaultValue: 'Open in maps' })} →
        </button>
      </p>

      <p className="mt-3 text-[15px] font-medium text-brand-300">
        {priceLine}
        {!isFree && (
          <span className="ml-1.5 text-[13px] font-normal text-white/45">
            {feesIncluded
              ? t('events.fees_included', { defaultValue: 'Fees included' })
              : t('per_ticket', { defaultValue: 'per ticket' })}
          </span>
        )}
      </p>

      <p
        className={`mt-1 text-[13px] ${
          isSoldOut ? 'text-red-400' : remainingTickets < 10 ? 'text-amber-400' : 'text-white/45'
        }`}
      >
        {isSoldOut
          ? t('ticket.sold_out', { defaultValue: 'Sold out' })
          : t('ticket.remaining', { count: remainingTickets, defaultValue: '{{count}} remaining' })}
        {!isSoldOut && remainingTickets < 10 && (
          <> · {t('ticket.almost_gone', { defaultValue: 'Almost gone' })}</>
        )}
      </p>
    </div>
  )
}
