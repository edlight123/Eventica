'use client'

// Act 3: the cities showcase — posh's organizer-list theatre, translated to
// the thing that actually differentiates Tikèm: the diaspora. v2 (2026-08-31
// scroll-film spec): the city rows CASCADE in from alternating sides as the
// section enters, the backdrop collage breathes (Ken-Burns drift) and
// parallaxes against the scroll, and the active city carries a timed
// underline sweep matching the 3.5s auto-advance. Hover still steals the
// stage and now slides the name toward its arrow. Every name is a REAL
// filter (the same /?city= routing the hero chips use). Reduced motion gets
// a still, fully-visible list with no cycling.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

export interface CityShowcaseEntry {
  city: string
  posters: string[]
}

const CYCLE_MS = 3500

export default function CitiesShowcase({ cities }: { cities: CityShowcaseEntry[] }) {
  const { t } = useTranslation('common')
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState(false)
  const [still, setStill] = useState(false)
  const hovering = useRef(false)
  const sectionRef = useRef<HTMLElement>(null)

  // Auto-advance the theatre; hover takes over.
  useEffect(() => {
    if (cities.length < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setSeen(true)
      return
    }
    const id = setInterval(() => {
      if (!hovering.current) setActive((a) => (a + 1) % cities.length)
    }, CYCLE_MS)
    return () => clearInterval(id)
  }, [cities.length])

  // Cascade-in + backdrop parallax: one observer flips .is-seen, one rAF'd
  // scroll listener writes --p for the parallax.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)

    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const node = sectionRef.current
        if (!node) return
        const r = node.getBoundingClientRect()
        const vh = window.innerHeight
        if (r.bottom < -80 || r.top > vh + 80) return
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)))
        node.style.setProperty('--p', p.toFixed(4))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (cities.length === 0) return null

  return (
    <section
      ref={sectionRef}
      aria-label={t('home.cities_title', { defaultValue: 'Cities' })}
      className="relative isolate overflow-hidden bg-[#0a0a0a]"
      style={{ ['--p' as any]: 0.5 }}
      onMouseEnter={() => {
        hovering.current = true
      }}
      onMouseLeave={() => {
        hovering.current = false
      }}
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
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === active ? 'opacity-100' : 'opacity-0'
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

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p
          className="font-display lowercase italic text-[clamp(17px,2vw,22px)] text-white/60 transition-all duration-700"
          style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(14px)' }}
        >
          {t('home.cities_eyebrow', { defaultValue: 'where Haiti goes out — everywhere' })}
        </p>

        <ul className="mt-6 space-y-1">
          {cities.map((c, i) => {
            const isActive = i === active
            return (
              <li
                key={c.city}
                className="transition-all duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: seen ? 1 : 0,
                  transform: seen ? 'none' : `translateX(${i % 2 === 0 ? '-5vw' : '5vw'})`,
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                <Link
                  href={`/?city=${encodeURIComponent(c.city)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`group inline-flex items-baseline gap-4 font-grotesk font-bold uppercase !leading-[1.05] tracking-[-0.02em] transition-all duration-300 text-[clamp(30px,5.6vw,64px)] hover:translate-x-2 ${
                    isActive ? 'text-white' : 'text-white/20 hover:text-white/60'
                  }`}
                >
                  <span className="relative">
                    {c.city}
                    {/* the auto-advance rhythm, made visible */}
                    {isActive && !still && (
                      <span
                        key={`sweep-${active}`}
                        className="tk-city-sweep absolute -bottom-1 left-0 h-[2px] bg-white/70"
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
  )
}
