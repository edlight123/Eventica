'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format, isValid } from 'date-fns'
import { Heart, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPosterTheme, getAvatarColors } from '@/lib/posterGradient'

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
}

export default function EventCard({ event, priority = false, index = 0 }: EventCardProps) {
  const { t } = useTranslation('common')
  const [liked, setLiked] = useState(false)

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const totalTickets = toFiniteNumber((event as any).total_tickets, 0)
  const ticketsSold = toFiniteNumber((event as any).tickets_sold, 0)
  const remainingTickets = totalTickets > 0 ? Math.max(0, totalTickets - ticketsSold) : null
  const isSoldOut = totalTickets > 0 ? remainingTickets === 0 : false

  const ticketPrice = toFiniteNumber((event as any).ticket_price, 0)
  const isFree = ticketPrice === 0

  const startDate = new Date(event.start_datetime)
  const validDate = isValid(startDate)
  const isTrending = ticketsSold > 10
  const isNew = validDate && startDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  const selloutSoon = !isSoldOut && remainingTickets !== null && remainingTickets < 10

  const theme = getPosterTheme(event.id || event.title, event.category)
  const hasImage = Boolean(event.banner_image_url)
  const organizerName = event.users?.full_name?.trim()
  const avatarColors = getAvatarColors(event.id || event.title, Math.min(ticketsSold, 4))

  // A single, most-important status chip keeps the poster calm and editorial.
  const statusChip = isSoldOut
    ? { label: t('ticket.sold_out_caps'), tone: 'bg-red-500/90 text-white' }
    : selloutSoon
    ? { label: t('ticket.remaining_short', { count: remainingTickets }), tone: 'bg-amber-400/90 text-amber-950' }
    : isTrending
    ? { label: `🔥 ${t('events.trending')}`, tone: 'bg-black/35 text-white' }
    : isNew
    ? { label: t('events.new'), tone: 'bg-white/85 text-gray-900' }
    : null

  const dayLabel = validDate ? format(startDate, 'EEE').toUpperCase() : ''
  const timeLabel = validDate ? format(startDate, 'h:mm a') : ''

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLiked((v) => !v)
  }

  return (
    <Link href={`/events/${event.id}`} prefetch={true} className="group block h-full">
      <article className="hover-lift flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-poster-sm group-hover:border-brand-200 group-hover:shadow-card-hover">
        {/* ---------- Poster ---------- */}
        <div
          className="poster-vignette relative flex aspect-[4/5] flex-col justify-between overflow-hidden p-3.5 text-white"
          style={hasImage ? undefined : { backgroundImage: theme.bg }}
        >
          {hasImage && (
            <>
              <Image
                src={event.banner_image_url as string}
                alt={event.title}
                fill
                className="object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.06]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                quality={78}
                priority={priority || index < 3}
                loading={priority || index < 3 ? 'eager' : 'lazy'}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzBmNDc0MyIvPjwvc3ZnPg=="
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/35" />
            </>
          )}

          {/* Top row: category + like */}
          <div className="relative z-10 flex items-start justify-between">
            <span className="eyebrow rounded-lg bg-black/30 px-2.5 py-1.5 text-[10px] tracking-[0.12em] text-white backdrop-blur-md">
              {event.category}
            </span>
            <button
              type="button"
              onClick={handleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md transition-transform duration-200 active:scale-90"
            >
              <Heart className={`h-[15px] w-[15px] ${liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
            </button>
          </div>

          {/* Center title — poster treatment used when there is no banner image */}
          {!hasImage && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-5 text-center">
              {organizerName && (
                <span className="eyebrow mb-2 text-[9px] tracking-[0.22em] text-white/70">
                  {organizerName}
                </span>
              )}
              <h3 className="font-display text-[26px] leading-[0.98] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-4">
                {event.title}
              </h3>
            </div>
          )}

          {/* Bottom row */}
          <div className="relative z-10 flex items-end justify-between gap-2">
            <div className="min-w-0">
              {hasImage && (
                <h3 className="font-display text-[22px] leading-[1.02] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] line-clamp-2">
                  {event.title}
                </h3>
              )}
              {(dayLabel || timeLabel) && (
                <div className="eyebrow mt-1.5 text-[10px] tracking-[0.08em] text-white/85">
                  {dayLabel}
                  {timeLabel && <span className="opacity-60"> · </span>}
                  {timeLabel}
                </div>
              )}
            </div>
            {statusChip && (
              <span className={`eyebrow shrink-0 rounded-md px-2 py-1 text-[9px] tracking-[0.1em] backdrop-blur-md ${statusChip.tone}`}>
                {statusChip.label}
              </span>
            )}
          </div>
        </div>

        {/* ---------- Body ---------- */}
        <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-500">
            <span className="truncate">{event.venue_name || event.city}</span>
            {event.users?.is_verified && (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" />
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {ticketsSold > 0 ? (
              <div className="flex items-center">
                <div className="flex">
                  {avatarColors.map((c, i) => (
                    <span
                      key={i}
                      className="h-[21px] w-[21px] rounded-full ring-2 ring-white"
                      style={{ background: c, marginLeft: i === 0 ? 0 : -7 }}
                    />
                  ))}
                </div>
                <span className="ml-2 text-[11.5px] text-gray-400">
                  {ticketsSold} {t('events.going', { defaultValue: 'going' })}
                </span>
              </div>
            ) : (
              <span className="text-[11.5px] text-gray-400">{event.city}</span>
            )}

            <div className="shrink-0 text-right">
              {isFree ? (
                <span className="font-grotesk text-sm font-bold text-brand-700">{t('common.free')}</span>
              ) : (
                <span className="font-grotesk text-sm font-bold text-brand-700">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('common.from')}{' '}
                  </span>
                  {ticketPrice.toLocaleString()}{' '}
                  <span className="text-[11px] font-medium text-gray-400">{event.currency}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
