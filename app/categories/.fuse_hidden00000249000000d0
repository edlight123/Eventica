export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      {/* Navbar skeleton */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Header shimmer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="space-y-2 mb-6 md:mb-8">
          <div className="h-7 md:h-8 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 md:h-5 w-72 bg-gray-100 rounded animate-pulse" />
        </div>

        {/* Category grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 md:h-44 bg-white border border-gray-200 rounded-xl" />
          ))}
        </div>

        {/* Selected category events skeleton (static rows) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 md:h-56 bg-white border border-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
