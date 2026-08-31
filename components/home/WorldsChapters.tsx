'use client'

// The worlds, as a journey — scrolling through Haitian life. Four immersive
// chapters (mizik / lavi lannwit / kilti / espò): each band is washed in its
// world's hue, the giant word drifts horizontally as you scroll past, and the
// world's real posters parallax at their own rates. One rAF'd scroll listener
// writes a single --p (0..1 progress through the viewport) per section;
// everything else is CSS calc off that var. Reduced motion never attaches the
// listener, so the bands render as still compositions (--p stays 0.5).

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { usePosterAccent } from '@/components/ui/usePosterAccent'

export interface WorldChapterData {
  key: string
  label: string
  sublabel: string
  from: string
  to: string
  href: string
  posters: { id: string; title: string; banner_image_url: string }[]
}

function ChapterPoster({
  poster,
  className,
  rotate,
  rate,
}: {
  poster: { id: string; title: string; banner_image_url: string }
  className: string
  rotate: string
  /** Scroll-parallax rate: px of travel across the section at full scroll. */
  rate: number
}) {
  const accent = usePosterAccent(poster.banner_image_url)
  return (
    <div
      className={`absolute ${className}`}
      style={{ transform: `translate3d(0, calc((0.5 - var(--p, 0.5)) * ${rate}px), 0)` }}
      aria-hidden
    >
      <Link
        href={`/events/${poster.id}`}
        prefetch={false}
        tabIndex={-1}
        className={`block aspect-[4/5] w-full overflow-hidden rounded transition-transform duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] ${rotate}`}
        style={{ boxShadow: `0 0 48px -6px rgba(${accent},0.32)` }}
      >
        <Image src={poster.banner_image_url} alt="" fill sizes="200px" quality={60} className="object-cover" />
      </Link>
    </div>
  )
}

const POSTER_SLOTS: [string, string, number][] = [
  ['right-[6%] top-[16%] w-[170px] lg:w-[200px]', 'rotate-3', 90],
  ['right-[24%] bottom-[14%] w-[130px] opacity-90', '-rotate-6', 150],
  ['right-[4%] bottom-[8%] w-[110px] opacity-75', 'rotate-6', 220],
]

function Chapter({ world, flip }: { world: WorldChapterData; flip: boolean }) {
  return (
    <section
      data-chapter
      className="relative isolate overflow-hidden border-t border-white/10"
      style={{ ['--p' as any]: 0.5 }}
    >
      {/* the world's light */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(90% 120% at ${flip ? '85%' : '15%'} 50%, ${world.from}26, #0a0a0a 70%)`,
        }}
      />

      {/* the word's ghost echo — drifts the OPPOSITE way, a layer deeper */}
      <div
        aria-hidden
        className={`absolute bottom-2 -z-10 whitespace-nowrap font-grotesk font-bold uppercase tracking-[-0.02em] text-white/[0.045] !leading-none text-[26vw] ${
          flip ? 'left-[-4vw]' : 'right-[-4vw]'
        }`}
        style={{ transform: 'translate3d(calc((var(--p, 0.5) - 0.5) * 10vw), 0, 0)' }}
      >
        {world.label}
      </div>

      {/* posters drift as you pass — desktop only */}
      <div className="absolute inset-0 hidden md:block">
        {world.posters.slice(0, POSTER_SLOTS.length).map((p, i) => (
          <ChapterPoster
            key={p.id}
            poster={p}
            className={POSTER_SLOTS[i][0]}
            rotate={POSTER_SLOTS[i][1]}
            rate={POSTER_SLOTS[i][2]}
          />
        ))}
      </div>

      <div className="mx-auto flex min-h-[56vh] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        {/* the word IS the artwork: giant, drifting against the scroll */}
        <Link href={world.href} className="group block w-fit outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <h2
            className="whitespace-nowrap font-grotesk font-bold uppercase tracking-[-0.02em] text-white transition-colors duration-300 group-hover:text-white/90 !leading-[0.95] !text-[clamp(52px,11vw,150px)]"
            style={{ transform: 'translate3d(calc((0.5 - var(--p, 0.5)) * 9vw), 0, 0)' }}
          >
            {world.label}
          </h2>
        </Link>
        <p
          className="mt-4 max-w-md font-display lowercase italic !text-[clamp(17px,2.2vw,22px)] !leading-snug text-white/65"
          style={{ transform: 'translate3d(calc((0.5 - var(--p, 0.5)) * 3vw), 0, 0)' }}
        >
          {world.sublabel}
        </p>
        <Link
          href={world.href}
          className="group mt-7 inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand-400 transition-colors hover:text-brand-300"
        >
          explore {world.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  )
}

export default function WorldsChapters({
  worlds,
  moreHref = '/categories',
}: {
  worlds: WorldChapterData[]
  moreHref?: string
}) {
  const { t } = useTranslation('common')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = rootRef.current
    if (!root) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'))
    if (sections.length === 0) return

    let ticking = false
    const update = () => {
      ticking = false
      const vh = window.innerHeight
      for (const el of sections) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -80 || r.top > vh + 80) continue
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
        el.style.setProperty('--p', p.toFixed(4))
      }
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [worlds.length])

  if (!worlds.length) return null

  return (
    <div ref={rootRef}>
      {/* lead-in, in the editorial voice */}
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          {t('events.worlds_eyebrow', { defaultValue: 'Dekouvri' })}
        </p>
        <h2 className="mt-2 font-display lowercase italic !text-[clamp(24px,3.8vw,34px)] !leading-[1.02] text-white/90">
          {t('events.rail_worlds', { defaultValue: 'dekouvri monn ou' })}
        </h2>
      </div>

      {worlds.map((w, i) => (
        <Chapter key={w.key} world={w} flip={i % 2 === 1} />
      ))}

      {/* the remaining worlds, quietly */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-6 text-[14px] text-white/55 sm:px-6 lg:px-8">
          <Link href={moreHref} className="transition-colors hover:text-white">
            gastronomi
          </Link>
          <span className="text-white/25">·</span>
          <Link href={moreHref} className="transition-colors hover:text-white">
            biznis
          </Link>
          <span className="text-white/25">·</span>
          <Link href={moreHref} className="transition-colors hover:text-white">
            fanmi
          </Link>
          <span className="text-white/25">·</span>
          <Link href={moreHref} className="transition-colors hover:text-white">
            eksperyans
          </Link>
          <Link
            href={moreHref}
            className="group ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-400 transition-colors hover:text-brand-300"
          >
            {t('events.all_worlds', { defaultValue: 'all worlds' })}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
