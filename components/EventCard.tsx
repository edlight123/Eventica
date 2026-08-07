'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getPosterTheme } from '@/lib/posterGradient'
import { getCardPriceDisplay } from '@/lib/discover/helpers'

interface Event {
  id: string
  title: string
  description: string
  category: string
  city: string
  venue_name?: string
  start_datetime: string
  ticket_price: number
  currency: string
  total_tickets: number
  tickets_sold: number
  banner_image_url?: string | null
  tags?: string[] | null
  organizer_id?: string
  users?: {
    full_name: string
    is_verified: boolean
  }
}

interface EventCardProps {
  event: Event
  priority?: boolean
  index?: number
  /** Viewer's city. When set, the card shows the venue alone for local events and appends the city only for out-of-town ones. */
  userCity?: string
}

export default function EventCard({ event, priority = false, index = 0, userCity }: EventCardProps) {
  const { t } = useTranslation('common')

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const totalTickets = toFiniteNumber((event as any).total_tickets, 0)
  const ticketsSold = toFiniteNumber((event as any).tickets_sold, 0)
  const remainingTickets = totalTickets > 0 ? Math.max(0, totalTickets - ticketsSold) : null
  const isSoldOut = totalTickets > 0 ? remainingTickets === 0 : false

  // Freeness comes from the tier set, not from `ticket_price` (the LOWEST tier
  // price, hence 0 for an event that has a free tier next to paid ones).
  const priceDisplay = getCardPriceDisplay(event as any)

  const startDate = new Date(event.start_datetime)
  const validDate = isValid(startDate)
  const isTrending = ticketsSold > 10
  const isNew = validDate && startDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  const selloutSoon = !isSoldOut && remainingTickets !== null && remainingTickets < 10

  const theme = getPosterTheme(event.id || event.title, event.category)
  const hasImage = Boolean(event.banner_image_url)

  // A single, most-important status chip keeps the poster calm and editorial.
  const statusChip = isSoldOut
    ? { label: t('ticket.sold_out_caps'), tone: 'bg-red-500/90 text-white' }
    : selloutSoon
    ? { label: t('ticket.remaining_short', { count: remainingTickets }), tone: 'bg-amber-400/90 text-amber-950' }
    : isTrending
    ? { label: t('events.trending'), tone: 'bg-black/35 text-white' }
    : isNew
    ? { label: t('events.new'), tone: 'bg-white text-black' }
    : null

  const dateLabel = validDate ? format(startDate, 'EEE, MMM d') : ''
  // Venue-first: the venue is never redundant, the city often is. Only append the
  // city when the event is outside the viewer's own city.
  const venue = (event.venue_name || '').trim()
  const city = (event.city || '').trim()
  const locationLabel = !venue
    ? city
    : userCity && city && city !== userCity
    ? `${venue} · ${city}`
    : venue
  const monogram = (event.title || '?').trim().charAt(0).toUpperCase()

  return (
    <Link href={`/events/${event.id}`} prefetch={true} className="group block h-full">
      <article className="flex h-full flex-col">
        {/* ---------- Poster ---------- */}
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-none text-white"
          style={hasImage ? undefined : { backgroundImage: theme.bg }}
        >
          {hasImage ? (
            <Image
              src={event.banner_image_url as string}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={78}
              priority={priority || index < 3}
              loading={priority || index < 3 ? 'eager' : 'lazy'}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzBmNDc0MyIvPjwvc3ZnPg=="
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="font-display text-[64px] leading-none text-white/25">{monogram}</span>
            </div>
          )}

          {/* Top row: category */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2.5">
            <span className="eyebrow rounded-lg bg-black/30 px-2.5 py-1.5 text-[10px] tracking-[0.12em] text-white backdrop-blur-md">
              {event.category}
            </span>
          </div>

          {/* A single status chip, bottom-left */}
          {statusChip && (
            <span className={`eyebrow absolute bottom-2 left-2 z-10 rounded-md px-2 py-1 text-[9px] tracking-[0.1em] backdrop-blur-md ${statusChip.tone}`}>
              {statusChip.label}
            </span>
          )}
        </div>

        {/* ---------- Content: serif title + mono metadata, no background ---------- */}
        <div className="px-0.5 pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-[18px] italic leading-tight text-white">
              {event.title}
            </h3>
            {dateLabel && (
              <span className="label-mono shrink-0 text-[10px] uppercase text-white/70">{dateLabel}</span>
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="label-mono flex min-w-0 items-center gap-1 text-[10.5px] uppercase text-white/70">
              <span className="truncate">{locationLabel}</span>
              {event.users?.is_verified && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-400" />
              )}
            </span>
            <span className="shrink-0 text-right">
              {priceDisplay.kind === 'free' ? (
                <span className="label-mono text-[12px] font-semibold uppercase text-brand-300">{t('common.free')}</span>
              ) : priceDisplay.kind === 'unknown' ? (
                // Paid tiers exist but this projection doesn't carry their prices —
                // say nothing rather than advertise the 0 in `ticket_price`.
                <span className="label-mono text-[12px] font-semibold uppercase text-brand-300">
                  {t('events.see_tickets', { defaultValue: 'See tickets' })}
                </span>
              ) : (
                <span className="label-mono text-[12px] font-semibold text-brand-300">
                  <span className="text-[9px] uppercase text-white/70">
                    {priceDisplay.kind === 'range' ? `${t('common.free')} – ` : `${t('common.from')} `}
                  </span>
                  {priceDisplay.price.toLocaleString()} <span className="text-[10px] text-white/70">{event.currency}</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
