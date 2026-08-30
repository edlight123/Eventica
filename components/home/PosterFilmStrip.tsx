'use client'

// Act 1 of the homepage cinema (posh calibration, 2026-08-29): a slow film
// strip of real posters running under the hero. Pure CSS marquee — two copies
// of the track translating -50% — so it costs no JS per frame, pauses on
// hover, and degrades to a plain swipeable row under reduced motion. Every
// poster is a real link into its event.

import Link from 'next/link'
import Image from 'next/image'

interface StripEvent {
  id: string
  title: string
  banner_image_url?: string | null
}

export default function PosterFilmStrip({ events }: { events: StripEvent[] }) {
  const posters = (events || []).filter((e) => e?.banner_image_url).slice(0, 14)
  if (posters.length < 4) return null

  // Duplicate the track so the -50% loop is seamless.
  const track = [...posters, ...posters]

  return (
    <section
      aria-label="Event posters"
      className="film-strip group relative isolate overflow-hidden border-b border-white/10 bg-[#0a0a0a] py-6"
    >
      <div className="film-strip-track flex w-max gap-3 motion-reduce:w-auto motion-reduce:overflow-x-auto">
        {track.map((ev, i) => (
          <Link
            key={`${ev.id}-${i}`}
            href={`/events/${ev.id}`}
            prefetch={false}
            // The duplicate half is presentation only — keep it out of the tab
            // order and the accessibility tree.
            aria-hidden={i >= posters.length || undefined}
            tabIndex={i >= posters.length ? -1 : undefined}
            data-cursor="view"
            className="relative block h-44 w-[141px] shrink-0 overflow-hidden rounded transition-opacity duration-200 hover:opacity-80 sm:h-56 sm:w-[179px]"
          >
            <Image
              src={ev.banner_image_url as string}
              alt={ev.title}
              fill
              sizes="180px"
              quality={55}
              className="object-cover"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}
