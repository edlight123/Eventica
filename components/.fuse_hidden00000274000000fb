'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPosterTheme, getAvatarColors } from '@/lib/posterGradient'

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
  const [liked, setLiked] = useState(false)

  const totalTickets = Number(event.total_tickets) || 0
  const ticketsSold = Number(event.tickets_sold) || 0
  const remainingTickets = totalTickets > 0 ? Math.max(0, totalTickets - ticketsSold) : null
  const isSoldOut = totalTickets > 0 && remainingTickets === 0
  const isFree = !event.ticket_price || event.ticket_price === 0
  const isTrending = ticketsSold > 10
  const selloutSoon = !isSoldOut && remainingTickets !== null && remainingTickets < 10

  const startDate = new Date(event.start_datetime)
  const validDate = isValid(startDate)
  const theme = getPosterTheme(event.id || event.title, event.category)
  const hasImage = Boolean(event.banner_image_url)
  const avatarColors = getAvatarColors(event.id || event.title, Math.min(ticketsSold, 3))

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked((v) => !v)
  }

  const statusLabel = isSoldOut
    ? t('ticket.sold_out_caps')
    : selloutSoon
    ? t('ticket.remaining_short', { count: remainingTickets })
    : isTrending
    ? t('events.trending')
    : null

  return (
    <Link href={`/events/${event.id}`} prefetch={true} className="group block">
      <article className="hover-lift flex gap-3 rounded-2xl  bg-white/5 p-2.5 shadow-poster-sm group-hover:border-brand-400/40">
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
            <button
              type="button"
              onClick={handleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-rose-500 text-rose-500' : 'text-white/40'}`} />
            </button>
          </div>

          <h3 className="mt-0.5 font-grotesk text-[17px] font-semibold leading-[1.05] text-white line-clamp-2">
            {event.title}
          </h3>

          <p className="mt-0.5 truncate text-xs text-white/55">
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
                <span className="text-[11px] font-semibold text-white/55">{statusLabel}</span>
              ) : ticketsSold > 0 ? (
                <span className="ml-1.5 text-[11px] text-white/40">{ticketsSold} {t('events.going', { defaultValue: 'going' })}</span>
              ) : null}
            </div>

            <div className="shrink-0 font-grotesk text-sm font-bold text-brand-300">
              {isFree ? (
                t('common.free')
              ) : (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{t('common.from')} </span>
                  {Number(event.ticket_price).toLocaleString()} <span className="text-[11px] font-medium text-white/40">{event.currency}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
