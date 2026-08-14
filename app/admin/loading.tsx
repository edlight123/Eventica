// Loading boundary for the whole /admin subtree.
//
// Every admin route previously fell through to the ROOT app/loading.tsx, which
// is the public homepage's featured-hero + poster-rails skeleton — so moving
// between admin tabs flashed a consumer marketing layout. This renders inside
// AdminLayout (top nav and command bar are already painted), so it only needs
// to stand in for the page body: a title, a stat strip, and a table.

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.06] ${className ?? ''}`} />
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Shimmer className="h-8 w-56" />
      <Shimmer className="mt-2 h-4 w-80 max-w-full" />

      {/* Stat strip */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0a0a0a] p-4">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <Shimmer className="h-4 w-32" />
        </div>
        <div className="divide-y divide-white/[0.06]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Shimmer className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Shimmer className="h-4 w-1/3" />
                <Shimmer className="h-3 w-1/4" />
              </div>
              <Shimmer className="hidden h-4 w-20 sm:block" />
              <Shimmer className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
