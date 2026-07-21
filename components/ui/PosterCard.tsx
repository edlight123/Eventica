'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface PosterCardProps {
  /** Portrait poster image. When absent, a teal→black gradient carries the title. */
  imageUrl?: string
  title: string
  /** e.g. "From 500 HTG" or "Free". Rendered in the muted caption line. */
  priceLabel?: string
  venue?: string
  dateLabel?: string
  /** Floating overlay node on the image (status pill, category, etc.). */
  badge?: React.ReactNode
  /** Poster ratio. Default 4/5 (Tikèm's editorial portrait). */
  aspect?: '2/3' | '4/5'
  /** When set, the whole card becomes a keyboard-accessible link. */
  href?: string
  onClick?: () => void
  className?: string
}

/**
 * Presentational, poster-forward event card. Portrait image with a graceful
 * text-only fallback, then a three-tier caption (title / price·venue / date).
 * No fixed widths — drop it into a grid cell or a horizontal rail.
 *
 * @example
 * <PosterCard
 *   imageUrl={event.banner_image_url ?? undefined}
 *   title={event.title}
 *   priceLabel={getPriceLabel(event.ticket_price, event.currency)}
 *   venue={event.venue_name}
 *   dateLabel={formatEventDate(event.start_datetime)}
 *   href={`/events/${event.id}`}
 * />
 */
export function PosterCard({
  imageUrl,
  title,
  priceLabel,
  venue,
  dateLabel,
  badge,
  aspect = '4/5',
  href,
  onClick,
  className = '',
}: PosterCardProps) {
  // Fall back to the gradient title-card not just when the URL is absent, but
  // also when the image fails to load (broken/missing banner) — otherwise a dead
  // URL leaves an empty black poster instead of the intended fallback.
  const [imgError, setImgError] = useState(false)
  const hasImage = Boolean(imageUrl) && !imgError
  const aspectClass = aspect === '2/3' ? 'aspect-[2/3]' : 'aspect-[4/5]'

  const inner = (
    <article className="group flex h-full max-w-full flex-col">
      {/* ---------- Poster ---------- */}
      <div
        className={`relative ${aspectClass} w-full max-w-full overflow-hidden rounded-2xl ${
          hasImage ? 'bg-white/[0.02]' : 'bg-gradient-to-br from-brand-700 via-brand-900 to-black'
        }`}
      >
        {hasImage ? (
          <Image
            src={imageUrl as string}
            alt={title}
            fill
            className="object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={78}
            onError={() => setImgError(true)}
          />
        ) : (
          // Text-only events still read as premium: title set large in bold grotesk.
          <div className="absolute inset-0 flex items-center justify-center p-5 text-center">
            <span className="font-grotesk text-2xl font-bold leading-[1.05] text-white line-clamp-4">
              {title}
            </span>
          </div>
        )}

        {badge && <div className="absolute left-2.5 top-2.5 z-10">{badge}</div>}
      </div>

      {/* ---------- Caption: title / price·venue / date ---------- */}
      <div className="px-0.5 pt-2.5">
        <h3 className="truncate font-grotesk text-[15px] font-bold leading-tight text-white">
          {title}
        </h3>
        {(priceLabel || venue) && (
          <p className="mt-1 truncate text-sm text-white/60">
            {priceLabel}
            {priceLabel && venue && <span className="text-white/30"> · </span>}
            {venue}
          </p>
        )}
        {dateLabel && <p className="mt-0.5 truncate text-xs text-white/40">{dateLabel}</p>}
      </div>
    </article>
  )

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
      >
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block h-full w-full max-w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
      >
        {inner}
      </button>
    )
  }

  return <div className={`h-full max-w-full ${className}`}>{inner}</div>
}
