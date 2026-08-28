// The promoter portal: every promoter record this account has claimed, across all
// events, with lifetime totals per currency. A promoter who never signs up loses
// nothing — each tokenized stats page keeps working on its own.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { promoterTokenFor } from '@/lib/promoters'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PromoterWalletCard from './PromoterWalletCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Promoter portal · Tikèm',
  robots: { index: false, follow: false },
}

function fmtMoney(cents: number, currency: string): string {
  return `${(Math.round(cents) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

export default async function PromoterPortalPage() {
  const { user, error } = await requireAuth()
  if (error || !user) redirect('/auth/login?redirect=/promoter')

  const snap = await adminDb
    .collection('event_promoters')
    .where('claimed_by_uid', '==', user.id)
    .orderBy('created_at', 'desc')
    .limit(100)
    .get()

  const host = (await headers()).get('host')
  const origin = host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL || 'https://tikem.co'

  const totalsByCurrency: Record<string, { commissionCents: number; ticketsSold: number }> = {}
  const records = await Promise.all(
    snap.docs.map(async (d: any) => {
      const p = d.data()
      const currency = String(p.currency || 'HTG').toUpperCase()
      const bucket = (totalsByCurrency[currency] ||= { commissionCents: 0, ticketsSold: 0 })
      bucket.commissionCents += Number(p.commission_cents) || 0
      bucket.ticketsSold += Number(p.tickets_sold) || 0

      const eventDoc = await adminDb.collection('events').doc(String(p.event_id)).get()
      const event = eventDoc.exists ? (eventDoc.data() as any) : null
      return {
        id: d.id,
        organizerId: String(p.organizer_id || event?.organizer_id || ''),
        eventTitle: String(event?.title || 'Event'),
        code: String(p.code || ''),
        isActive: p.is_active !== false,
        ticketsSold: Number(p.tickets_sold) || 0,
        grossCents: Number(p.gross_cents) || 0,
        commissionCents: Number(p.commission_cents) || 0,
        currency,
        shareUrl: `${origin}/events/${p.event_id}?ref=${encodeURIComponent(String(p.code || ''))}`,
        statsUrl: `/promoter/${encodeURIComponent(promoterTokenFor(String(p.stats_key || '')))}`,
      }
    })
  )

  // Commission is settled PER ORGANIZER, so the portal groups by who owes what.
  // Names come from users/{organizer_id} — event docs don't reliably carry one.
  const organizerIds = Array.from(new Set(records.map((r) => r.organizerId).filter(Boolean)))
  const organizerNames = new Map<string, string>()
  await Promise.all(
    organizerIds.map(async (id) => {
      const doc = await adminDb.collection('users').doc(id).get()
      const u = doc.exists ? (doc.data() as any) : null
      organizerNames.set(id, String(u?.full_name || u?.display_name || u?.email || 'Organizer'))
    })
  )

  const byOrganizer = organizerIds.map((id) => {
    const rows = records.filter((r) => r.organizerId === id)
    const owedByCurrency: Record<string, number> = {}
    for (const r of rows) {
      owedByCurrency[r.currency] = (owedByCurrency[r.currency] || 0) + r.commissionCents
    }
    return { id, name: organizerNames.get(id) || 'Organizer', rows, owedByCurrency }
  })
  // Records whose organizer could not be resolved still render, at the end.
  const orphanRows = records.filter((r) => !r.organizerId)
  if (orphanRows.length > 0) {
    byOrganizer.push({ id: 'unknown', name: 'Organizer', rows: orphanRows, owedByCurrency: {} })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar user={user as any} isAdmin={false} />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-mobile-nav md:pb-16">
        <header className="mb-8">
          <p className="label-mono text-[11px] uppercase tracking-widest text-brand-400 mb-2">
            Promoter portal
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Everything you promote
          </h1>
        </header>

        <PromoterWalletCard />

        {/* Lifetime totals */}
        {Object.keys(totalsByCurrency).length > 0 && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(totalsByCurrency).map(([currency, t]) => (
              <div key={currency} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-lg font-bold text-white">{fmtMoney(t.commissionCents, currency)}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/50 mt-1">
                  Commission earned · {t.ticketsSold} ticket{t.ticketsSold !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {records.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-white font-semibold">Nothing here yet.</p>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">
              When an organizer makes you a promoter, they send you a personal stats
              link. Open it and choose “add to my account” — it will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {byOrganizer.map((group) => (
              <section key={group.id}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-white font-semibold truncate">{group.name}</h2>
                  {Object.keys(group.owedByCurrency).length > 0 && (
                    <p className="text-sm text-white/60 shrink-0">
                      owes you{' '}
                      <span className="text-white font-semibold">
                        {Object.entries(group.owedByCurrency)
                          .map(([currency, cents]) => fmtMoney(cents, currency))
                          .join(' + ')}
                      </span>
                    </p>
                  )}
                </div>
                <div className="space-y-4">
                  {group.rows.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{r.eventTitle}</p>
                          <p className="text-xs text-white/50 mt-0.5 font-mono">{r.code}</p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/50 shrink-0">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${r.isActive ? 'bg-emerald-400' : 'bg-white/30'}`}
                          />
                          {r.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-white font-bold">{r.ticketsSold}</p>
                          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">Tickets</p>
                        </div>
                        <div>
                          <p className="text-white font-bold">{fmtMoney(r.grossCents, r.currency)}</p>
                          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">Sales</p>
                        </div>
                        <div>
                          <p className="text-white font-bold">{fmtMoney(r.commissionCents, r.currency)}</p>
                          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">Commission</p>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          href={r.statsUrl}
                          className="flex-1 text-center rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors"
                        >
                          Open stats page
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-white/40 text-center leading-relaxed">
          New commission collects in your wallet above and unlocks when each
          event&apos;s funds release. Amounts earned before wallets launched are
          settled with you directly by the organizer.
        </p>
      </main>

      <MobileNavWrapper />
    </div>
  )
}
