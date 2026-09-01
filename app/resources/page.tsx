import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import OrganizerScrub from '@/components/resources/OrganizerScrub'
import { Reveal, FloatingGuides, Marquee, OuPare } from '@/components/resources/ResourcesFx'
import {
  ArrowRight,
  ArrowUpRight,
  Rocket,
  Ticket,
  Palette,
  Tag,
  Wallet,
  ScanLine,
  QrCode,
  FileText,
  HelpCircle,
  Download,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Guides & Resources | Tikèm',
  description:
    'Step-by-step guides for organizers and attendees — creating events, posters, pricing, payouts, the door, and buying tickets. Read online or download the PDF.',
}

// Reads auth cookies for the navbar context.
export const dynamic = 'force-dynamic'

type Lang = { code: string; label: string; view: string; pdf?: string }
type Guide = {
  slug: string
  icon: any
  title: string
  body: string
  langs: Lang[]
}

// Files are served from Firebase Storage under /guides/* via a Next rewrite
// (see next.config.js), so these stay on the tikem.co domain.
function langs(slug: string, codes: Array<'en' | 'fr' | 'ht'>, opts: { pdf?: boolean } = { pdf: true }): Lang[] {
  const label: Record<string, string> = { en: 'English', fr: 'Français', ht: 'Kreyòl' }
  return codes.map((c) => ({
    code: c.toUpperCase(),
    label: label[c],
    view: `/guides/${slug}-${c}.html`,
    ...(opts.pdf !== false ? { pdf: `/guides/${slug}-${c}.pdf` } : {}),
  }))
}

const ORGANIZER_GUIDES: Guide[] = [
  {
    slug: 'organizer-program',
    icon: Rocket,
    title: 'The Organizer Program',
    body: 'Start here. What Tikèm is, and why organizers sell out with it.',
    langs: langs('organizer-program', ['en', 'fr', 'ht']),
  },
  {
    slug: 'create-event',
    icon: Ticket,
    title: 'Create Your First Event',
    body: 'The five-step flow: basics, location, schedule, tickets, publish.',
    langs: langs('create-event', ['en', 'fr']),
  },
  {
    slug: 'poster-guide',
    icon: Palette,
    title: 'Poster & Brand Guide',
    body: 'How to make a scroll-stopping poster — art, not a flyer.',
    langs: langs('poster-guide', ['en', 'fr']),
  },
  {
    slug: 'pricing-playbook',
    icon: Tag,
    title: 'Pricing & Promo Playbook',
    body: 'Tier ladders, the early-bird curve, and promo codes that work.',
    langs: langs('pricing-playbook', ['en', 'fr']),
  },
  {
    slug: 'getting-paid',
    icon: Wallet,
    title: 'Getting Paid & Payouts',
    body: 'Sell first, verify once, cash out via MonCash or bank.',
    langs: langs('getting-paid', ['en', 'fr']),
  },
  {
    slug: 'team-door',
    icon: ScanLine,
    title: 'Your Team & Your Door',
    body: 'Invite staff, set access, and scan tickets at the door.',
    langs: langs('team-door', ['en', 'fr']),
  },
]

const ATTENDEE_GUIDES: Guide[] = [
  {
    slug: 'ticket-guide',
    icon: QrCode,
    title: 'Your Ticket Guide',
    body: 'Find an event, pay with MonCash, and show your QR at the door.',
    langs: langs('ticket-guide', ['en', 'fr']),
  },
]

const ABOUT_GUIDES: Guide[] = [
  {
    slug: 'one-pager',
    icon: FileText,
    title: 'Tikèm One-Pager',
    body: 'The events platform for Haiti — problem, product, and model.',
    langs: langs('one-pager', ['en', 'fr'], { pdf: false }),
  },
  {
    slug: 'faq',
    icon: HelpCircle,
    title: 'Help & FAQ',
    body: 'The questions organizers and attendees ask most, answered.',
    langs: langs('faq', ['en', 'fr'], { pdf: false }),
  },
]

/* ------------------------------------------------------------------ */
/* The library: guides as an editorial reading room, not a card wall   */
/* ------------------------------------------------------------------ */

function GuideRow({ guide, index }: { guide: Guide; index: string }) {
  const Icon = guide.icon
  const primary = guide.langs[0]
  return (
    <div className="group relative border-t border-white/10 transition-colors duration-300 hover:bg-white/[0.02]">
      <div className="grid grid-cols-1 gap-4 py-7 sm:grid-cols-[64px_1fr_auto] sm:items-baseline sm:gap-8 sm:py-9">
        {/* index + icon */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-4">
          <span className="label-mono text-[12px] text-white/35">{index}</span>
          <Icon className="h-4 w-4 text-brand-400/80" strokeWidth={1.75} />
        </div>

        {/* the read — the whole title is the link */}
        <div className="min-w-0">
          <a
            href={primary.view}
            target="_blank"
            rel="noopener noreferrer"
            className="group/title inline-flex items-baseline gap-3"
          >
            <span className="font-display lowercase italic text-[clamp(26px,3.4vw,42px)] leading-[1.05] text-white/85 transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-white">
              {guide.title.toLowerCase()}
            </span>
            <ArrowUpRight className="h-[0.55em] w-[0.55em] shrink-0 translate-y-1 self-center text-white/0 transition-all duration-300 group-hover:text-brand-400" />
          </a>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/50">{guide.body}</p>
        </div>

        {/* the languages */}
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {guide.langs.map((l) => (
            <span key={l.code} className="flex items-center overflow-hidden rounded-full border border-white/10">
              <a
                href={l.view}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 font-mono text-[11px] tracking-wider text-white/70 transition-colors hover:bg-white/5 hover:text-brand-300"
              >
                {l.code}
              </a>
              {l.pdf && (
                <a
                  href={l.pdf}
                  download
                  className="border-l border-white/10 px-2.5 py-1.5 text-white/45 transition-colors hover:bg-white/5 hover:text-brand-300"
                  aria-label={`Download ${guide.title} (${l.label}) as PDF`}
                >
                  <Download className="h-3 w-3" />
                </a>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Chapter({
  index,
  kicker,
  title,
  blurb,
  guides,
  startAt,
}: {
  index: string
  kicker: string
  title: string
  blurb: string
  guides: Guide[]
  startAt: number
}) {
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
      {/* the chapter's ghost numeral */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-4 right-2 font-grotesk text-[clamp(120px,22vw,280px)] font-bold leading-none tracking-[-0.04em] text-white/[0.03] sm:right-6"
      >
        {index}
      </span>
      <Reveal>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-brand-400">
              {index} &nbsp; {kicker}
            </p>
            <h2 className="mt-3 font-grotesk text-[clamp(30px,5vw,54px)] font-bold uppercase leading-[0.95] tracking-[-0.02em] text-white">
              {title}
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-white/50">{blurb}</p>
        </div>
      </Reveal>
      <div className="border-b border-white/10">
        {guides.map((g, i) => (
          <Reveal key={g.slug} delay={i * 70}>
            <GuideRow guide={g} index={String(startAt + i).padStart(2, '0')} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default async function ResourcesPage() {
  const user = await getCurrentUser()

  return (
    <div className="surface-dark min-h-screen pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

      {/* ACT 0 — the statement. This is a playbook, not a help center.
          The guides themselves float around it, like the homepage's posters. */}
      <section className="relative overflow-hidden bg-[#0a0a0a]">
        <FloatingGuides />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-32 lg:px-8">
          <p
            className="plt-enter font-display lowercase italic !text-[17px] !leading-none text-white/60"
            style={{ ['--d' as any]: '0s' }}
          >
            guides &amp; resources
          </p>
          <h1
            className="plt-enter mt-5 font-grotesk font-bold uppercase tracking-[-0.02em] text-white !leading-[0.95] !text-[clamp(52px,10vw,140px)]"
            style={{ ['--d' as any]: '0.08s' }}
          >
            Sell<br />out.
          </h1>
          <p
            className="plt-enter mt-6 max-w-xl font-display lowercase italic !text-[clamp(18px,2.4vw,24px)] !leading-snug text-white/70"
            style={{ ['--d' as any]: '0.18s' }}
          >
            the full playbook for running events on Tikèm — read it online, keep the PDF. an anglè, en
            français, an kreyòl.
          </p>
        </div>
        {/* scroll cue — a breathing hairline */}
        <div
          aria-hidden
          className="plt-breathe absolute bottom-5 left-1/2 hidden h-12 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-white/40 lg:block"
        />
      </section>

      {/* ACT 1 — the console, as a scroll film. */}
      <OrganizerScrub />

      {/* the organizer's verb chain, in motion */}
      <Marquee />

      {/* ACT 2 — the library. */}
      <Chapter
        index="01"
        kicker="For organizers"
        title="Run the room"
        blurb="From your first event to selling out and getting paid — six reads, in order."
        guides={ORGANIZER_GUIDES}
        startAt={1}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      <Chapter
        index="02"
        kicker="For attendees"
        title="Get in"
        blurb="Find the fèt, pay the way you already do, and walk in with your phone."
        guides={ATTENDEE_GUIDES}
        startAt={7}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      <Chapter
        index="03"
        kicker="About Tikèm"
        title="The bigger picture"
        blurb="What we're building, and the answers to the most common questions."
        guides={ABOUT_GUIDES}
        startAt={8}
      />

      {/* ACT 3 — the outro. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/[0.07] blur-[120px]"
        />
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <OuPare />
          <Reveal delay={200}>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
              You&apos;ve read the playbook. Your first event takes about five minutes.
            </p>
          </Reveal>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/85 transition-all duration-200 hover:border-white/30 hover:bg-white/5"
            >
              Get support
            </Link>
          </div>
        </div>
      </section>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
