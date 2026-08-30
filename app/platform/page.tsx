import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'

export const metadata: Metadata = {
  title: 'Platform | Tikèm',
  description:
    'Everything you need to create, promote and sell out events across Haiti and the diaspora — built for organizers.',
}

// Reads auth cookies for the navbar context.
export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* Device frame + product vignettes (the product shows itself — no     */
/* feature-icon prose). Pure markup, decorative: hidden from AT.       */
/* ------------------------------------------------------------------ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none mx-auto w-[270px] select-none rounded-[42px] border border-white/10 bg-[#161616] p-2.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] sm:w-[290px]"
    >
      {/* True phone proportions (9:19.5); taller content crops like a real
          screenshot instead of stretching the frame. */}
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[32px] bg-[#0a0a0a]">
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

/** 01 — the event page an organizer publishes. */
function EventPageVignette() {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col px-4 pb-4 pt-10">
        <MockPoster
          from="#7c3aed"
          to="#312e81"
          glow="rgba(124,58,237,0.35)"
          label="Vèsen live — summer fest"
        />
        <p className="mt-3 truncate font-grotesk text-[15px] font-bold text-white">
          Vèsen Live — Summer Fest
        </p>
        <p className="mt-1 text-[11px] text-white/55">Sat 12 Sep · Kay Atizan, Pétion-Ville</p>
        <p className="mt-1 text-[11px] font-semibold text-brand-400">From 1,500 HTG</p>
        {/* the rest of the page, suggested */}
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-white/[0.07]" />
          <div className="h-2 w-4/5 rounded-full bg-white/[0.07]" />
          <div className="h-2 w-3/5 rounded-full bg-white/[0.07]" />
        </div>
        <div className="mt-auto rounded-xl bg-white py-2.5 text-center text-[12px] font-medium text-black">
          Get tickets
        </div>
      </div>
    </PhoneFrame>
  )
}

/** 02 — the discover feed the event lands in: a wall of lit posters. */
function DiscoverVignette() {
  return (
    <PhoneFrame>
      <div className="h-full px-4 pt-11">
        <p className="font-display lowercase italic text-[19px] leading-none text-white/90">
          tonight
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <MockPoster from="#f59e0b" to="#7c2d12" glow="rgba(245,158,11,0.32)" />
            <p className="mt-1.5 truncate text-[10px] font-semibold text-white">Kanaval Kickoff</p>
            <p className="text-[9px] text-white/50">● 214 going</p>
          </div>
          <div>
            <MockPoster from="#e11d48" to="#4c0519" glow="rgba(225,29,72,0.32)" />
            <p className="mt-1.5 truncate text-[10px] font-semibold text-white">Nuit Kompa</p>
            <p className="text-[9px] text-white/50">● 96 going</p>
          </div>
          <div>
            <MockPoster from="#0ea5e9" to="#1e3a8a" glow="rgba(14,165,233,0.32)" />
            <p className="mt-1.5 truncate text-[10px] font-semibold text-white">Plaj Sunset</p>
            <p className="text-[9px] text-white/50">● 58 going</p>
          </div>
          <div>
            <MockPoster from="#10b981" to="#064e3b" glow="rgba(16,185,129,0.32)" />
            <p className="mt-1.5 truncate text-[10px] font-semibold text-white">Fèt Champèt</p>
            <p className="text-[9px] text-white/50">● 143 going</p>
          </div>
        </div>
        {/* the feed keeps going — cropped by the frame like a real screen */}
        <p className="mt-5 font-display lowercase italic text-[19px] leading-none text-white/90">
          this weekend
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <MockPoster from="#a855f7" to="#3b0764" glow="rgba(168,85,247,0.32)" />
          <MockPoster from="#f43f5e" to="#500724" glow="rgba(244,63,94,0.32)" />
        </div>
      </div>
    </PhoneFrame>
  )
}

/** 03 — the live dashboard on the night. */
function DashboardVignette() {
  // A quiet hour-by-hour sales silhouette; the last bar is teal (live now).
  const bars = [22, 34, 28, 46, 60, 52, 78, 92]
  return (
    <PhoneFrame>
      <div className="h-full px-5 pt-11">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Live · tonight
        </p>
        <p className="mt-2.5 font-grotesk text-[30px] font-bold leading-none tracking-tight text-white">
          482,500 <span className="text-[15px] font-semibold text-white/55">HTG</span>
        </p>
        <p className="mt-1.5 text-[11px] text-white/55">1,240 tickets sold</p>
        <div className="mt-4 flex h-[52px] items-end gap-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i === bars.length - 1 ? 'bg-brand-400' : 'bg-white/15'}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="mt-4 space-y-2.5 border-t border-white/10 pt-3.5">
          <p className="flex items-center justify-between text-[11px]">
            <span className="text-white/55">Checked in</span>
            <span className="font-semibold text-white">312 / 400</span>
          </p>
          <p className="flex items-center justify-between text-[11px]">
            <span className="text-white/55">Payout</span>
            <span className="flex items-center gap-1.5 font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Available after event
            </span>
          </p>
        </div>
        {/* recent orders, rolling in — cropped by the frame */}
        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
          Recent orders
        </p>
        <div className="mt-2.5 space-y-2.5">
          {[
            ['Nadège J.', '2 × VIP', '7,000 HTG'],
            ['Ricardo P.', '4 × General', '6,000 HTG'],
            ['Fabiola M.', '1 × Early bird', '1,200 HTG'],
            ['Jean-Marc D.', '2 × General', '3,000 HTG'],
          ].map(([name, qty, amt]) => (
            <p key={name as string} className="flex items-center justify-between text-[11px]">
              <span className="min-w-0">
                <span className="block truncate font-medium text-white">{name}</span>
                <span className="text-[10px] text-white/45">{qty}</span>
              </span>
              <span className="shrink-0 font-semibold text-white/80">{amt}</span>
            </p>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Editorial section: serif-lowercase heading, de-iconed bullets, the  */
/* product vignette across from the words.                             */
/* ------------------------------------------------------------------ */

function Section({
  index,
  title,
  blurb,
  points,
  vignette,
  flip = false,
}: {
  index: string
  title: string
  blurb: string
  points: { title: string; body: string }[]
  vignette: React.ReactNode
  flip?: boolean
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={flip ? 'lg:order-2' : ''}>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
            {index}
          </p>
          <h2 className="mt-2 font-display lowercase italic !text-[clamp(28px,4.5vw,44px)] !leading-[1.02] text-white/90">
            {title}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{blurb}</p>
          <div className="mt-9 space-y-6">
            {points.map((p) => (
              <div key={p.title}>
                <h3 className="font-grotesk text-[15px] font-semibold text-white">{p.title}</h3>
                <p className="mt-1 max-w-md text-[14px] leading-relaxed text-white/55">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>{vignette}</div>
      </div>
    </section>
  )
}

export default async function PlatformPage() {
  const user = await getCurrentUser()

  return (
    <div className="surface-dark min-h-screen pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* HERO — poster voice (uppercase lives here only) + one serif line */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          For organizers
        </p>
        <h1 className="mt-4 font-grotesk font-bold uppercase !leading-[1.02] tracking-tight text-white !text-[clamp(40px,8vw,96px)]">
          Your event.
          <br />
          Sold out.
        </h1>
        <p className="mt-5 max-w-xl font-display lowercase italic !text-[clamp(19px,2.6vw,26px)] !leading-snug text-white/70">
          create the page, reach the crowd, get paid — in Haiti and the diaspora.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/auth/signup"
            className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
          >
            Start organizing
          </Link>
          <Link
            href="/organizer"
            className="inline-flex items-center rounded-xl border border-white/12 px-6 py-3 text-sm font-normal text-white/80 transition-colors duration-200 hover:border-white/25 hover:text-white"
          >
            Organizer dashboard
          </Link>
        </div>

        {/* Value props — a quiet hairline row, not boxes */}
        <div className="mt-16 grid max-w-3xl grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
          {[
            { label: 'No setup fees', sub: 'Publish your first event free' },
            { label: 'HTG & USD', sub: 'Sell at home and in the diaspora' },
            { label: 'Fast payouts', sub: 'Get paid after your event' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-grotesk text-[17px] font-bold text-white">{s.label}</p>
              <p className="mt-1 text-[13px] text-white/55">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      {/* 01 — CREATE */}
      <Section
        index="01 — Create"
        title="a page worthy of the poster"
        blurb="Build a beautiful event page in minutes. Upload the artwork and Tikèm lets it shine — your event, your look."
        points={[
          {
            title: 'Flexible tickets',
            body: 'Free RSVPs, paid tiers, early-bird and VIP — price it however the night calls for.',
          },
          {
            title: 'Built for the culture',
            body: 'Concerts, fêtes, conferences, watch parties — tikèm fits how Haiti goes out.',
          },
          {
            title: 'Live in minutes',
            body: 'No setup fees, no waiting. Publish tonight and start selling tonight.',
          },
        ]}
        vignette={<EventPageVignette />}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      {/* 02 — SELL */}
      <Section
        index="02 — Sell"
        title="reach your people"
        blurb="Your event lands on the home feed and in Discover, next to the nights everyone is already watching."
        points={[
          {
            title: 'Home & diaspora',
            body: 'Get discovered by attendees in Haiti and Haitians abroad — Miami, New York, Montréal, Paris — in one place.',
          },
          {
            title: 'Made for mobile',
            body: 'Most people buy on their phone. tikèm is fast and clean on every screen.',
          },
          {
            title: 'Social proof',
            body: 'Friends-going and attendee counts help fence-sitters commit and buy.',
          },
        ]}
        vignette={<DiscoverVignette />}
        flip
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      {/* 03 — GET PAID */}
      <Section
        index="03 — Get paid"
        title="money in your account"
        blurb="Sell tickets, scan guests at the door and track every gourde live — then cash out with confidence."
        points={[
          {
            title: 'Collect payments',
            body: 'Take card and local payments for your tickets, with fees that make sense.',
          },
          {
            title: 'Clear payouts',
            body: 'See exactly what you’ve earned and request a payout after the event settles.',
          },
          {
            title: 'Live dashboard',
            body: 'Track sales, check-ins and your best channels in real time as the night unfolds.',
          },
        ]}
        vignette={<DashboardVignette />}
      />

      {/* SIGN-OFF — de-boxed, the editorial close */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8">
          <h2 className="font-display lowercase italic !text-[clamp(36px,6vw,72px)] !leading-[1.02] text-white">
            ready to throw your event?
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
            Set up your organizer profile and publish your first event today.
          </p>
          <p className="mt-3 flex items-center gap-2 text-[13px] text-white/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Verified organizers, trusted by attendees
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition-colors duration-200 hover:bg-white/90"
            >
              Start organizing
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center rounded-xl border border-white/12 px-6 py-3 text-sm font-normal text-white/80 transition-colors duration-200 hover:border-white/25 hover:text-white"
            >
              Explore events
            </Link>
          </div>
        </div>
      </section>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
