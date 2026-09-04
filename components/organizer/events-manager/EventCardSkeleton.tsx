export default function EventCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-2xl bg-white/[0.03] p-3">
      {/* Poster thumbnail */}
      <div className="h-[72px] w-[58px] shrink-0 rounded-none bg-white/[0.06]" />

      {/* Title + meta */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-20 rounded-[10px] bg-white/[0.06]" />
        <div className="h-4 w-2/3 rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.06]" />
      </div>

      {/* Stats */}
      <div className="hidden items-center gap-6 sm:flex">
        <div className="h-8 w-12 rounded bg-white/[0.06]" />
        <div className="h-8 w-16 rounded bg-white/[0.06]" />
      </div>
    </div>
  )
}
