/**
 * Notifications loading skeleton — a list, not the homepage poster rails the
 * root app/loading.tsx would otherwise render here.
 *
 * Re-derived from NotificationsClient, which had moved on from what this drew:
 * the container is py-8 / sm:py-12 (this said py-6), the header is a full
 * EditorialHeader with an eyebrow, a serif title, a subtitle and a right-hand
 * action pair, and each row is `flex items-start gap-3.5 px-4 py-4 sm:py-5`
 * with a `rounded-xl` 36px icon tile — not a circle — under a group label.
 *
 * Derived geometry:
 *   navbar   h-14 sm:h-16 · max-w-7xl px-4 sm:px-6 lg:px-8 · bottom hairline
 *   body     mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8
 *   header   EditorialHeader — eyebrow, h1 mt-1.5 clamp(28px,4vw,40px),
 *            p mt-1.5, plus two ghost buttons on the right
 *   list     mt-8 sm:mt-10; group head `pb-3` (eyebrow + hairline rule), then
 *            a `border-t` block of rows, each `border-b border-white/[0.07]`
 *            with px-4 py-4 sm:py-5 and a 36px rounded-xl icon
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      {/* Navbar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Bar className="h-7 w-28" />
          <Bar className="h-8 w-24 rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* EditorialHeader: eyebrow · serif title · subtitle · actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Bar className="h-2.5 w-20" />
            <Bar className="mt-1.5 h-8 w-48 sm:h-10 sm:w-56" />
            <Bar className="mt-1.5 h-4 w-56 max-w-full" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Bar className="h-9 w-28 rounded-full" />
            <Bar className="h-9 w-20 rounded-full" />
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          {/* group label + hairline */}
          <div className="flex items-center gap-3 pb-3">
            <Bar className="h-2.5 w-16" />
            <span aria-hidden className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <div className="border-t border-white/[0.07]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-white/[0.07]">
                <div className="flex items-start gap-3.5 px-4 py-4 sm:py-5">
                  <div className="skeleton mt-0.5 h-9 w-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Bar className="h-4 w-3/4" />
                    <Bar className="mt-2 h-3.5 w-full max-w-sm" />
                    <Bar className="mt-2 h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
