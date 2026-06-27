'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react'
import { format, isValid } from 'date-fns'
import { getPosterTheme } from '@/lib/posterGradient'

interface HeroEvent {
  id: string
  title: string
  category?: string
  banner_image_url?: string | null
  start_datetime: string
  city?: string
  commune?: string
  venue_name?: string
  ticket_price?: number
  currency?: string
}

/**
 * Posh-Explore-style featured hero: one large event at a time — portrait poster
 * beside its title, date, venue and a white "Get Tickets" button — with dot
 * pagination and auto-advance. Sits at the top of Discover on the unfiltered view.
 */
export function DiscoverFeaturedHero({ events }: { events: HeroEvent[] }) {
  const slides = (events || []).filter(Boolean).slice(0, 8)
  const count = slides.length
  const [i, setI] = useState(0)

  const go = useCallback((n: number) => setI(((n % count) + count) % count), [count])

  useEffect(() => {
    if (count <= 1) return
    const id = setInterval(() => setI((p) => (p + 1) % count), 6500)
    return () => clearInterval(id)
  }, [count])

  if (count === 0) return null
  const ev = slides[i]

  const d = new Date(ev.start_datetime)
  const dateLabel = isValid(d) ? format(d, 'EEE, MMM d · h:mm a') : ''
  const place = [ev.city, ev.venue_name || ev.commune].filter(Boolean).join(' • ')
  const price = Number(ev.ticket_price || 0)
  const priceLabel = price > 0 ? `Get Tickets · from ${price.toLocaleString()} ${ev.currency || 'HTG'}` : 'Get Tickets'
  const hasImage = Boolean(ev.banner_image_url)
  const theme = getPosterTheme(ev.id || ev.title, ev.category || '')

  return (
    <section className="relative">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-10">
        {/* Poster */}
        <Link
          href={`/events/${ev.id}`}
          className="group relative mx-auto w-full max-w-[340px] lg:mx-0"
          aria-label={ev.title}
        >
          <div
            className="poster-vignette relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-white/10"
            style={hasImage ? undefined : { backgroundImage: theme.bg }}
          >
            {hasImage ? (
              <Image
                src={ev.banner_image_url as string}
                alt={ev.title}
                fill
                priority
                sizes="(max-width: 1024px) 340px, 340px"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <span className="font-display text-[26px] leading-tight text-white/90 line-clamp-4">{ev.title}</span>
              </div>
            )}
          </div>
        </Link>

        {/* Details */}
        <div className="min-w-0">
          {ev.category && <p className="eyebrow text-brand-400">{ev.category}</p>}
          <h2 className="mt-2 font-display text-[clamp(28px,4.4vw,52px)] leading-[1.02] text-white line-clamp-3">
            {ev.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15px] text-white/60">
            {dateLabel && (
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/40" />
                {dateLabel}
              </span>
            )}
            {place && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/40" />
                {place}
              </span>
            )}
          </div>
          <Link
            href={`/events/${ev.id}`}
            className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            {priceLabel}
          </Link>
        </div>
      </div>

      {/* Controls */}
      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => go(i - 1)}
            className="grid h-8 w-8 place-items-center rounded-full  text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {slides.map((_, n) => (
              <button
                key={n}
                type="button"
                aria-label={`Go to slide ${n + 1}`}
                onClick={() => setI(n)}
                className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-brand-400' : 'w-1.5 bg-white/25 hover:bg-white/40'}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            onClick={() => go(i + 1)}
            className="grid h-8 w-8 place-items-center rounded-full  text-white/60 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}
