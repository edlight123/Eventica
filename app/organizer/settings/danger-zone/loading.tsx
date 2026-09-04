/**
 * Organizer → Settings → Danger Zone loading skeleton.
 *
 * The old one filled the warning banner with `bg-red-200` bars — #fecaca, a
 * pastel pink band strobing across a black page on every navigation, the same
 * family of mistake as the `bg-white/80` flash this codebase used to ship. The
 * bars are `.skeleton` now; the RED lives where the real page puts it, in the
 * `border-2 border-red-500/30` outline and the per-card border tiers.
 *
 * Page body only: the organizer layout already paints OrganizerTopNav and the
 * `pb-mobile-nav` main.
 *
 * Derived geometry (app/organizer/settings/danger-zone/page.tsx → DangerZone):
 *   root    min-h-screen bg-[#0a0a0a] py-8
 *   inner   max-w-3xl px-4 sm:px-6 lg:px-8
 *   back    inline text-sm link + 16px chevron, mb-6
 *   header  PageHeader — eyebrow, h1 mt-1.5 clamp(26px,4vw,38px), subtitle
 *           mt-1.5  (the eyebrow was missing here). The banner follows with no
 *           top margin, so they touch.
 *   banner  border-2 border-red-500/30 rounded-xl p-4 mb-6 — a 20px icon
 *           beside a bold line over two lines of 14px copy
 *   cards   space-y-4 of three `rounded-xl border-2 bg-white/[0.03] p-6`, one
 *           per escalation tier (white/10 → amber-300 → red-300): an icon plus
 *           a bold line and a 14px paragraph on the left, a `px-4 py-2
 *           rounded-lg` outlined button on the right
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />
}

const TIERS = ['border-white/10', 'border-amber-300', 'border-red-300']

export default function DangerZoneLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Bar className="mb-6 h-5 w-32" />

        <div>
          <Bar className="h-2.5 w-16" />
          <Bar className="mt-1.5 h-8 w-52 sm:h-9 sm:w-60" />
          <Bar className="mt-1.5 h-4 w-72 max-w-full" />
        </div>

        {/* Warning banner — the red is the outline, never a fill. */}
        <div className="mb-6 rounded-xl border-2 border-red-500/30 p-4">
          <div className="flex items-start gap-3">
            <div className="skeleton mt-0.5 h-5 w-5 shrink-0 rounded" />
            <div className="min-w-0 flex-1">
              <Bar className="mb-1 h-5 w-48" />
              <Bar className="h-4 w-full" />
              <Bar className="mt-1.5 h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-4">
          {TIERS.map((tier) => (
            <div key={tier} className={`rounded-xl border-2 bg-white/[0.03] p-6 ${tier}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="skeleton h-5 w-5 shrink-0 rounded" />
                    <Bar className="h-5 w-44" />
                  </div>
                  <Bar className="h-4 w-full" />
                  <Bar className="mt-1.5 h-4 w-3/4" />
                </div>
                <Bar className="h-10 w-32 shrink-0 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
