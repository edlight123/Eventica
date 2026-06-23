import React from 'react'

/** Single event card placeholder, matching the poster-led DiscoverEventCard. */
export function EventCardSkeleton() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-200">
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3.5">
        <div className="h-5 w-3/4 rounded bg-gray-300/80" />
        <div className="h-3 w-1/2 rounded bg-gray-300/70" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-16 rounded bg-gray-300/70" />
          <div className="h-5 w-12 rounded bg-gray-300/80" />
        </div>
      </div>
    </div>
  )
}

/** Section header + a horizontal row of card placeholders (matches EventRail). */
export function EventRailSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="hidden sm:block h-5 w-16 bg-gray-200 rounded" />
      </div>
      <div className="flex gap-4 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="w-[260px] sm:w-[280px] lg:w-[300px] shrink-0">
            <EventCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Placeholder for the sticky discover header (search row + quick-filter strip). */
export function DiscoverFilterBarSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="h-11 flex-1 bg-gray-200 rounded-lg" />
          <div className="hidden md:block h-11 w-28 bg-gray-200 rounded-full" />
          <div className="h-11 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-200 rounded-full shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Full discover content placeholder: a featured grid + a few rails. */
export function DiscoverContentSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Featured */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>

      <EventRailSkeleton />
      <EventRailSkeleton />
      <EventRailSkeleton />
    </div>
  )
}

/** Legacy combined skeleton (kept for compatibility). */
export function DiscoverSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <DiscoverFilterBarSkeleton />
      <DiscoverContentSkeleton />
    </div>
  )
}
