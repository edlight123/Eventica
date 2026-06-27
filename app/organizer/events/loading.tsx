import LoadingSkeleton from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white/5 to-white/10 pb-mobile-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="h-8 w-56 bg-[#242424] rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-[#242424] rounded-md mt-1.5 animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-[#242424] rounded-md animate-pulse" />
        </div>
        {/* Filters/header row placeholder */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-24 bg-[#242424] rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-[#242424] rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-[#242424] rounded-md animate-pulse" />
        </div>
        <LoadingSkeleton rows={6} />
      </div>
    </div>
  )
}
