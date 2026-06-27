export default function SecurityLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-[#242424] rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-48 bg-[#242424] rounded mb-2 animate-pulse" />
          <div className="h-5 w-96 bg-[#242424] rounded animate-pulse" />
        </div>
        <div className="space-y-6">
          {/* Password Change Skeleton */}
          <div className="bg-[#141414] rounded-xl border border-white/10 shadow-sm p-6">
            <div className="h-6 w-48 bg-[#242424] rounded mb-6 animate-pulse" />
            <div className="space-y-4 max-w-md">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-5 w-32 bg-[#242424] rounded mb-2 animate-pulse" />
                  <div className="h-11 w-full bg-[#242424] rounded-lg animate-pulse" />
                </div>
              ))}
              <div className="h-11 w-36 bg-[#242424] rounded-lg animate-pulse" />
            </div>
          </div>
          
          {/* 2FA Skeleton */}
          <div className="bg-[#141414] rounded-xl border border-white/10 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-6 w-64 bg-[#242424] rounded mb-2 animate-pulse" />
                <div className="h-4 w-80 bg-[#242424] rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-[#242424] rounded-full animate-pulse" />
            </div>
          </div>

          {/* Login History Skeleton */}
          <div className="bg-[#141414] rounded-xl border border-white/10 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="h-6 w-56 bg-[#242424] rounded mb-1 animate-pulse" />
              <div className="h-4 w-72 bg-[#242424] rounded animate-pulse" />
            </div>
            <div className="divide-y divide-white/10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-[#242424] rounded animate-pulse" />
                      <div className="h-4 w-64 bg-[#242424] rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-32 bg-[#242424] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
