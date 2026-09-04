/**
 * Profile loading skeleton.
 *
 * The old one was a different page: a `max-w-7xl` container (the real one is
 * `max-w-4xl`), an avatar-and-name header the page does not have — ProfileClient
 * opens with a plain title and an optional organizer button, the avatar lives
 * INSIDE the first card — and six `bg-white/[0.03] border border-white/10`
 * blocks, whose fill is invisible on a `#0a0a0a` page. Its navbar was `py-3`
 * (56px at every width) against a real `h-14 sm:h-16`.
 *
 * Derived geometry:
 *   navbar   h-14 sm:h-16 · max-w-7xl px-4 sm:px-6 lg:px-8 · bottom hairline
 *   body     max-w-4xl px-4 sm:px-6 lg:px-8 py-3 sm:py-6 md:py-8
 *   header   mb-4 sm:mb-6 — h1 text-xl / sm:2xl / md:3xl with mb-1 sm:mb-2,
 *            subtitle `hidden sm:block`, and a right-hand organizer button
 *            (py-2 sm:py-2.5, rounded-lg) for verified organizers
 *   cards    space-y-3 sm:space-y-6 — six identical shells:
 *            `bg-white/[0.03] rounded-2xl border border-white/10 p-6`, each
 *            opening with a 40px rounded-lg icon tile beside a title
 *
 * The card fill stays at white/[0.03] because that is the real card's fill —
 * what has to be visible is the CONTENT, and every bar inside uses `.skeleton`.
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
          <Bar className="h-7 w-24" />
          <Bar className="h-8 w-20 rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 sm:py-6 md:py-8 lg:px-8">
        {/* Page header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div>
              <Bar className="mb-1 h-7 w-40 sm:mb-2 sm:h-8 sm:w-52 md:h-9" />
              {/* subtitle is hidden below sm on the real page */}
              <Bar className="hidden h-5 w-64 sm:block" />
            </div>
            <Bar className="h-10 w-10 shrink-0 rounded-lg sm:h-11 sm:w-36" />
          </div>
        </div>

        {/* Six cards, each an icon tile + title, then its content lines. */}
        <div className="space-y-3 sm:space-y-6">
          {[3, 2, 3, 2, 3, 2].map((lines, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Bar className="h-5 w-40" />
                  <Bar className="mt-1.5 h-3.5 w-56 max-w-full" />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {Array.from({ length: lines }).map((_, l) => (
                  <Bar key={l} className={`h-11 ${l === lines - 1 ? 'w-2/3' : 'w-full'} rounded-xl`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
