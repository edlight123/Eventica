// A promoter's own stats page, reachable ONLY with their signed stats token.
//
// This is the link the organizer hands each promoter. Deliberately self-contained:
// no session is consulted, because a promoter needs no account. The URL is the
// credential — `{statsKey}.{HMAC}` — verified before a single document is read
// (lib/promoters.ts). Same discipline as guest ticket pages.

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { adminDb } from '@/lib/firebase/admin'
import { getPromoterByStatsKey, verifyPromoterToken } from '@/lib/promoters'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PromoterAccountOffer from './PromoterAccountOffer'
import PromoterShareActions from './PromoterShareActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Not a page search engines or social previews should ever hold on to.
export const metadata = {
  title: 'Your promoter page · Tikèm',
  robots: { index: false, follow: false },
}

function fmtMoney(cents: number, currency: string): string {
  return `${(Math.round(cents) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

function toIso(value: any): string | null {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate().toISOString()
  return String(value)
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function PromoterStatsPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const statsKey = verifyPromoterToken(decodeURIComponent(token))
  // A bad signature and a missing record are indistinguishable to the visitor.
  if (!statsKey) notFound()

  const promoter = await getPromoterByStatsKey(statsKey)
  if (!promoter) notFound()

  const eventSnap = await adminDb.collection('events').doc(String(promoter.event_id)).get()
  const event = eventSnap.exists ? (eventSnap.data() as any) : null

  // Build absolute links on the REQUEST host: the apex 308s to www and in-app
  // browsers are unforgiving about cross-host hops.
  const host = (await headers()).get('host')
  const origin = host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'
  const shareUrl = `${origin}/events/${promoter.event_id}?ref=${encodeURIComponent(promoter.code)}`

  const currency = String(promoter.currency || event?.currency || 'HTG').toUpperCase()
  const commissionLabel =
    promoter.commission_type === 'flat_per_ticket'
      ? `${fmtMoney(Number(promoter.commission_value) || 0, currency)} per ticket`
      : `${Number(promoter.commission_value) || 0}% of sales`

  const stats = [
    { label: 'Tickets sold', value: String(Number(promoter.tickets_sold) || 0) },
    { label: 'Sales you drove', value: fmtMoney(Number(promoter.gross_cents) || 0, currency) },
    { label: 'Your commission', value: fmtMoney(Number(promoter.commission_cents) || 0, currency) },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar user={null} isAdmin={false} />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-mobile-nav md:pb-16">
        <header className="mb-8">
          <p className="label-mono text-[11px] uppercase tracking-widest text-brand-400 mb-2">
            Promoter · {promoter.code}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            {promoter.name}
          </h1>
          <p className="text-white/60 mt-2">
            {event?.title || 'Event'}
            {formatDate(toIso(event?.start_datetime)) ? ` — ${formatDate(toIso(event?.start_datetime))}` : ''}
          </p>
          <p className="text-white/50 text-sm mt-1">You earn {commissionLabel}.</p>
        </header>

        {/* The link — the promoter's whole toolkit. */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-white font-semibold">Your personal link</p>
          <p className="mt-2 truncate rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 font-mono">
            {shareUrl}
          </p>
          <PromoterShareActions shareUrl={shareUrl} eventTitle={String(event?.title || 'Event')} />
          <p className="mt-3 text-xs text-white/40 leading-relaxed">
            Every ticket bought through this link counts for you — even when the buyer
            pays later in the same visit.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <p className="text-lg md:text-xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] uppercase tracking-wider text-white/50 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {promoter.is_active === false && (
          <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-amber-300 text-sm">
              This link is currently paused by the organizer. Sales made through it are
              not being counted right now.
            </p>
          </div>
        )}

        <PromoterAccountOffer
          token={decodeURIComponent(token)}
          alreadyClaimed={Boolean(promoter.claimed_by_uid)}
        />

        <p className="mt-8 text-xs text-white/40 text-center leading-relaxed">
          Your commission collects in a Tikèm wallet and unlocks when the event&apos;s
          funds release — add this page to a free account to withdraw it to MonCash.
          Keep this link: it is your personal page, and its numbers update with every
          sale.
        </p>
      </main>

      <MobileNavWrapper />
    </div>
  )
}
