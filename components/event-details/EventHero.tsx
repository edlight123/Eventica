'use client'

import Image from 'next/image'
import { Star, TrendingUp, Shield } from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface EventHeroProps {
  title: string
  category: string
  bannerUrl: string | null
  organizerName: string
  organizerId: string
  isVerified: boolean
  isVIP: boolean
  isTrending: boolean
  isSoldOut: boolean
  selloutSoon: boolean
}

export function EventHero({
  title,
  category,
  bannerUrl,
  organizerName,
  organizerId,
  isVerified,
  isVIP,
  isTrending,
  isSoldOut,
  selloutSoon,
}: EventHeroProps) {
  return (
    <div className="relative bg-gray-900 h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
      {/* Background Image with Overlay */}
      {bannerUrl ? (
        <>
          <Image
            src={bannerUrl}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2NjYyIvPjwvc3ZnPg=="
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600" />
      )}

      {/* Hero Content */}
      <div className="relative h-full flex flex-col justify-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 w-full">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="neutral" size="md">
              {category}
            </Badge>
            {isVIP && (
              <Badge variant="vip" size="md" icon={<Star className="w-4 h-4" />}>
                VIP
              </Badge>
            )}
            {isTrending && (
              <Badge variant="trending" size="md" icon={<TrendingUp className="w-4 h-4" />}>
                Trending
              </Badge>
            )}
            {isSoldOut && (
              <Badge variant="error" size="md">
                SOLD OUT
              </Badge>
            )}
            {selloutSoon && !isSoldOut && (
              <Badge variant="warning" size="md">
                Almost Sold Out
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight max-w-4xl">
            {title}
          </h1>

          {/* Hosted By Pill */}
          <a
            href={`/profile/organizer/${organizerId}`}
            className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 hover:bg-white/20 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold">
              {organizerName[0].toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Hosted by</p>
              <div className="flex items-center gap-1.5">
                <span className="text-white/90 text-sm">{organizerName}</span>
                {isVerified && (
                  <Shield className="w-4 h-4 text-brand-300" />
                )}
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
