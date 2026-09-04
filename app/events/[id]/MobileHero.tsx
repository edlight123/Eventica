'use client'

import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import { Shield, TrendingUp } from 'lucide-react'
import { getPosterTheme } from '@/lib/posterGradient'

interface MobileHeroProps {
  title: string
  category: string
  bannerUrl?: string
  organizerName: string
  organizerId: string
  isVerified: boolean
  isTrending: boolean
  isSoldOut: boolean
  selloutSoon: boolean
}

export default function MobileHero({
  title,
  category,
  bannerUrl,
  organizerName,
  organizerId,
  isVerified,
  isTrending,
  isSoldOut,
  selloutSoon
}: MobileHeroProps) {
  const { t } = useTranslation('common')
  const posterTheme = getPosterTheme(title, category)

  return (
    <div className="md:hidden">
      {/* The poster, in the house 4:5 portrait shape.
          This was `aspect-video` — a 16:9 landscape box — with object-cover, so
          every vertical poster was cropped to a horizontal band through its
          middle: the title and the artwork's composition both cut away. The
          desktop hero has always used aspect-[4/5]; mobile was the outlier,
          and mobile is where the poster matters most. */}
      {/* Inset, not full-bleed. Every other poster on this site sits in a
          rounded frame with the page breathing around it — the discover cards,
          the film strip, the hero scatter — and this one ran edge to edge,
          which made the event page look like a different product. Same px-4
          as the sections below it, so the left edges line up down the page. */}
      <div className="relative mx-4 aspect-[4/5] overflow-hidden rounded-2xl bg-white/[0.04]">
        {bannerUrl ? (
          <>
            <Image
              src={bannerUrl}
              alt={title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="poster-vignette absolute inset-0" style={{ backgroundImage: posterTheme.bg }}>
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="font-display text-[28px] leading-[0.98] text-white/90 drop-shadow line-clamp-3">
                {title}
              </span>
            </div>
          </div>
        )}

        {/* Badges Overlay - Top Right */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {isSoldOut && (
            <Badge variant="error" size="sm">
              {t('ticket.sold_out').toUpperCase()}
            </Badge>
          )}
          {!isSoldOut && selloutSoon && (
            <Badge variant="warning" size="sm">
              {t('ticket.almost_sold_out')}
            </Badge>
          )}
          {isTrending && (
            <Badge variant="trending" size="sm" icon={<TrendingUp className="w-3 h-3" />}>
              {t('events.trending')}
            </Badge>
          )}
        </div>
      </div>

      {/* Title & Organizer - Below image */}
      <div className="px-4 py-4">
        {/* Category Badge */}
        <Badge variant="neutral" size="sm" className="mb-3">
          {category}
        </Badge>

        {/* Title */}
        <h1 className="font-grotesk font-bold !text-[26px] tracking-[-0.01em] text-white mb-3 !leading-[1.05] break-words">
          {title}
        </h1>

        {/* Organizer */}
        <a
          href={`/profile/organizer/${organizerId}`}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(organizerName?.[0] || 'E').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {organizerName}
            </p>
            {isVerified && (
              <div className="flex items-center gap-1 text-brand-400 text-xs">
                <Shield className="w-3 h-3" />
                <span className="font-medium">{t('events.verified')}</span>
              </div>
            )}
          </div>
        </a>
      </div>
    </div>
  )
}
