'use client'

import React, { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { isValid, parseISO } from 'date-fns'
import type { Database } from '@/types/database'
import {
  formatEventDate,
  getPriceLabel,
  getLocationSummary,
  getEventCue,
  isEventBookmarked,
  toggleBookmark as toggleBookmarkHelper,
} from '@/lib/discover/helpers'
import { PosterCard } from '@/components/ui/PosterCard'

type Event = Database['public']['Tables']['events']['Row']

interface DiscoverEventCardProps {
  event: Event
}

export function DiscoverEventCard({ event }: DiscoverEventCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    setIsBookmarked(isEventBookmarked(event.id))
  }, [event.id])

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsBookmarked(toggleBookmarkHelper(event.id))
  }

  const cue = getEventCue(event)
  const priceLabel = getPriceLabel(event.ticket_price, event.currency)
  // Venue-first: the venue name adds variety and is rarely redundant; fall back
  // to the city/commune summary only when there's no venue (e.g. online events).
  const venue = (event.venue_name || '').trim() || getLocationSummary(event.city, event.commune)

  // Guard the date: parseISO on a missing/invalid string yields an Invalid Date,
  // and date-fns `format` throws on that. Only format when the date is valid.
  const parsedDate = event.start_datetime ? parseISO(event.start_datetime) : null
  const dateLabel =
    parsedDate && isValid(parsedDate) ? formatEventDate(event.start_datetime) : undefined

  // A single, most-important chip on the poster: prefer the derived status cue
  // (Popular / Few tickets left), otherwise fall back to the category.
  const badge = (
    <span
      className={`eyebrow inline-flex rounded-md px-2 py-1 text-[9px] tracking-[0.1em] backdrop-blur-md ${
        cue
          ? cue.variant === 'warning'
            ? 'bg-amber-400/90 text-amber-950'
            : 'bg-white text-black'
          : 'bg-black/30 text-white'
      }`}
    >
      {cue ? cue.label : event.category}
    </span>
  )

  return (
    <div className="relative h-full">
      <PosterCard
        imageUrl={event.banner_image_url ?? undefined}
        title={event.title}
        priceLabel={priceLabel}
        venue={venue}
        dateLabel={dateLabel}
        badge={badge}
        aspect="2/3"
        href={`/events/${event.id}`}
      />

      {/* Bookmark overlay — sits above the PosterCard link so its own click
          toggles the saved state instead of navigating. */}
      <button
        type="button"
        onClick={handleBookmarkToggle}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        className="absolute right-2.5 top-2.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md transition-transform duration-200 active:scale-90"
      >
        <Bookmark className={`h-[15px] w-[15px] ${isBookmarked ? 'fill-white text-white' : 'text-white'}`} />
      </button>
    </div>
  )
}
