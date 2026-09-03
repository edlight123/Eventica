export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      {/* Navbar skeleton */}
      <div className="bg-[#0a0a0a] border-b border-white/10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-8 w-20 bg-white/[0.04] rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Header shimmer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-2 mb-6">
          <div className="h-8 w-48 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/[0.04] rounded animate-pulse" />
        </div>

        {/* List skeleton (static rows) */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.03] border border-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
