'use client'

// "INSIDE THE APP" — the phone mockup as a full scroll story (2026-08-31
// scroll-film spec). A phone holds center (position: sticky) while ~2.2 extra
// viewports of page scroll drive what happens ON ITS SCREEN:
//
//   phase 1  the real event feed scrolls — page scroll IS the app scroll
//   phase 2  an event page slides up over the feed (the top pick)
//   phase 3  the ticket slides up — QR, code, you're in
//
// Side captions hand off in sync (the posh caption mechanic). Same engine as
// PosterChapter: one rAF-throttled scroll listener, transforms/opacity only.
// Skips itself under 4 posters; reduced motion pins a still composition.
// The phone is theatre (aria-hidden, non-interactive); the captions column
// carries the real link.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { getEventPriceLabel } from '@/lib/discover/helpers'

export interface AppScrubEvent {
  id: string
  title: string
  banner_image_url: string
  city?: string
  venue_name?: string
}

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function FeedCard({ ev }: { ev: AppScrubEvent }) {
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded">
        <Image src={ev.banner_image_url} alt="" fill sizes="130px" quality={50} className="object-cover" />
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold text-white">{ev.title}</p>
      {ev.city && <p className="truncate text-[9px] text-white/50">{ev.city}</p>}
    </div>
  )
}

/** Deterministic fake-QR: a 9x9 dot matrix seeded by the event id. */
function QrBlock({ seed }: { seed: string }) {
  const cells: boolean[] = []
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = 0; i < 81; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    cells.push((h >> 16) % 5 < 2)
  }
  return (
    <div className="grid aspect-square w-28 grid-cols-9 gap-[2px] rounded-lg bg-white p-2">
      {cells.map((on, i) => (
        <span key={i} className={`rounded-[1px] ${on ? 'bg-black' : 'bg-white'}`} />
      ))}
    </div>
  )
}

export default function AppScrub({
  events,
  hero,
}: {
  /** Real events filling the in-phone feed. */
  events: AppScrubEvent[]
  /** The event the story opens and tickets (the top pick). */
  hero?: (AppScrubEvent & Record<string, any>) | null
}) {
  const { t } = useTranslation('common')
  const wrapRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [still, setStill] = useState(false)

  const posters = (events || []).filter((e) => e?.banner_image_url)
  const star = hero && hero.banner_image_url ? hero : posters[0]

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStill(true)
      setProgress(0.2)
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

  if (posters.length < 4 || !star) return null

  // Fill the feed to ten slots by cycling — repetition inside a scrolling
  // phone reads as a living feed, same license as the film strip's loop.
  const feed = Array.from({ length: 10 }, (_, i) => posters[i % posters.length])
  const p = progress

  // The screen's three phases.
  const feedY = -smooth(p, 0.02, 0.52) * 54 // % of feed track height
  const eventY = (1 - smooth(p, 0.52, 0.7)) * 105 // % — slides up over the feed
  const ticketY = (1 - smooth(p, 0.78, 0.94)) * 105

  // Captions: never two at once.
  const c1 = still ? 1 : 1 - smooth(p, 0.42, 0.52)
  const c2 = still ? 0 : smooth(p, 0.54, 0.62) * (1 - smooth(p, 0.7, 0.78))
  const c3 = still ? 0 : smooth(p, 0.8, 0.88)

  const priceLabel = getEventPriceLabel(star as any)
  const place = [star.venue_name, star.city].filter(Boolean).join(' · ')
  const code = `TKM-${String(star.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'OULADAN'}`

  const captions: { key: string; text: string; opacity: number }[] = [
    { key: 'a', text: t('home.appscrub_a', { defaultValue: 'one feed. every fèt.' }), opacity: c1 },
    { key: 'b', text: t('home.appscrub_b', { defaultValue: 'tap. peye. antre.' }), opacity: c2 },
    { key: 'c', text: t('home.appscrub_c', { defaultValue: 'ou ladan — you’re in.' }), opacity: c3 },
  ]

  return (
    <div ref={wrapRef} className="relative h-[320vh] border-y border-white/10 bg-[#0a0a0a]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          {/* Captions hold the left; each line hands off to the next. */}
          <div className="relative z-10 order-2 h-28 md:order-1 md:h-40">
            {captions.map((c) => (
              <p
                key={c.key}
                className="absolute inset-x-0 font-display lowercase italic !text-[clamp(26px,4.2vw,52px)] !leading-[1.08] text-white"
                style={{ opacity: c.opacity }}
                aria-hidden={c.opacity < 0.5}
              >
                {c.text}
              </p>
            ))}
            <div
              className="absolute inset-x-0 top-full mt-6"
              style={{ opacity: still ? 1 : Math.max(c3, 0) }}
            >
              <Link
                href="/discover"
                className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-400 transition-colors hover:text-brand-300"
              >
                {t('home.appscrub_cta', { defaultValue: 'explore events' })}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* The phone: page scroll drives the screen. */}
          <div aria-hidden className="pointer-events-none order-1 select-none md:order-2">
            <div className="mx-auto w-[250px] rounded-[42px] border border-white/10 bg-[#161616] p-2.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] sm:w-[280px]">
              <div className="relative aspect-[9/19.5] overflow-hidden rounded-[32px] bg-[#0a0a0a]">
                <div className="absolute left-1/2 top-2.5 z-30 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-[#161616]" />

                {/* phase 1 — the feed, scrolled by the page */}
                <div
                  className="px-4 pt-11"
                  style={{ transform: `translate3d(0, ${feedY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  <p className="font-display lowercase italic text-[19px] leading-none text-white/90">
                    {t('events.rail_tonight', { defaultValue: 'tonight' })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {feed.slice(0, 4).map((ev, i) => (
                      <FeedCard key={`${ev.id}-${i}`} ev={ev} />
                    ))}
                  </div>
                  <p className="mt-5 font-display lowercase italic text-[19px] leading-none text-white/90">
                    {t('events.this_week', { defaultValue: 'this week' })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {feed.slice(4, 8).map((ev, i) => (
                      <FeedCard key={`${ev.id}-w${i}`} ev={ev} />
                    ))}
                  </div>
                  <p className="mt-5 font-display lowercase italic text-[19px] leading-none text-white/90">
                    {t('events.rail_diaspora', { defaultValue: 'in the diaspora' })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 pb-8">
                    {feed.slice(8, 10).map((ev, i) => (
                      <FeedCard key={`${ev.id}-d${i}`} ev={ev} />
                    ))}
                  </div>
                </div>

                {/* phase 2 — the event page slides up */}
                <div
                  className="absolute inset-0 z-10 flex flex-col bg-[#0a0a0a] px-4 pb-4 pt-10"
                  style={{ transform: `translate3d(0, ${eventY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded">
                    <Image src={star.banner_image_url} alt="" fill sizes="250px" quality={60} className="object-cover" />
                  </div>
                  <p className="mt-3 truncate font-grotesk text-[15px] font-bold text-white">{star.title}</p>
                  {place && <p className="mt-1 truncate text-[11px] text-white/55">{place}</p>}
                  {priceLabel && (
                    <p className="mt-1 text-[11px] font-semibold text-brand-400">{priceLabel}</p>
                  )}
                  <div className="mt-auto rounded-xl bg-white py-2.5 text-center text-[12px] font-medium text-black">
                    {t('events.get_tickets', { defaultValue: 'Get tickets' })}
                  </div>
                </div>

                {/* phase 3 — the ticket */}
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center"
                  style={{ transform: `translate3d(0, ${ticketY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    {t('home.appscrub_ticket', { defaultValue: 'Your ticket' })}
                  </p>
                  <p className="mt-3 line-clamp-2 font-grotesk text-[17px] font-bold leading-tight text-white">
                    {star.title}
                  </p>
                  <div className="mt-5">
                    <QrBlock seed={String(star.id)} />
                  </div>
                  <p className="label-mono mt-4 text-[12px] text-white/70">{code}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/55">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {t('home.appscrub_valid', { defaultValue: 'valid · 1 × General' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
