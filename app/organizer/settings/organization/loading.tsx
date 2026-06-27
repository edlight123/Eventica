export default function OrganizationLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-32 bg-[#242424] rounded mb-6 animate-pulse" />
        <div className="mb-8">
          <div className="h-9 w-96 bg-[#242424] rounded mb-2 animate-pulse" />
          <div className="h-5 w-full max-w-md bg-[#242424] rounded animate-pulse" />
        </div>
        <div className="bg-[#141414] rounded-xl border border-white/10 shadow-sm p-6 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-lg bg-[#242424] animate-pulse" />
            <div className="flex-1">
              <div className="h-10 w-32 bg-[#242424] rounded-lg mb-2 animate-pulse" />
              <div className="h-4 w-40 bg-[#242424] rounded animate-pulse" />
            </div>
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i}>
              <div className="h-5 w-32 bg-[#242424] rounded mb-2 animate-pulse" />
              <div className="h-11 w-full bg-[#242424] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
