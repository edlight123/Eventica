import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PosterFilmStrip from '@/components/home/PosterFilmStrip'
import HeroPosterFan from '@/components/platform/HeroPosterFan'
import Reveal from '@/components/platform/Reveal'
import {
  EventPageVignette,
  DiscoverVignette,
  DashboardVignette,
} from '@/components/platform/Vignettes'
import { getCinemaArtworkEvents } from '@/lib/data/events'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

export const metadata: Metadata = {
  title: 'Platform | Tikèm',
  description:
    'Everything you need to create, promote and sell out events across Haiti and the diaspora — built for organizers.',
}

// Reads auth cookies for the navbar context.
export const dynamic = 'force-dynamic'

/* ------------------------------------------------------------------ */
/* Editorial section: serif-lowercase heading, de-iconed bullets, the  */
/* product vignette across from the words. Everything reveals on       */
/* scroll — copy first, bullets staggered, the phone last.             */
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
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? 'lg:order-2' : ''}>
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
              {index}
            </p>
            <h2 className="mt-2 font-display lowercase italic !text-[clamp(28px,4.5vw,44px)] !leading-[1.02] text-white/90">
              {title}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">{blurb}</p>
          </Reveal>
          <div className="mt-9 space-y-6">
            {points.map((p, i) => (
              <Reveal key={p.title} delay={140 + i * 110}>
                <h3 className="font-grotesk text-[15px] font-semibold text-white">{p.title}</h3>
                <p className="mt-1 max-w-md text-[14px] leading-relaxed text-white/55">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>
          <Reveal delay={180}>{vignette}</Reveal>
        </div>
      </div>
    </section>
  )
}

export default async function PlatformPage() {
  const user = await getCurrentUser()

  // Real artwork for the film strip: recent posters already on the platform —
  // the strongest pitch to an organizer is other organizers' work, lit.
  const artwork = isDemoMode() ? (DEMO_EVENTS as any[]) : await getCinemaArtworkEvents(20)
  const posterPool = artwork
    .filter((e: any) => e?.banner_image_url)
    .slice(0, 17)
    .map((e: any) => ({
      id: String(e.id),
      title: String(e.title || ''),
      banner_image_url: String(e.banner_image_url),
    }))
  // The hero fan takes the first three posters. With a deep pool the strip
  // runs on the rest so artwork doesn't repeat in one viewport; with thin
  // inventory they share posters — a lit wall beats an empty one.
  const fanEvents = posterPool.slice(0, 3)
  const stripEvents =
    posterPool.length >= 7 ? posterPool.slice(3, 17) : posterPool.slice(0, 14)

  return (
    <div className="surface-dark min-h-screen pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* HERO — poster voice (uppercase lives here only) + one serif line,
          with real artwork fanning out across the right half. The copy
          rises in on load, line by line; the fan follows and then floats. */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:grid-cols-[1.1fr,0.9fr] lg:gap-16 lg:px-8">
        <div>
          <p
            className="plt-enter text-[11px] font-medium uppercase tracking-[0.14em] text-white/40"
            style={{ ['--d' as any]: '0s' }}
          >
            For organizers
          </p>
          <h1
            className="plt-enter mt-4 font-grotesk font-bold uppercase !leading-[1.02] tracking-tight text-white !text-[clamp(40px,7vw,88px)]"
            style={{ ['--d' as any]: '0.08s' }}
          >
            Your event.
            <br />
            Sold out.
          </h1>
          <p
            className="plt-enter mt-5 max-w-xl font-display lowercase italic !text-[clamp(19px,2.6vw,26px)] !leading-snug text-white/70"
            style={{ ['--d' as any]: '0.18s' }}
          >
            create the page, reach the crowd, get paid — in Haiti and the diaspora.
          </p>
          <div
            className="plt-enter mt-9 flex flex-wrap items-center gap-3"
            style={{ ['--d' as any]: '0.28s' }}
          >
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
        </div>
        {fanEvents.length === 3 && (
          <div className="hidden lg:block">
            <HeroPosterFan events={fanEvents} />
          </div>
        )}
      </section>

      {/* The room, lit by real organizers' posters — every one links to its
          event. This is the pitch: your artwork belongs on this wall. */}
      <PosterFilmStrip events={stripEvents} />

      {/* Value props — a quiet hairline row, not boxes */}
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { label: 'No setup fees', sub: 'Publish your first event free' },
            { label: 'HTG & USD', sub: 'Sell at home and in the diaspora' },
            { label: 'Fast payouts', sub: 'Get paid after your event' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 110}>
              <p className="font-grotesk text-[17px] font-bold text-white">{s.label}</p>
              <p className="mt-1 text-[13px] text-white/55">{s.sub}</p>
            </Reveal>
          ))}
        </div>
      </section>

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
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Reveal>
            <h2 className="font-display lowercase italic !text-[clamp(36px,6vw,72px)] !leading-[1.02] text-white">
              ready to throw your event?
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
              Set up your organizer profile and publish your first event today.
            </p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Verified organizers, trusted by attendees
            </p>
          </Reveal>
          <Reveal delay={220}>
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
          </Reveal>
        </div>
      </section>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
