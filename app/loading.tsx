import EventCardSkeleton from '@/components/EventCardSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      {/* Navbar Skeleton */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="hidden md:flex space-x-4">
                <div className="h-8 w-20 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Skeleton */}
      <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <div className="h-16 w-3/4 bg-white/20 rounded-lg mx-auto mb-6 animate-pulse"></div>
            <div className="h-8 w-1/2 bg-white/10 rounded-lg mx-auto animate-pulse"></div>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="h-14 bg-white rounded-xl shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Featured Carousel Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-6 w-96 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
      </div>

      {/* Event Categories Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="h-10 w-72 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-6 w-80 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      </div>
    </div>
  )
}
