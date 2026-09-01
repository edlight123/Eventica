'use client'

// Act 3: the cities showcase — posh's organizer-list theatre, translated to
// the thing that actually differentiates Tikèm: the diaspora. v3 (2026-09-01):
// the section is now a SCROLL THEATRE — the stage pins and each city owns
// ~55vh of scroll, so the reader spends real time in every room instead of
// racing a 3.5s timer. Scroll drives the active city; the underline fills
// with the city's own scroll span; a ghost index numeral (01…06) crossfades
// behind the stage; rows brighten by distance from the active one. Hover
// still steals the stage instantly. The backdrop collage breathes
// (Ken-Burns) and parallaxes against the scroll. Every name is a REAL
// filter (the same /?city= routing the hero chips use). Reduced motion gets
// a still, fully-visible, unpinned list.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

export interface CityShowcaseEntry {
  city: string
  posters: string[]
}

/** Scroll each city owns, in vh. */
const VH_PER_CITY = 55

export default function CitiesShowcase({ cities }: { cities: CityShowcaseEntry[] }) {
  const { t } = useTranslation('common')
  const [scrollActive, setScrollActive] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [seen, setSeen] = useState(false)
  const [still, setStill] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLElement>(null)

  const n = cities.length

  // One rAF'd scroll listener does everything continuous: picks the active
  // city from the track progress, writes --within (the active city's own
  // 0→1 span, for the underline) and --p (whole-section progress, for the
  // backdrop parallax) as CSS vars so only index changes re-render React.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setSeen(true)
      return
    }
    const io = trackRef.current
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setSeen(true)
          },
          { threshold: 0.05 }
        )
      : null
    if (io && trackRef.current) io.observe(trackRef.current)

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const track = trackRef.current
        const stage = stageRef.current
        if (!track || !stage) return
        const rect = track.getBoundingClientRect()
        const vh = window.innerHeight
        if (rect.bottom < -80 || rect.top > vh + 80) return
        const scrollable = rect.height - vh
        if (scrollable <= 0) return
        const p = Math.min(1, Math.max(0, -rect.top / scrollable))
        // Give the last city a real dwell: map p over n segments, clamped.
        const seg = Math.min(n - 1e-4, p * n)
        const idx = Math.floor(seg)
        setScrollActive((cur) => (cur === idx ? cur : idx))
        stage.style.setProperty('--within', (seg - idx).toFixed(4))
        stage.style.setProperty('--p', p.toFixed(4))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io?.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [n])

  if (n === 0) return null

  const active = hoverIdx ?? scrollActive

  return (
    <div
      ref={trackRef}
      className="relative bg-[#0a0a0a]"
      style={still ? undefined : { height: `${n * VH_PER_CITY + 100}vh` }}
    >
      <section
        ref={stageRef}
        aria-label={t('home.cities_title', { defaultValue: 'Cities' })}
        className={`isolate overflow-hidden bg-[#0a0a0a] ${
          still ? 'relative' : 'sticky top-0 flex h-screen items-center'
        }`}
        style={{ ['--p' as any]: 0.5, ['--within' as any]: 0 }}
      >
        {/* Backdrops: one collage per city, crossfaded; the collage breathes
            (Ken-Burns) and the whole layer parallaxes against the scroll. */}
        <div
          aria-hidden
          className="absolute inset-[-6%] -z-10"
          style={{ transform: 'translate3d(0, calc((0.5 - var(--p, 0.5)) * 48px), 0)' }}
        >
          {cities.map((c, i) => (
            <div
              key={c.city}
              className={`absolute inset-0 transition-[opacity,transform] duration-[1100ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                i === active ? 'scale-100 opacity-100' : 'scale-[1.06] opacity-0'
              }`}
            >
              {c.posters.length > 0 && (
                <div className="grid h-full grid-cols-2 gap-2 p-2 opacity-40 sm:grid-cols-4">
                  {c.posters.slice(0, 4).map((src, j) => (
                    <div key={`${c.city}-${j}`} className="relative overflow-hidden rounded">
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="25vw"
                        quality={45}
                        className={`object-cover ${still ? '' : 'tk-kenburns'}`}
                        style={{ animationDelay: `${j * -2.2}s` }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]/85" />
            </div>
          ))}
        </div>

        {/* Ghost index numeral — the theatre's page number. */}
        {!still && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-[4%] top-1/2 -z-[5] hidden -translate-y-1/2 md:block"
          >
            {cities.map((c, i) => (
              <span
                key={c.city}
                className={`absolute right-0 top-1/2 -translate-y-1/2 font-grotesk text-[26vh] font-bold leading-none tracking-[-0.04em] text-white/[0.05] transition-all duration-1000 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                  i === active ? 'translate-x-0 opacity-100 blur-0' : 'translate-x-10 opacity-0 blur-md'
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
        )}

        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p
            className="font-display lowercase italic text-[clamp(17px,2vw,22px)] text-white/60 transition-all duration-700"
            style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(14px)' }}
          >
            {t('home.cities_eyebrow', { defaultValue: 'where Haiti goes out — everywhere' })}
          </p>

          <ul className="mt-6 space-y-1">
            {cities.map((c, i) => {
              const isActive = i === active
              const dist = Math.abs(i - active)
              return (
                <li
                  key={c.city}
                  className="transition-all duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    opacity: seen ? 1 : 0,
                    transform: seen ? 'none' : `translateX(${i % 2 === 0 ? '-5vw' : '5vw'})`,
                    transitionDelay: seen ? '0ms' : `${i * 90}ms`,
                  }}
                >
                  <Link
                    href={`/?city=${encodeURIComponent(c.city)}`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    onFocus={() => setHoverIdx(i)}
                    onBlur={() => setHoverIdx(null)}
                    className={`group inline-flex items-baseline gap-4 font-grotesk font-bold uppercase !leading-[1.05] tracking-[-0.02em] transition-all duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] text-[clamp(30px,5.6vw,64px)] ${
                      isActive
                        ? 'translate-x-2 text-white'
                        : dist === 1
                          ? 'text-white/30 hover:text-white/60'
                          : 'text-white/[0.14] hover:text-white/60'
                    }`}
                  >
                    <span className="relative">
                      {/* the active name rises in letter by letter; the
                          padding shields diacritics (É, Ï) from the clip */}
                      {isActive && !still ? (
                        <span
                          key={`letters-${c.city}`}
                          className="inline-block overflow-hidden pt-[0.14em] align-bottom"
                          style={{ marginTop: '-0.14em' }}
                        >
                          {c.city.split('').map((ch, j) => (
                            <span key={j} className="tk-letter" style={{ animationDelay: `${j * 30}ms` }}>
                              {ch === ' ' ? ' ' : ch}
                            </span>
                          ))}
                        </span>
                      ) : (
                        c.city
                      )}
                      {/* the underline fills with this city's own scroll span;
                          hover claims it whole */}
                      {isActive && !still && (
                        <span
                          className="absolute -bottom-1 left-0 h-[2px] bg-white/70"
                          style={{
                            width: hoverIdx === i ? '100%' : 'calc(var(--within, 0) * 100%)',
                          }}
                          aria-hidden
                        />
                      )}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className={`h-[0.5em] w-[0.5em] shrink-0 self-center transition-all duration-300 ${
                        isActive
                          ? 'translate-x-0 opacity-70'
                          : '-translate-x-3 opacity-0 group-hover:translate-x-0 group-hover:opacity-50'
                      }`}
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
