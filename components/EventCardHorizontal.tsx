'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { getPosterTheme, getAvatarColors } from '@/lib/posterGradient'
import { getCardPriceDisplay } from '@/lib/discover/helpers'

interface Event {
  id: string
  title: string
  description: string
  category: string
  city: string
  venue_name: string
  start_datetime: string
  ticket_price: number
  currency: string
  total_tickets: number
  tickets_sold: number
  banner_image_url?: string | null
  tags?: string[] | null
  users?: {
    full_name: string
    is_verified: boolean
  }
}

interface EventCardHorizontalProps {
  event: Event
  /** Viewer's city. When set, shows venue alone for local events, appends city for out-of-town ones. */
  userCity?: string
}

/**
 * Compact editorial "list row" card used in vertical mobile lists.
 * A poster thumbnail (image or deterministic gradient) sits beside the
 * serif title, metadata and price — matching the home / discover aesthetic.
 */
export default function EventCardHorizontal({ event, userCity }: EventCardHorizontalProps) {
  const { t } = useTranslation('common')

  const totalTickets = Number(event.total_tickets) || 0
  const ticketsSold = Number(event.tickets_sold) || 0
  const remainingTickets = totalTickets > 0 ? Math.max(0, totalTickets - ticketsSold) : null
  const isSoldOut = totalTickets > 0 && remainingTickets === 0
  // Freeness comes from the tier set, not from `ticket_price` (the LOWEST tier
  // price, hence 0 for an event that has a free tier next to paid ones).
  const priceDisplay = getCardPriceDisplay(event as any)
  const isTrending = ticketsSold > 10
  const selloutSoon = !isSoldOut && remainingTickets !== null && remainingTickets < 10

  const startDate = new Date(event.start_datetime)
  const validDate = isValid(startDate)
  const theme = getPosterTheme(event.id || event.title, event.category)
  const hasImage = Boolean(event.banner_image_url)
  const avatarColors = getAvatarColors(event.id || event.title, Math.min(ticketsSold, 3))

  const statusLabel = isSoldOut
    ? t('ticket.sold_out_caps')
    : selloutSoon
    ? t('ticket.remaining_short', { count: remainingTickets })
    : isTrending
    ? t('events.trending')
    : null

  return (
    <Link href={`/events/${event.id}`} prefetch={true} className="group block">
      <article className="hover-lift flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 shadow-poster-sm group-hover:border-brand-400/40">
        {/* Poster thumbnail */}
        <div
          className="relative aspect-[3/4] w-[88px] shrink-0 overflow-hidden rounded-xl"
          style={hasImage ? undefined : { backgroundImage: theme.bg }}
        >
          {hasImage ? (
            <>
              <Image
                src={event.banner_image_url as string}
                alt={event.title}
                fill
                className="object-cover"
                sizes="88px"
                quality={70}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
              <span className="font-display text-[15px] leading-[0.95] text-white line-clamp-3 drop-shadow">
                {event.title}
              </span>
            </div>
          )}
          <span className="eyebrow absolute left-1.5 top-1.5 rounded bg-black/35 px-1.5 py-1 text-[8px] tracking-[0.1em] text-white backdrop-blur-md">
            {event.category}
          </span>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="eyebrow text-[10px] tracking-[0.08em] text-brand-400">
              {validDate ? `${format(startDate, 'EEE, MMM d')} · ${format(startDate, 'h a')}` : ''}
            </div>
          </div>

          <h3 className="mt-0.5 font-grotesk text-[17px] font-semibold leading-[1.05] text-white line-clamp-2">
            {event.title}
          </h3>

          <p className="mt-0.5 truncate text-xs text-white/70">
            {(() => {
              const venue = (event.venue_name || '').trim()
              const city = (event.city || '').trim()
              if (!venue) return city
              return userCity && city && city !== userCity ? `${venue} · ${city}` : venue
            })()}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center">
              {ticketsSold > 0 && (
                <div className="flex">
                  {avatarColors.map((c, i) => (
                    <span
                      key={i}
                      className="h-[18px] w-[18px] rounded-full ring-2 ring-[#0a0a0a]"
                      style={{ background: c, marginLeft: i === 0 ? 0 : -6 }}
                    />
                  ))}
                </div>
              )}
              {statusLabel ? (
                <span className="text-[11px] font-semibold text-white/70">{statusLabel}</span>
              ) : ticketsSold > 0 ? (
                <span className="ml-1.5 text-[11px] text-white/70">{ticketsSold} {t('events.going', { defaultValue: 'going' })}</span>
              ) : null}
            </div>

            <div className="shrink-0 font-grotesk text-sm font-bold text-brand-300">
              {priceDisplay.kind === 'free' ? (
                t('common.free')
              ) : priceDisplay.kind === 'unknown' ? (
                // Paid tiers exist but this projection doesn't carry their prices —
                // say nothing rather than advertise the 0 in `ticket_price`.
                t('events.see_tickets', { defaultValue: 'See tickets' })
              ) : (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    {priceDisplay.kind === 'range' ? `${t('common.free')} – ` : `${t('common.from')} `}
                  </span>
                  {priceDisplay.price.toLocaleString()} <span className="text-[11px] font-medium text-white/70">{event.currency}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
