'use client'

export function EventHeroSkeleton() {
  return (
    <div className="relative bg-gray-200 h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-gray-300 via-gray-200 to-transparent" />
      <div className="relative h-full flex flex-col justify-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 w-full">
          {/* Chips */}
          <div className="flex gap-2 mb-4">
            <div className="h-7 w-24 bg-gray-300 rounded-full" />
            <div className="h-7 w-20 bg-gray-300 rounded-full" />
          </div>
          
          {/* Title */}
          <div className="space-y-2 mb-6">
            <div className="h-10 bg-gray-300 rounded-lg w-3/4" />
            <div className="h-10 bg-gray-300 rounded-lg w-1/2" />
          </div>
          
          {/* Organizer pill */}
          <div className="h-14 w-64 bg-gray-300/50 backdrop-blur rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function QuickFactsSkeleton() {
  return (
    <div className="bg-white border-y border-gray-200 -mx-4 sm:mx-0 sm:rounded-2xl sm:border">
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
