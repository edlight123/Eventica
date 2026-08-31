'use client'

// "INSIDE THE APP" — the phone mockup as a full scroll story (2026-08-31
// scroll-film spec, v2 faithful to the real mobile app): status bar, the
// tikèm wordmark bar with the location chip, the search pill, category
// chips, the fixed tab bar with the white + FAB (Home · Discover · + ·
// Tickets · Profile — the attendee tabs from mobile/navigation), and real
// screens for each phase:
//
//   phase 1  the home feed scrolls — page scroll IS the app scroll
//   phase 2  the event screen pushes in over it (the top pick)
//   phase 3  the ticket: white card, QR, perforation — you're in
//
// Same engine as PosterChapter: one rAF-throttled scroll listener,
// transforms/opacity only. Skips itself under 4 posters; reduced motion pins
// a still composition. The phone is theatre (aria-hidden, non-interactive);
// the captions column carries the real link.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Wifi,
  Search,
  Home,
  Compass,
  Plus,
  Ticket,
  User,
  ChevronLeft,
  Share,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { getEventPriceLabel } from '@/lib/discover/helpers'

export interface AppScrubEvent {
  id: string
  title: string
  banner_image_url: string
  city?: string
  venue_name?: string
  [key: string]: any
}

const smooth = (p: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/* ------------------------------------------------------------------ */
/* Pieces of the real app                                              */
/* ------------------------------------------------------------------ */

function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-[#0a0a0a] from-40% via-[#0a0a0a]/85 to-transparent px-6 pb-4 pt-3">
      <span className="w-10 text-[11px] font-semibold tracking-tight text-white">9:41</span>
      <span className="h-[18px] w-[76px] rounded-full bg-black" />
      <span className="flex w-10 items-center justify-end gap-1">
        {/* signal bars */}
        <span className="flex items-end gap-[1.5px]" aria-hidden>
          <span className="h-[4px] w-[2.5px] rounded-[1px] bg-white" />
          <span className="h-[6px] w-[2.5px] rounded-[1px] bg-white" />
          <span className="h-[8px] w-[2.5px] rounded-[1px] bg-white" />
          <span className="h-[10px] w-[2.5px] rounded-[1px] bg-white/40" />
        </span>
        <Wifi className="h-[11px] w-[11px] text-white" strokeWidth={2.5} />
        {/* battery */}
        <span className="relative h-[10px] w-[18px] rounded-[3px] border border-white/50" aria-hidden>
          <span className="absolute inset-[1.5px] right-[4px] rounded-[1px] bg-white" />
          <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r-full bg-white/50" />
        </span>
      </span>
    </div>
  )
}

function Wordmark() {
  return (
    <span className="font-display italic text-[19px] leading-none text-white">
      tik<span className="not-italic text-brand-400">è</span>m
    </span>
  )
}

function TabBar() {
  const items = [
    { icon: Home, label: 'Home', active: true },
    { icon: Compass, label: 'Discover', active: false },
    null, // the white + FAB
    { icon: Ticket, label: 'Tickets', active: false },
    { icon: User, label: 'Profile', active: false },
  ] as const
  return (
    <div className="absolute inset-x-0 bottom-0 z-[5] bg-[#0a0a0a]/95 pb-4 pt-2 backdrop-blur-md">
      <div className="flex items-center justify-around px-3">
        {items.map((it, i) =>
          it === null ? (
            <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-white">
              <Plus className="h-[18px] w-[18px] text-black" strokeWidth={2.5} />
            </span>
          ) : (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <it.icon
                className={`h-[18px] w-[18px] ${it.active ? 'text-white' : 'text-white/35'}`}
                strokeWidth={it.active ? 2.2 : 1.8}
              />
              <span className={`text-[8px] font-medium ${it.active ? 'text-white' : 'text-white/35'}`}>
                {it.label}
              </span>
            </span>
          )
        )}
      </div>
      {/* home indicator */}
      <span className="absolute bottom-1.5 left-1/2 h-[4px] w-[86px] -translate-x-1/2 rounded-full bg-white/30" />
    </div>
  )
}

function FeedCard({ ev }: { ev: AppScrubEvent }) {
  const price = getEventPriceLabel(ev as any)
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded">
        <Image src={ev.banner_image_url} alt="" fill sizes="130px" quality={50} className="object-cover" />
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold text-white">{ev.title}</p>
      {ev.city && <p className="truncate text-[9px] text-white/50">{ev.city}</p>}
      {price && <p className="truncate text-[9px] font-semibold text-brand-400">{price}</p>}
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
    <div className="grid aspect-square w-28 grid-cols-9 gap-[2px]">
      {cells.map((on, i) => (
        <span key={i} className={`rounded-[1px] ${on ? 'bg-black' : 'bg-transparent'}`} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

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

  const feed = Array.from({ length: 10 }, (_, i) => posters[i % posters.length])
  const p = progress

  const feedY = -smooth(p, 0.02, 0.52) * 54 // % of feed track height
  const eventY = (1 - smooth(p, 0.52, 0.7)) * 105
  const ticketY = (1 - smooth(p, 0.78, 0.94)) * 105

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
    <div ref={wrapRef} className="relative h-[320vh] bg-[#0a0a0a]">
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
                <StatusBar />

                {/* ---------- phase 1: the home feed ---------- */}
                <div
                  className="px-4 pt-12"
                  style={{ transform: `translate3d(0, ${feedY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  {/* wordmark bar + location chip — the real home top bar */}
                  <div className="flex items-center justify-between">
                    <Wordmark />
                    <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1 text-[9px] font-medium text-white/70">
                      <MapPin className="h-[9px] w-[9px]" />
                      Port-au-Prince
                      <ChevronDown className="h-[9px] w-[9px] text-white/40" />
                    </span>
                  </div>

                  {/* search pill */}
                  <div className="mt-3 flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-2">
                    <Search className="h-[11px] w-[11px] text-white/40" />
                    <span className="text-[10px] text-white/40">Search events, organizers…</span>
                  </div>

                  {/* category chips */}
                  <div className="mt-3 flex gap-1.5">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-black">All</span>
                    {['mizik', 'fèt', 'espò', 'kilti'].map((c) => (
                      <span key={c} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] text-white/60">
                        {c}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 font-display lowercase italic text-[17px] leading-none text-white/90">
                    {t('events.rail_tonight', { defaultValue: 'tonight' })}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    {feed.slice(0, 4).map((ev, i) => (
                      <FeedCard key={`${ev.id}-${i}`} ev={ev} />
                    ))}
                  </div>
                  <p className="mt-4 font-display lowercase italic text-[17px] leading-none text-white/90">
                    {t('events.this_week', { defaultValue: 'this week' })}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    {feed.slice(4, 8).map((ev, i) => (
                      <FeedCard key={`${ev.id}-w${i}`} ev={ev} />
                    ))}
                  </div>
                  <p className="mt-4 font-display lowercase italic text-[17px] leading-none text-white/90">
                    {t('events.rail_diaspora', { defaultValue: 'in the diaspora' })}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 pb-20">
                    {feed.slice(8, 10).map((ev, i) => (
                      <FeedCard key={`${ev.id}-d${i}`} ev={ev} />
                    ))}
                  </div>
                </div>

                {/* the tab bar stays fixed while the feed scrolls — like the app */}
                <TabBar />

                {/* ---------- phase 2: the event screen pushes in ---------- */}
                <div
                  className="absolute inset-0 z-10 flex flex-col bg-[#0a0a0a]"
                  style={{ transform: `translate3d(0, ${eventY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden">
                    <Image src={star.banner_image_url} alt="" fill sizes="280px" quality={60} className="object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
                    {/* push-screen chrome over the poster */}
                    <span className="absolute left-3 top-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 backdrop-blur-md">
                      <ChevronLeft className="h-4 w-4 text-white" />
                    </span>
                    <span className="absolute right-3 top-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 backdrop-blur-md">
                      <Share className="h-3.5 w-3.5 text-white" />
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col px-4 pb-5">
                    <p className="line-clamp-2 font-grotesk text-[16px] font-bold leading-tight text-white">
                      {star.title}
                    </p>
                    {place && <p className="mt-1 truncate text-[11px] text-white/55">{place}</p>}
                    {priceLabel && (
                      <p className="mt-1 text-[11px] font-semibold text-brand-400">{priceLabel}</p>
                    )}
                    <div className="mt-3 space-y-1.5">
                      <span className="block h-1.5 w-full rounded-full bg-white/[0.07]" />
                      <span className="block h-1.5 w-4/5 rounded-full bg-white/[0.07]" />
                    </div>
                    <div className="mt-auto rounded-xl bg-white py-2.5 text-center text-[12px] font-medium text-black">
                      {t('events.get_tickets', { defaultValue: 'Get tickets' })}
                    </div>
                  </div>
                </div>

                {/* ---------- phase 3: the ticket ---------- */}
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a0a] px-5"
                  style={{ transform: `translate3d(0, ${ticketY}%, 0)`, willChange: still ? undefined : 'transform' }}
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    {t('home.appscrub_ticket', { defaultValue: 'Your ticket' })}
                  </p>

                  {/* the white ticket card, perforation and all */}
                  <div className="relative mt-4 w-full max-w-[210px] rounded-2xl bg-white px-5 pb-4 pt-5 text-center">
                    <p className="line-clamp-1 font-grotesk text-[13px] font-bold text-black">{star.title}</p>
                    {place && <p className="mt-0.5 truncate text-[9px] text-black/50">{place}</p>}
                    <div className="mt-3 flex justify-center">
                      <QrBlock seed={String(star.id)} />
                    </div>
                    {/* perforation */}
                    <div className="relative mt-4">
                      <span className="absolute -left-[26px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#0a0a0a]" />
                      <span className="absolute -right-[26px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#0a0a0a]" />
                      <span className="block border-t-2 border-dashed border-black/15" />
                    </div>
                    <p className="label-mono mt-3 text-[11px] text-black/80">{code}</p>
                    <p className="mt-0.5 text-[9px] text-black/45">1 × General</p>
                  </div>

                  <p className="mt-4 flex items-center gap-1.5 text-[11px] text-white/55">
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
