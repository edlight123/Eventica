export default function DangerZoneLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-[#242424] rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-64 bg-[#242424] rounded mb-2 animate-pulse" />
          <div className="h-5 w-96 bg-[#242424] rounded animate-pulse" />
        </div>
        
        {/* Warning Banner Skeleton */}
        <div className="border-2 border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-red-200 rounded animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 bg-red-200 rounded animate-pulse" />
              <div className="h-4 w-full bg-red-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Action Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#141414] rounded-xl border-2 border-white/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-56 bg-[#242424] rounded animate-pulse" />
                  <div className="h-4 w-full bg-[#242424] rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-[#242424] rounded animate-pulse" />
                </div>
                <div className="h-10 w-32 bg-[#242424] rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
