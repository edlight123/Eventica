'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Database } from '@/types/database'
import { formatEventDate, getPriceLabel, getLocationSummary } from '@/lib/discover/helpers'

type Event = Database['public']['Tables']['events']['Row']

interface FeaturedCarouselProps {
  events: Event[]
}

export function FeaturedCarousel({ events }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  if (events.length === 0) return null

  const visibleEvents = events.slice(0, 6) // Max 6 featured events

  // Minimum swipe distance (in px) to trigger slide change
  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0) // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swipe left - go to next
      setCurrentIndex((prev) => (prev === visibleEvents.length - 1 ? 0 : prev + 1))
    }
    
    if (isRightSwipe) {
      // Swipe right - go to previous
      setCurrentIndex((prev) => (prev === 0 ? visibleEvents.length - 1 : prev - 1))
    }
  }

  return (
    <div className="relative">
      {/* Desktop: Grid of 3 */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {visibleEvents.map((event) => (
          <FeaturedEventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Mobile: Swipeable Carousel */}
      <div className="md:hidden relative">
        <div 
          ref={containerRef}
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {visibleEvents.map((event) => (
              <div key={event.id} className="w-full flex-shrink-0 px-1">
                <FeaturedEventCard event={event} />
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        {visibleEvents.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {visibleEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-black w-6' : 'bg-gray-300 w-2'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturedEventCard({ event }: { event: Event }) {
  const priceLabel = getPriceLabel(event.ticket_price)
  const locationSummary = getLocationSummary(event.city, event.commune)
  const dateLabel = formatEventDate(event.start_datetime)

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-brand-500/20 hover:border-brand-500"
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200">
        <Image
          src={event.banner_image_url || '/placeholder-event.jpg'}
          alt={event.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        
        {/* Featured Badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-brand-600 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-1">
          ⭐ Featured
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-full text-sm font-semibold text-white">
          {priceLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {/* Category */}
        <div className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
          {event.category}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 line-clamp-2 text-xl group-hover:text-brand-600 transition-colors">
          {event.title}
        </h3>

        {/* Date */}
        <div className="text-sm text-gray-600">
          📅 {dateLabel}
        </div>

        {/* Location */}
        <div className="text-sm text-gray-600">
          📍 {locationSummary}
        </div>
      </div>
    </Link>
  )
}
