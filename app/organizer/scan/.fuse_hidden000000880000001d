'use client'

import { format, isValid } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import { QrCode, Calendar, MapPin } from 'lucide-react'
import { getPosterTheme } from '@/lib/posterGradient'

interface EventSelectorProps {
  events: any[]
  organizerId: string
}

/** Poster-led scan card — mirrors the home / discover / organizer event cards. */
function ScanEventCard({ event, badge }: { event: any; badge?: { label: string; tone: 'today' | 'past' } }) {
  const hasImage = Boolean(event.banner_image_url)
  const theme = getPosterTheme(event.id || event.title, event.category)
  const d = event.start_datetime ? new Date(event.start_datetime) : null
  const dateLabel = d && isValid(d) ? format(d, 'EEE, MMM d · h:mm a') : 'Date TBA'
  const location = [event.venue_name, event.city].filter(Boolean).join(', ')
  const ticketsSold = event.tickets_sold || 0

  return (
    <Link href={`/organizer/scan/${event.id}`} prefetch className="group block h-full">
      <article className="hover-lift h-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-poster-sm transition-all duration-300 group-hover:border-brand-200 group-hover:shadow-card-hover">
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
                quality={78}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                className="object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
            </>
          )}

          {/* Top: status badge + scan glyph */}
          <div className="relative z-10 flex items-start justify-between">
            {badge ? (
              <span
                className={`eyebrow inline-flex rounded-md px-2 py-1 text-[9px] tracking-[0.12em] backdrop-blur-md ${
                  badge.tone === 'today' ? 'bg-brand-600/90 text-white' : 'bg-white/85 text-gray-700'
                }`}
              >
                {badge.label}
              </span>
            ) : (
              <span />
            )}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/35 text-white backdrop-blur-md">
              <QrCode className="h-[15px] w-[15px]" />
            </span>
          </div>

          {/* Center title for image-less posters */}
          {!hasImage && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-5 text-center">
              <h3 className="font-display text-[24px] leading-[0.98] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-4">
                {event.title}
              </h3>
            </div>
          )}

          {/* Bottom: title + meta */}
          <div className="relative z-10 space-y-1.5">
            {hasImage && (
              <h3 className="font-display text-[22px] leading-[1.02] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] line-clamp-2">
                {event.title}
              </h3>
            )}
            <div className="eyebrow flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-white/85">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{dateLabel}</span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5 text-[11.5px] text-white/80">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
          <span className="text-xs font-medium text-gray-500">
            {ticketsSold} {ticketsSold === 1 ? 'ticket' : 'tickets'} sold
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-brand-800">
            <QrCode className="h-3.5 w-3.5" />
            Scan
          </span>
        </div>
      </article>
    </Link>
  )
}

export default function EventSelector({ events }: EventSelectorProps) {
  // Separate today's events from others for display
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.start_datetime)
    return eventDate >= today && eventDate < tomorrow
  })

  const otherEvents = events.filter((e) => {
    const eventDate = new Date(e.start_datetime)
    return eventDate < today || eventDate >= tomorrow
  })

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="py-12 text-center">
          <div className="mb-4 text-6xl">📅</div>
          <p className="mb-4 text-gray-600">You don&apos;t have any events yet.</p>
          <Link
            href="/organizer/events/new"
            className="inline-block rounded-lg bg-brand-700 px-6 py-3 font-medium text-white hover:bg-brand-800"
          >
            Create Your First Event
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
            <span>📍</span>
            <span>Happening Today</span>
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {todayEvents.map((event) => (
              <ScanEventCard key={event.id} event={event} badge={{ label: 'Today', tone: 'today' }} />
            ))}
          </div>
        </section>
      )}

      {/* Other Events */}
      {otherEvents.length > 0 && (
        <section>
          {todayEvents.length > 0 && (
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Other Events</h3>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {otherEvents.map((event) => {
              const isPast = new Date(event.start_datetime) < new Date()
              return (
                <ScanEventCard
                  key={event.id}
                  event={event}
                  badge={isPast ? { label: 'Past', tone: 'past' } : undefined}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
