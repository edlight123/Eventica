import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import {
  ArrowRight,
  Rocket,
  Ticket,
  Palette,
  Tag,
  Wallet,
  ScanLine,
  QrCode,
  FileText,
  HelpCircle,
  ExternalLink,
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
// (see next.config.js), so these stay on the tikem.app domain.
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

function GuideCard({ guide }: { guide: Guide }) {
  const Icon = guide.icon
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] p-6 transition-all hover:border-brand-300/60 hover:shadow-card-hover">
      <Icon className="h-7 w-7 text-brand-300" strokeWidth={1.75} />
      <h3 className="mt-4 font-grotesk text-lg font-semibold text-white">{guide.title}</h3>
      <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-white/55">{guide.body}</p>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4">
        {guide.langs.map((l) => (
          <div key={l.code} className="flex items-center justify-between gap-3">
            <a
              href={l.view}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-sm font-medium text-white/85 transition-colors hover:text-brand-300"
            >
              <span className="font-mono text-[11px] tracking-wider text-brand-400">{l.code}</span>
              <span>{l.label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-white/35 transition-colors group-hover:text-brand-300" />
            </a>
            {l.pdf && (
              <a
                href={l.pdf}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:border-brand-300/60 hover:text-brand-300"
                aria-label={`Download ${guide.title} (${l.label}) as PDF`}
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Group({
  index,
  kicker,
  title,
  blurb,
  guides,
}: {
  index: string
  kicker: string
  title: string
  blurb: string
  guides: Guide[]
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-9 max-w-2xl">
        <p className="eyebrow text-brand-400">
          {index} &nbsp; {kicker}
        </p>
        <h2 className="mt-3 font-display text-[clamp(28px,4.5vw,44px)] leading-[1.0] text-white">{title}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/55 sm:text-lg">{blurb}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <GuideCard key={g.slug} guide={g} />
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[#0a0a0a]" />
        <div
          aria-hidden
          className="absolute left-1/2 top-[-30%] -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[150px]"
        />
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-20 text-center sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
          <p className="eyebrow text-brand-400">Resources</p>
          <h1 className="mx-auto mt-4 max-w-[18ch] text-balance font-display text-[clamp(40px,7vw,72px)] leading-[0.96] text-white">
            Guides to help you <span className="italic text-brand-400">sell out</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/60 sm:text-lg">
            Everything you need to run great events on Tikèm — read online, or download the PDF.
            Available in English, Français, and Kreyòl.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

      <Group
        index="01"
        kicker="For organizers"
        title="Run your events like a pro"
        blurb="From your first event to selling out and getting paid — the full playbook."
        guides={ORGANIZER_GUIDES}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      <Group
        index="02"
        kicker="For attendees"
        title="Get in, no hassle"
        blurb="How to find events, pay the way you already do, and walk in with your phone."
        guides={ATTENDEE_GUIDES}
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      <Group
        index="03"
        kicker="About Tikèm"
        title="The bigger picture"
        blurb="What we're building, and the answers to the most common questions."
        guides={ABOUT_GUIDES}
      />

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
