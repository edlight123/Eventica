/**
 * Homepage loading skeleton.
 *
 * Rebuilt from measurements of the live page, because the old one was drawing
 * a layout the site no longer has: a `rounded-3xl` featured-hero card and
 * three horizontal poster rails. That hero was retired in the 2026-08-30
 * refactor in favour of the SAK PASE? statement hero, so every navigation to
 * the homepage flashed a completely different page and then replaced it.
 *
 * What actually loads, measured:
 *   402px  — navbar 56 · hero section 682 (min-h-78vh; tagline at y257,
 *            two title lines at y294 h106, search at y485 h52 w370) ·
 *            film strip 224 with 141x176 cards · then the content container
 *   1280px — navbar 64 · hero 734 (title h292, search w576) · film strip ·
 *            content
 *
 * The floating posters are in here too, at the same slots and opacities as
 * HeroPase's first three, because they occupy real space on the right of the
 * hero and leaving them out would make the skeleton read as a much emptier
 * page than the one arriving.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-mobile-nav">
      {/* Navbar. `flush` on the real homepage means no bottom rule here. */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <div className="flex items-center gap-8">
              <Bar className="h-7 w-24" />
              <div className="hidden gap-6 md:flex">
                <Bar className="h-4 w-16" />
                <Bar className="h-4 w-16" />
                <Bar className="h-4 w-24" />
              </div>
            </div>
            <Bar className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[78vh] items-center overflow-hidden sm:min-h-[84vh]">
        {/* The scatter. Same three slots HeroPase uses at each width, so the
            right-hand side of the screen is not empty until the real posters
            arrive. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="skeleton absolute right-[2%] top-[3%] aspect-[4/5] w-[132px] rotate-3 rounded opacity-50 sm:right-[5%] sm:top-[10%] sm:w-[190px] xl:w-[220px]" />
          <div className="skeleton absolute right-[5%] bottom-[16%] aspect-[4/5] w-[104px] -rotate-6 rounded opacity-30 sm:right-[26%] sm:bottom-[12%] sm:w-[150px]" />
          <div className="skeleton absolute left-[2%] bottom-[2%] aspect-[4/5] w-[92px] rotate-6 rounded opacity-25 sm:left-auto sm:right-[3%] sm:bottom-[20%] sm:w-[128px]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          {/* tagline */}
          <Bar className="h-4 w-40" />
          {/* SAK / PASE? — two lines of clamp(56px,12vw,164px) type */}
          <Bar className="mt-5 h-[48px] w-[58%] max-w-[420px] sm:h-[92px] xl:h-[140px]" />
          <Bar className="mt-2 h-[48px] w-[70%] max-w-[520px] sm:h-[92px] xl:h-[140px]" />
          {/* sub */}
          <Bar className="mt-6 h-5 w-4/5 max-w-xl" />
          {/* the search field — w-370 on a phone, max-w-xl from sm */}
          <div className="skeleton mt-9 h-[52px] w-full max-w-xl rounded-2xl" />
        </div>
      </section>

      {/* ── FILM STRIP ───────────────────────────────────────────────────── */}
      <section aria-hidden className="overflow-hidden bg-white/[0.03] py-6">
        <div className="flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-44 w-[141px] shrink-0 rounded sm:h-56 sm:w-[179px]"
            />
          ))}
        </div>
      </section>

      {/* ── FIRST CONTENT SECTION ────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 md:py-12">
        {/* An editorial section header: eyebrow, serif title, description. */}
        <Bar className="h-2.5 w-20" />
        <Bar className="mt-3 h-8 w-52 sm:h-9 sm:w-64" />
        <Bar className="mt-2 h-4 w-64 max-w-full" />

        {/* The card grid the rails resolve to. */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton aspect-[4/5] w-full rounded-xl" />
              <Bar className="mt-3 h-4 w-3/4" />
              <Bar className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
