export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      {/* Navbar skeleton */}
      <div className="bg-[#141414] border-b border-white/10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-[#242424] rounded animate-pulse" />
            <div className="h-8 w-20 bg-[#1c1c1c] rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Header shimmer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-2 mb-6">
          <div className="h-8 w-56 bg-[#242424] rounded animate-pulse" />
          <div className="h-4 w-80 bg-[#1c1c1c] rounded animate-pulse" />
        </div>

        {/* Dashboard metric cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#141414] border border-white/10 rounded-xl" />
          ))}
        </div>

        {/* Recent events list skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#141414] border border-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
