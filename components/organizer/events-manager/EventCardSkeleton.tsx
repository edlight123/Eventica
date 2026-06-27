export default function EventCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141414] p-3 animate-pulse">
      {/* Poster thumbnail */}
      <div className="h-[72px] w-[58px] shrink-0 rounded-lg bg-[#242424]" />

      {/* Title + meta */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-20 rounded-full bg-[#242424]" />
        <div className="h-4 w-2/3 rounded bg-[#242424]" />
        <div className="h-3 w-1/2 rounded bg-[#242424]" />
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-6 sm:flex">
        <div className="h-8 w-12 rounded bg-[#242424]" />
        <div className="h-8 w-16 rounded bg-[#242424]" />
      </div>
    </div>
  )
}
