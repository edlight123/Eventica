'use client'

// The statement hero: SA K AP PASE? — the question Haiti actually asks on a
// Friday. Giant poster-voice type with real event artwork floating around it;
// the posters drift on their own clocks AND lean toward the cursor (each at
// its own depth), so the first screen feels like a room, not a banner.
// Transform layers are kept separate — parallax on the outer wrapper, float
// on the middle, rotation on the link — so nothing clobbers anything.

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { usePosterAccent } from '@/components/ui/usePosterAccent'
import HeroSearch from '@/components/home/HeroSearch'
import { CityChips } from '@/components/HeroSection'

interface HeroPoster {
  id: string
  title: string
  banner_image_url: string
}

function FloatingPoster({
  ev,
  wrapper,
  rotate,
  depth,
  floatDur,
  floatDelay,
  enterDelay,
}: {
  ev: HeroPoster
  wrapper: string
  rotate: string
  /** Cursor-lean, in px at full mouse deflection. Deeper = moves more. */
  depth: number
  floatDur: string
  floatDelay: string
  enterDelay: string
}) {
  const accent = usePosterAccent(ev.banner_image_url)
  return (
    <div
      className={`plt-enter absolute ${wrapper}`}
      style={{ ['--d' as any]: enterDelay }}
      aria-hidden
    >
      {/* cursor parallax — follows --mx/--my set on the section */}
      <div
        className="transition-transform duration-500 ease-out"
        style={{
          transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`,
        }}
      >
        <div className="plt-float" style={{ ['--dur' as any]: floatDur, ['--d' as any]: floatDelay }}>
          <Link
            href={`/events/${ev.id}`}
            prefetch={false}
            tabIndex={-1}
            className={`block aspect-[4/5] w-full overflow-hidden rounded transition-opacity duration-200 hover:opacity-90 ${rotate}`}
            style={{ boxShadow: `0 0 56px -6px rgba(${accent},0.35)` }}
          >
            <Image
              src={ev.banner_image_url}
              alt=""
              fill
              sizes="220px"
              quality={65}
              className="object-cover"
            />
          </Link>
        </div>
      </div>
    </div>
  )
}

/** Scatter layout for up to five posters; each entry is [wrapper, rotate,
    depth, floatDur, floatDelay]. Deliberately loose — a wall, not a grid. */
const SLOTS: [string, string, number, string, string][] = [
  ['right-[5%] top-[10%] z-0 w-[190px] xl:w-[220px]', 'rotate-3', 22, '7s', '0s'],
  ['right-[26%] bottom-[12%] z-0 w-[150px] opacity-90', '-rotate-6', 34, '8s', '1.1s'],
  ['right-[3%] bottom-[20%] z-0 w-[128px] opacity-80', 'rotate-6', 46, '9s', '0.5s'],
  ['left-[40%] top-[7%] z-0 hidden w-[110px] opacity-60 xl:block', '-rotate-3', 28, '8.5s', '1.7s'],
  ['right-[43%] top-[30%] z-0 hidden w-[96px] opacity-50 xl:block', 'rotate-2', 52, '10s', '2.2s'],
]

export default function HeroPase({
  posters = [],
  events,
}: {
  /** Real artwork (picks first) scattered around the headline. */
  posters?: HeroPoster[]
  /** Upcoming events for the search autocomplete. */
  events?: any[]
}) {
  const { t } = useTranslation('common')
  const ref = useRef<HTMLElement>(null)

  // One mousemove → two CSS vars; every poster derives its own lean from them.
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5))
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5))
  }

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      className="relative isolate flex min-h-[78vh] items-center overflow-hidden sm:min-h-[84vh]"
    >
      {/* the floating room — desktop only; mobile stays type-first, the film
          strip right below carries the artwork */}
      <div className="absolute inset-0 hidden md:block">
        {posters.slice(0, SLOTS.length).map((ev, i) => (
          <FloatingPoster
            key={ev.id}
            ev={ev}
            wrapper={SLOTS[i][0]}
            rotate={SLOTS[i][1]}
            depth={SLOTS[i][2]}
            floatDur={SLOTS[i][3]}
            floatDelay={SLOTS[i][4]}
            enterDelay={`${0.35 + i * 0.12}s`}
          />
        ))}
      </div>

      {/* pointer-events pass through the copy layer so the floating posters
          stay hoverable; the search and chips re-enable their own. */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <p
          className="plt-enter font-display lowercase italic !text-[17px] !leading-none text-white/60"
          style={{ ['--d' as any]: '0s' }}
        >
          {t('events.hero_tagline', { defaultValue: 'where Haiti goes out.' })}
        </p>
        <h1
          className="plt-enter mt-5 font-grotesk font-bold uppercase tracking-[-0.02em] text-white !leading-[0.95] !text-[clamp(56px,12vw,164px)]"
          style={{ ['--d' as any]: '0.08s' }}
        >
          {t('events.hero_pase_line1', { defaultValue: 'Sa k ap' })}
          <br />
          {t('events.hero_pase_line2', { defaultValue: 'pase?' })}
        </h1>
        <p
          className="plt-enter mt-6 max-w-xl font-display lowercase italic !text-[clamp(18px,2.4vw,24px)] !leading-snug text-white/70"
          style={{ ['--d' as any]: '0.18s' }}
        >
          {t('events.hero_pase_sub', {
            defaultValue: 'concerts, fèt, festivals — in Haiti and the diaspora.',
          })}
        </p>
        <div className="plt-enter pointer-events-auto mt-9 max-w-xl" style={{ ['--d' as any]: '0.28s' }}>
          <HeroSearch events={events} />
        </div>
        <div className="plt-enter pointer-events-auto mt-5" style={{ ['--d' as any]: '0.36s' }}>
          <CityChips />
        </div>
      </div>

      {/* scroll cue — a breathing hairline */}
      <div
        aria-hidden
        className="plt-breathe absolute bottom-5 left-1/2 hidden h-12 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-white/40 lg:block"
      />
    </section>
  )
}
