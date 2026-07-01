'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Bookmark, Users } from 'lucide-react'
import type { Database } from '@/types/database'
import { formatEventDate, getPriceLabel, getLocationSummary, getEventCue, isEventBookmarked, toggleBookmark as toggleBookmarkHelper } from '@/lib/discover/helpers'
import { getPosterTheme } from '@/lib/posterGradient'
import { useFriendsGoingCount } from './FriendsGoingContext'

type Event = Database['public']['Tables']['events']['Row']

interface DiscoverEventCardProps {
  event: Event
}

export function DiscoverEventCard({ event }: DiscoverEventCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const friendsGoing = useFriendsGoingCount(event.id)

  useEffect(() => {
    setIsBookmarked(isEventBookmarked(event.id))
  }, [event.id])

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = toggleBookmarkHelper(event.id)
    setIsBookmarked(newState)
  }

  const cue = getEventCue(event)
  const priceLabel = getPriceLabel(event.ticket_price, event.currency)
  const locationSummary = getLocationSummary(event.city, event.commune)
  const dateLabel = formatEventDate(event.start_datetime)
  const hasImage = Boolean(event.banner_image_url)
  const theme = getPosterTheme(event.id || event.title, event.category)
  const isFree = event.ticket_price === 0

  return (
    <Link href={`/events/${event.id}`} prefetch className="group block h-full">
      <article className="hover-lift h-full overflow-hidden rounded-none border border-white/10 shadow-poster-sm transition-all duration-300 group-hover:border-brand-400/40 group-hover:shadow-card-hover">
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
                sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 300px"
                quality={78}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
            </>
          )}

          {/* Top row: category + bookmark */}
          <div className="relative z-10 flex items-start justify-between">
            <span className="eyebrow rounded-lg bg-black/30 px-2.5 py-1.5 text-[10px] tracking-[0.12em] text-white backdrop-blur-md">
              {event.category}
            </span>
            <button
              type="button"
              onClick={handleBookmarkToggle}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md transition-transform duration-200 active:scale-90"
            >
              <Bookmark className={`h-[15px] w-[15px] ${isBookmarked ? 'fill-white text-white' : 'text-white'}`} />
            </button>
          </div>

          {/* Center title — poster treatment when there is no banner image */}
          {!hasImage && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-5 text-center">
              <h3 className="font-display italic text-[26px] leading-[0.98] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-4">
                {event.title}
              </h3>
            </div>
          )}

          {/* Bottom: cue + title + meta + price */}
          <div className="relative z-10 space-y-2">
            {cue && (
              <span
                className={`eyebrow inline-flex rounded-md px-2 py-1 text-[9px] tracking-[0.1em] backdrop-blur-md
                  ${cue.variant === 'warning' ? 'bg-amber-400/90 text-amber-950' : 'bg-white text-black'}`}
              >
                {cue.label}
              </span>
            )}

            {hasImage && (
              <h3 className="font-display italic text-[22px] leading-[1.02] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] line-clamp-2">
                {event.title}
              </h3>
            )}

            <div className="label-mono text-[10px] uppercase text-white/85">
              {dateLabel}
              {locationSummary && <span className="opacity-60"> · </span>}
              {locationSummary}
            </div>

            <div className="flex items-end justify-between gap-2 pt-0.5">
              {friendsGoing > 0 ? (
                <span className="label-mono inline-flex items-center gap-1 text-[11px] uppercase text-white/90">
                  <Users className="h-3.5 w-3.5" />
                  {friendsGoing} {friendsGoing === 1 ? 'friend' : 'friends'}
                </span>
              ) : (
                <span />
              )}
              <span
                className={`label-mono shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold backdrop-blur-md
                  ${isFree ? 'bg-brand-600/90 text-white' : 'bg-white text-black'}`}
              >
                {priceLabel}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
