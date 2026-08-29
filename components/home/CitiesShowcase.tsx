'use client'

// Act 3: the cities showcase — posh's organizer-list theatre, translated to
// the thing that actually differentiates Tikèm: the diaspora. Giant ghosted
// city names; the active one is bright while a poster collage from that city
// glows behind it. Auto-advances gently, hover takes over, and every name is
// a REAL filter (the same /?city= routing the hero chips use). Reduced motion
// gets a still list with no cycling.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

export interface CityShowcaseEntry {
  city: string
  posters: string[]
}

export default function CitiesShowcase({ cities }: { cities: CityShowcaseEntry[] }) {
  const { t } = useTranslation('common')
  const [active, setActive] = useState(0)
  const hovering = useRef(false)

  useEffect(() => {
    if (cities.length < 2) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!hovering.current) setActive((a) => (a + 1) % cities.length)
    }, 3500)
    return () => clearInterval(id)
  }, [cities.length])

  if (cities.length === 0) return null

  return (
    <section
      aria-label={t('home.cities_title', { defaultValue: 'Cities' })}
      className="relative isolate overflow-hidden border-y border-white/10 bg-[#0a0a0a]"
      onMouseEnter={() => {
        hovering.current = true
      }}
      onMouseLeave={() => {
        hovering.current = false
      }}
    >
      {/* Backdrops: one collage per city, crossfaded. The artwork is the color. */}
      <div aria-hidden className="absolute inset-0 -z-10">
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
                    <Image src={src} alt="" fill sizes="25vw" quality={45} className="object-cover" />
                  </div>
                ))}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-[#0a0a0a]/60 to-[#0a0a0a]/85" />
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8">
        <p className="font-display lowercase italic text-[clamp(17px,2vw,22px)] text-white/60">
          {t('home.cities_eyebrow', { defaultValue: 'where Haiti goes out — everywhere' })}
        </p>

        <ul className="mt-6 space-y-1">
          {cities.map((c, i) => (
            <li key={c.city}>
              <Link
                href={`/?city=${encodeURIComponent(c.city)}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`inline-block font-grotesk font-bold uppercase !leading-[1.05] tracking-[-0.02em] transition-colors duration-300 text-[clamp(30px,5.6vw,64px)] ${
                  i === active ? 'text-white' : 'text-white/20 hover:text-white/60'
                }`}
              >
                {c.city}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
