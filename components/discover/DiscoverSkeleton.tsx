import React from 'react'

/** Single event card placeholder, matching the poster-led DiscoverEventCard. */
export function EventCardSkeleton() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-none  ">
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-3.5">
        <div className="h-5 w-3/4 rounded bg-white/15" />
        <div className="h-3 w-1/2 rounded " />
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-16 rounded " />
          <div className="h-5 w-12 rounded bg-white/15" />
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
          <div className="h-7 w-48 rounded" />
          <div className="h-4 w-64 rounded" />
        </div>
        <div className="hidden sm:block h-5 w-16 rounded" />
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
    <div className="bg-[#0a0a0a] border-b border-white/10 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="h-11 flex-1 rounded-lg" />
          <div className="hidden md:block h-11 w-28 rounded-full" />
          <div className="h-11 w-24 rounded-lg" />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full shrink-0" />
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
          <div className="h-8 w-56 rounded" />
          <div className="h-4 w-72 rounded" />
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
