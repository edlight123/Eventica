// Loading boundary for the /admin subtree — Control Room styling: elevation
// steps, no outlined boxes. Renders inside AdminLayout (rail already painted),
// so it stands in for the page body only.

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-console-panel ${className ?? ''}`} />
}

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <Shimmer className="h-4 w-44" />
      <div className="mt-6 flex flex-col gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-r-md border-l-2 border-console-faint bg-console-panel px-4 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Shimmer className="h-3.5 w-1/3 bg-console-raise" />
              <Shimmer className="h-3 w-1/4 bg-console-raise" />
            </div>
            <Shimmer className="h-3.5 w-10 bg-console-raise" />
          </div>
        ))}
      </div>
    </div>
  )
}
