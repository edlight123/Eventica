'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Bookmark, MapPin, Calendar, Users } from 'lucide-react'
import type { Database } from '@/types/database'
import { formatEventDate, getPriceLabel, getLocationSummary, getEventCue, isEventBookmarked, toggleBookmark as toggleBookmarkHelper } from '@/lib/discover/helpers'
import { useFriendsGoingCount } from './FriendsGoingContext'

type Event = Database['public']['Tables']['events']['Row']

interface DiscoverEventCardProps {
  event: Event
}

export function DiscoverEventCard({ event }: DiscoverEventCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <Image
          src={event.banner_image_url || '/placeholder-event.jpg'}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Bookmark Button */}
        <button
          onClick={handleBookmarkToggle}
          className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all duration-200 z-10"
        >
          <Bookmark 
            className={`w-4 h-4 transition-colors ${isBookmarked ? 'fill-black text-black' : 'text-gray-700'}`}
          />
        </button>

        {/* Cue Badge */}
        {cue && (
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold shadow-md
            ${cue.variant === 'popular' ? 'bg-brand-600 text-white' : ''}
            ${cue.variant === 'warning' ? 'bg-amber-500 text-white' : ''}
            ${cue.variant === 'verified' ? 'bg-brand-600 text-white' : ''}
          `}>
            {cue.label}
          </div>
        )}

        {/* Category Tag */}
        <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full text-xs font-medium text-white">
          {event.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-lg group-hover:text-brand-600 transition-colors">
          {event.title}
        </h3>

        {/* Friends going - social proof */}
        {friendsGoing > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>
              {friendsGoing} {friendsGoing === 1 ? 'friend' : 'friends'} going
            </span>
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{dateLabel}</span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{locationSummary}</span>
        </div>

        {/* Price */}
        <div className="pt-2 border-t border-gray-100">
          <span className={`text-sm font-semibold ${event.ticket_price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {priceLabel}
          </span>
        </div>
      </div>
    </Link>
  )
}
