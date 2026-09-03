'use client'

// The organizer landing's three phones, animated: each one plays a living
// loop of the product instead of a still. Keyframes live in globals.css
// under the `plt-` namespace; reduced motion flattens every loop there.
//
//   01  the event page assembles itself, then sells a ticket (11s CSS clock)
//   02  the discover feed browses itself and saves an event (18s CSS clock)
//   03  the dashboard runs live — ticking revenue, orders sliding in (JS)

import { useEffect, useRef, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/* ------------------------------------------------------------------ */
/* Stage, frame, artwork                                               */
/* ------------------------------------------------------------------ */

/** The posh move: the artwork's light fills the room behind each phone, so
    the stage never reads as a small object floating in a black gap. */
function VignetteStage({ glow, children }: { glow: string; children: React.ReactNode }) {
  return (
    <div className="relative isolate">
      {/* max-w-full caps the bloom at the stage width. As a fixed 480px circle
          centred on a ~390px phone stage it reached 45px past each edge, and
          with nothing clipping it the DOCUMENT grew to 427px, the whole
          /platform page scrolled sideways. Capping rather than clipping the
          parent, because the phone frame inside casts a shadow that is meant
          to bleed; only the horizontal axis matters, so the height is left
          alone. */}
      <div
        aria-hidden
        className="plt-breathe absolute left-1/2 top-1/2 -z-10 h-[480px] w-[480px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]"
        style={{ background: glow }}
      />
      {children}
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none mx-auto w-[270px] select-none rounded-[42px] border border-white/10 bg-[#161616] p-2.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] sm:w-[290px]"
    >
      {/* True phone proportions (9:19.5); taller content crops like a real
          screenshot instead of stretching the frame. */}
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[32px] bg-white/[0.03]">
        {/* dynamic island */}
        <div className="absolute left-1/2 top-2.5 z-10 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-[#161616]" />
        {children}
      </div>
    </div>
  )
}

/** Stand-in poster artwork: the color is plural because it comes from the
    art — each fake flyer carries its own hue and radiates it (the glow). */
function MockPoster({
  from,
  to,
  glow,
  label,
  className = '',
}: {
  from: string
  to: string
  glow: string
  label?: string
  className?: string
}) {
  return (
    <div
      className={`relative flex aspect-[4/5] items-end overflow-hidden rounded p-2.5 ${className}`}
      style={{
        backgroundImage: `linear-gradient(150deg, ${from}, ${to} 70%, #000)`,
        boxShadow: `0 0 28px -4px ${glow}`,
      }}
    >
      {label && (
        <span className="font-grotesk text-[11px] font-bold uppercase leading-[1.05] tracking-tight text-white/90">
          {label}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 01 — CREATE: the page assembles, then the toast reports a sale.     */
/* ------------------------------------------------------------------ */

export function EventPageVignette() {
  const { t } = useTranslation('common')
  return (
    <VignetteStage glow="rgba(124,58,237,0.14)">
      <div className="relative isolate mx-auto w-fit">
        {/* two more flyers peek from behind the phone: a wall, not a lone screen */}
        <div className="plt-float absolute -left-16 top-14 -z-10 hidden w-[128px] -rotate-6 opacity-75 sm:block lg:-left-24" style={{ ['--dur' as any]: '8s' }}>
          <MockPoster from="#f59e0b" to="#7c2d12" glow="rgba(245,158,11,0.28)" />
        </div>
        <div className="plt-float absolute -right-14 bottom-16 -z-10 hidden w-[118px] rotate-6 opacity-75 sm:block lg:-right-20" style={{ ['--dur' as any]: '9s', ['--d' as any]: '1.2s' }}>
          <MockPoster from="#e11d48" to="#4c0519" glow="rgba(225,29,72,0.28)" />
        </div>
        <PhoneFrame>
          {/* the sale, reported the moment the loop's CTA takes its press */}
          <div className="plt-ev-toast absolute inset-x-3 top-9 z-20 flex items-center gap-2 rounded-xl bg-[#1f1f1f]/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white">
              {t('platform.vignettes.ticketSold', { defaultValue: 'Ticket sold: Nadège J.' })}
            </span>
            <span className="shrink-0 text-[10px] text-white/60">1,500 HTG</span>
          </div>

          <div className="flex h-full flex-col px-4 pb-4 pt-10">
            <div className="plt-ev-poster">
              <MockPoster
                from="#7c3aed"
                to="#312e81"
                glow="rgba(124,58,237,0.35)"
                label="Vèsen live, summer fest"
              />
            </div>
            <p className="plt-ev-title mt-3 truncate font-grotesk text-[15px] font-bold text-white">
              Vèsen Live. Summer Fest
            </p>
            <p className="plt-ev-meta mt-1 text-[11px] text-white/55">
              Sat 12 Sep · Kay Atizan, Pétion-Ville
            </p>
            <p className="plt-ev-price mt-1 text-[11px] font-semibold text-brand-400">
              {t('platform.vignettes.fromPrice', { defaultValue: 'From {{price}}', price: '1,500 HTG' })}
            </p>
            {/* the rest of the page, suggested */}
            <div className="plt-ev-lines mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-white/[0.07]" />
              <div className="h-2 w-4/5 rounded-full bg-white/[0.07]" />
              <div className="h-2 w-3/5 rounded-full bg-white/[0.07]" />
            </div>
            <div className="plt-ev-cta mt-auto rounded-xl bg-white py-2.5 text-center text-[12px] font-medium text-black">
              {t('platform.vignettes.getTickets', { defaultValue: 'Get tickets' })}
            </div>
          </div>
        </PhoneFrame>
      </div>
    </VignetteStage>
  )
}

/* ------------------------------------------------------------------ */
/* 02 — SELL: the feed browses itself through three rails.             */
/* ------------------------------------------------------------------ */

function FeedCard({
  from,
  to,
  glow,
  title,
  going,
  save = false,
}: {
  from: string
  to: string
  glow: string
  title: string
  going: string
  save?: boolean
}) {
  const { t } = useTranslation('common')
  return (
    <div>
      <div className="relative">
        <MockPoster from={from} to={to} glow={glow} />
        {save && (
          <span className="plt-feed-save absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            <Bookmark className="h-3 w-3 fill-black text-black" />
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold text-white">{title}</p>
      <p className="text-[9px] text-white/50">
        ● {t('platform.vignettes.going', { defaultValue: '{{n}} going', n: going })}
      </p>
    </div>
  )
}

export function DiscoverVignette() {
  const { t } = useTranslation('common')
  return (
    <VignetteStage glow="rgba(245,158,11,0.10)">
      <PhoneFrame>
        <div className="plt-feed-track px-4 pt-11">
          <p className="font-display lowercase italic text-[19px] leading-none text-white/90">
            {t('platform.vignettes.tonight', { defaultValue: 'tonight' })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <FeedCard from="#f59e0b" to="#7c2d12" glow="rgba(245,158,11,0.32)" title="Kanaval Kickoff" going="214" />
            <FeedCard from="#e11d48" to="#4c0519" glow="rgba(225,29,72,0.32)" title="Nuit Kompa" going="96" />
            <FeedCard from="#0ea5e9" to="#1e3a8a" glow="rgba(14,165,233,0.32)" title="Plaj Sunset" going="58" />
            <FeedCard from="#10b981" to="#064e3b" glow="rgba(16,185,129,0.32)" title="Fèt Champèt" going="143" />
          </div>
          <p className="mt-5 font-display lowercase italic text-[19px] leading-none text-white/90">
            {t('platform.vignettes.thisWeekend', { defaultValue: 'this weekend' })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <FeedCard from="#a855f7" to="#3b0764" glow="rgba(168,85,247,0.32)" title="Vibe Rooftop" going="181" save />
            <FeedCard from="#f43f5e" to="#500724" glow="rgba(244,63,94,0.32)" title="Bal Kanpe" going="67" />
            <FeedCard from="#f97316" to="#431407" glow="rgba(249,115,22,0.32)" title="Griyo Night" going="122" />
            <FeedCard from="#6366f1" to="#1e1b4b" glow="rgba(99,102,241,0.32)" title="Jazz Pòtoprens" going="49" />
          </div>
          <p className="mt-5 font-display lowercase italic text-[19px] leading-none text-white/90">
            {t('platform.vignettes.inDiaspora', { defaultValue: 'in the diaspora' })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 pb-6">
            <FeedCard from="#ec4899" to="#500724" glow="rgba(236,72,153,0.32)" title="Miami Link Up" going="238" />
            <FeedCard from="#3b82f6" to="#172554" glow="rgba(59,130,246,0.32)" title="Konpa Paris" going="164" />
          </div>
        </div>
      </PhoneFrame>
    </VignetteStage>
  )
}

/* ------------------------------------------------------------------ */
/* 03 — GET PAID: a dashboard that is actually live.                   */
/* ------------------------------------------------------------------ */

interface Order {
  id: number
  name: string
  qty: string
  amt: number
  seats: number
}

const ORDER_POOL: Omit<Order, 'id'>[] = [
  { name: 'Nadège J.', qty: '2 × VIP', amt: 7000, seats: 2 },
  { name: 'Ricardo P.', qty: '4 × General', amt: 6000, seats: 4 },
  { name: 'Fabiola M.', qty: '1 × Early bird', amt: 1200, seats: 1 },
  { name: 'Jean-Marc D.', qty: '2 × General', amt: 3000, seats: 2 },
  { name: 'Stephie L.', qty: '3 × General', amt: 4500, seats: 3 },
  { name: 'Woodley A.', qty: '1 × VIP', amt: 3500, seats: 1 },
  { name: 'Mirlande C.', qty: '2 × Early bird', amt: 2400, seats: 2 },
  { name: 'Kervens B.', qty: '2 × General', amt: 3000, seats: 2 },
]

const BARS = [22, 34, 28, 46, 60, 52, 78, 92]

export function DashboardVignette() {
  const { t } = useTranslation('common')
  // Deterministic initial state (SSR-safe); the live ticks start client-side.
  const [orders, setOrders] = useState<Order[]>(
    ORDER_POOL.slice(0, 4).map((o, i) => ({ ...o, id: i }))
  )
  const [revenue, setRevenue] = useState(482_500)
  const [sold, setSold] = useState(1_240)
  const [checked, setChecked] = useState(312)
  const nextRef = useRef(4)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const tick = setInterval(() => {
      const i = nextRef.current
      const next = ORDER_POOL[i % ORDER_POOL.length]
      nextRef.current = i + 1
      setOrders((prev) => [{ ...next, id: i }, ...prev].slice(0, 4))
      setRevenue((r) => r + next.amt)
      setSold((s) => s + next.seats)
      if (i % 2 === 0) setChecked((c) => Math.min(400, c + 3))
    }, 2600)
    return () => clearInterval(tick)
  }, [])

  return (
    <VignetteStage glow="rgba(124,58,237,0.12)">
      <PhoneFrame>
        <div className="h-full px-5 pt-11">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            <span className="plt-live-dot h-1.5 w-1.5 rounded-full bg-brand-400" />
            {t('platform.vignettes.liveTonight', { defaultValue: 'Live · tonight' })}
          </p>
          <p className="mt-2.5 font-grotesk text-[30px] font-bold leading-none tracking-tight text-white">
            <span key={revenue} className="plt-tick">
              {revenue.toLocaleString('en-US')}
            </span>{' '}
            <span className="text-[15px] font-semibold text-white/55">HTG</span>
          </p>
          <p className="mt-1.5 text-[11px] text-white/55">
            {t('platform.vignettes.ticketsSold', {
              defaultValue: '{{n}} tickets sold',
              n: sold.toLocaleString('en-US'),
            })}
          </p>
          <div className="mt-4 flex h-[52px] items-end gap-1.5">
            {BARS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${
                  i === BARS.length - 1 ? 'plt-bar plt-bar-live bg-brand-400' : 'plt-bar bg-white/15'
                }`}
                style={{ height: `${h}%`, ['--d' as any]: `${i * 70}ms` }}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3.5">
            <p className="flex items-center justify-between text-[11px]">
              <span className="text-white/55">{t('platform.vignettes.checkedIn', { defaultValue: 'Checked in' })}</span>
              <span className="font-semibold text-white">
                <span key={checked} className="plt-tick">
                  {checked}
                </span>{' '}
                / 400
              </span>
            </p>
            <p className="flex items-center justify-between text-[11px]">
              <span className="text-white/55">{t('platform.vignettes.payout', { defaultValue: 'Payout' })}</span>
              <span className="flex items-center gap-1.5 font-medium text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t('platform.vignettes.availableAfterEvent', { defaultValue: 'Available after event' })}
              </span>
            </p>
          </div>
          {/* orders roll in live, newest first */}
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            {t('platform.vignettes.recentOrders', { defaultValue: 'Recent orders' })}
          </p>
          <div className="mt-2.5 space-y-2.5">
            {orders.map((o, i) => (
              <p
                key={o.id}
                className={`flex items-center justify-between rounded-md text-[11px] ${
                  i === 0 ? 'plt-order-in' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-white">{o.name}</span>
                  <span className="text-[10px] text-white/45">{o.qty}</span>
                </span>
                <span className="shrink-0 font-semibold text-white/80">
                  {o.amt.toLocaleString('en-US')} HTG
                </span>
              </p>
            ))}
          </div>
        </div>
      </PhoneFrame>
    </VignetteStage>
  )
}
