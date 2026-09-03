export default function DefaultsLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-white/[0.06] rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-64 bg-white/[0.06] rounded mb-2 animate-pulse" />
          <div className="h-5 w-full max-w-lg bg-white/[0.06] rounded animate-pulse" />
        </div>
        <div className="bg-[#0a0a0a] rounded-xl  shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-5 w-28 bg-white/[0.06] rounded mb-2 animate-pulse" />
                <div className="h-11 w-full bg-white/[0.06] rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-5 w-32 bg-white/[0.06] rounded mb-2 animate-pulse" />
              <div className="h-11 w-full bg-white/[0.06] rounded-lg animate-pulse" />
            </div>
          ))}
          <div>
            <div className="h-5 w-40 bg-white/[0.06] rounded mb-3 animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-white/[0.06] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
