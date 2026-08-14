// Notifications loading skeleton — a list, not the homepage poster rails the
// root app/loading.tsx would otherwise render here.

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className ?? ''}`} />
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      {/* Navbar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Shimmer className="h-7 w-28" />
          <Shimmer className="h-8 w-24 rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Shimmer className="h-8 w-48" />
        <div className="mt-6 divide-y divide-white/[0.06]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-4">
              <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
