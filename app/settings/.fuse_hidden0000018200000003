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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-2 mb-6">
          <div className="h-8 w-44 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>

        {/* Settings sections skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
