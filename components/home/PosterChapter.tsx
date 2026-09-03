'use client'

// Act 2 of the homepage cinema: the pinned poster chapter. A full-screen frame
// holds (position: sticky) while ~1.5 extra viewports of scroll scrub the
// scene — posters drift through at different speeds, and the serif caption
// hands off mid-chapter. This is posh.vip's GSAP pin+scrub mechanic rebuilt as
// a sticky container plus one rAF-throttled scroll listener: no library, no
// per-frame allocation, transforms only (compositor-friendly).
//
// Discipline: sits AFTER the store so theatre never delays a ticket; skips
// itself under four posters; reduced motion gets a still composition with no
// listener at all. Every poster is a real link.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface ChapterEvent {
  id: string
  title: string
  banner_image_url?: string | null
}

/** Per-poster choreography: resting x offset, parallax speed, size, depth. */
const SLOTS = [
  { x: '-34vw', speed: 1.15, w: 'w-36 sm:w-52', z: 'z-10', from: 55 },
  { x: '30vw', speed: 0.75, w: 'w-32 sm:w-44', z: 'z-0', from: 70 },
  { x: '-16vw', speed: 0.9, w: 'w-28 sm:w-40', z: 'z-0', from: 85 },
  { x: '18vw', speed: 1.3, w: 'w-40 sm:w-56', z: 'z-20', from: 60 },
  { x: '38vw', speed: 1.0, w: 'w-28 sm:w-36', z: 'z-0', from: 95 },
] as const

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function PosterChapter({ events }: { events: ChapterEvent[] }) {
  const { t } = useTranslation('common')
  const wrapRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [still, setStill] = useState(false)

  const posters = (events || []).filter((e) => e?.banner_image_url).slice(0, 5)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setProgress(0.5)
      return
    }
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = wrapRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const scrollable = rect.height - window.innerHeight
        if (scrollable <= 0) return
        setProgress(Math.min(1, Math.max(0, -rect.top / scrollable)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (posters.length < 4) return null

  // Non-overlapping handoff: A is fully out before B enters, so the two lines
  // never superimpose as a double exposure.
  const captionA = 1 - smooth(progress, 0.32, 0.46)
  const captionB = smooth(progress, 0.54, 0.68)

  return (
    <div ref={wrapRef} className="relative h-[150vh] bg-white/[0.03] sm:h-[260vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* Posters drifting through at different speeds. */}
        {posters.map((ev, i) => {
          const slot = SLOTS[i % SLOTS.length]
          const y = still ? 0 : slot.from - progress * slot.from * 2 * slot.speed
          const scale = 0.92 + 0.12 * smooth(progress, 0.15, 0.6)
          return (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              prefetch={false}
              aria-label={ev.title}
              className={`absolute ${slot.w} ${slot.z} block`}
              style={{
                left: '50%',
                transform: `translateX(calc(-50% + ${slot.x})) translateY(${y}vh) scale(${scale})`,
                willChange: still ? undefined : 'transform',
              }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded shadow-[0_24px_70px_-16px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
                <Image
                  src={ev.banner_image_url as string}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 40vw, 260px"
                  quality={60}
                  className="object-cover"
                />
              </div>
            </Link>
          )
        })}

        {/* The captions hold the center; the posters part around them. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <p
            className="absolute px-6 text-center font-display lowercase italic !text-[clamp(28px,4.6vw,54px)] !leading-[1.1] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)]"
            style={{ opacity: captionA }}
          >
            {t('home.chapter_a', { defaultValue: 'the poster is the invitation.' })}
          </p>
          <p
            className="absolute px-6 text-center font-display lowercase italic !text-[clamp(28px,4.6vw,54px)] !leading-[1.1] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)]"
            style={{ opacity: still ? 0 : captionB }}
          >
            {t('home.chapter_b', { defaultValue: 'one tap and you’re in.' })}
          </p>
        </div>
      </div>
    </div>
  )
}
