// Event detail loading skeleton.
//
// Without this, /events/[id] fell through to the ROOT app/loading.tsx — the
// homepage's featured-hero-plus-poster-rails skeleton — so tapping an event card
// flashed a homepage layout before the event painted. This mirrors the real
// shape instead: mobile hero, then the desktop poster + details grid.

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] ${className ?? ''}`} />
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav md:pb-8">
      {/* Navbar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Shimmer className="h-7 w-28 rounded" />
          <Shimmer className="h-8 w-24 rounded-full" />
        </div>
      </div>

      {/* Mobile hero — full-bleed poster */}
      <div className="md:hidden">
        <Shimmer className="aspect-[4/5] w-full" />
        <div className="space-y-3 px-4 pt-5">
          <Shimmer className="h-3 w-20 rounded" />
          <Shimmer className="h-7 w-4/5 rounded" />
          <Shimmer className="h-4 w-1/2 rounded" />
        </div>
      </div>

      {/* Desktop hero — poster beside the details column */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
            <Shimmer className="aspect-[4/5] w-full rounded-2xl" />
            <div className="space-y-4">
              <Shimmer className="h-3 w-24 rounded" />
              <Shimmer className="h-12 w-4/5 rounded" />
              <Shimmer className="h-5 w-2/3 rounded" />
              <div className="flex gap-3 pt-2">
                <Shimmer className="h-11 w-40 rounded-lg" />
                <Shimmer className="h-11 w-11 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body — details column plus the sticky ticket panel */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Shimmer className="h-5 w-32 rounded" />
            <div className="space-y-2">
              <Shimmer className="h-4 w-full rounded" />
              <Shimmer className="h-4 w-full rounded" />
              <Shimmer className="h-4 w-3/4 rounded" />
            </div>
            <Shimmer className="h-40 w-full rounded-2xl" />
          </div>
          <Shimmer className="hidden h-64 w-full rounded-2xl lg:block" />
        </div>
      </div>
    </div>
  )
}
