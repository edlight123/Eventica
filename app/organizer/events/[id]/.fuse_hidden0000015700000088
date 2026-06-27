'use client'

import Link from 'next/link'
import Image from 'next/image'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  Globe,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatMoneyFromCents, normalizeCurrency } from '@/lib/money'

interface EventCommandCenterProps {
  event: any
  stats: any
  tickets: any[]
  tiers: any[]
}

const TREND_DAYS = 14

export function EventCommandCenter({ event, stats, tickets, tiers }: EventCommandCenterProps) {
  const currency = normalizeCurrency(event?.currency, stats?.currency || 'HTG')
  const liveTickets = tickets.filter((t: any) => (t.status || '').toLowerCase() !== 'cancelled')

  const capacity = Number(stats?.capacity || 0)
  const sold = Number(stats?.ticketsSold || 0)
  const checkedIn = Number(stats?.checkedIn || 0)
  const pctSold = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0

  // --- Sales trend (last N days, derived from purchase timestamps) ---
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: TREND_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (TREND_DAYS - 1 - i))
    return { date: d, count: 0 }
  })
  for (const t of liveTickets) {
    if (!t.purchased_at) continue
    const p = new Date(t.purchased_at)
    if (Number.isNaN(p.getTime())) continue
    p.setHours(0, 0, 0, 0)
    const idx = buckets.findIndex((b) => b.date.getTime() === p.getTime())
    if (idx >= 0) buckets[idx].count++
  }
  const maxCount = Math.max(1, ...buckets.map((b) => b.count))
  const soldInWindow = buckets.reduce((s, b) => s + b.count, 0)

  // --- Recent activity ---
  const recent = [...liveTickets]
    .filter((t) => t.purchased_at)
    .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())
    .slice(0, 6)

  // --- Setup checklist (only surface what's incomplete) ---
  const setup = [
    { id: 'banner', label: 'Add a cover flyer', done: !!event.banner_image_url, href: `/organizer/events/${event.id}/edit#banner` },
    { id: 'tiers', label: 'Set up ticket tiers', done: tiers.length > 0, href: `/organizer/events/${event.id}/edit#tickets` },
    { id: 'venue', label: 'Add venue details', done: !!(event.venue_name || event.is_online), href: `/organizer/events/${event.id}/edit#venue` },
    { id: 'desc', label: 'Write a full description', done: !!(event.description && event.description.length > 100), href: `/organizer/events/${event.id}/edit#description` },
  ]
  const incomplete = setup.filter((s) => !s.done)

  const kpis = [
    {
      label: 'Gross revenue',
      value: formatMoneyFromCents(Number(stats?.revenueCents || 0), currency),
      icon: DollarSign,
    },
    { label: 'Tickets sold', value: sold.toLocaleString(), sub: capacity > 0 ? `of ${capacity.toLocaleString()}` : 'no cap', icon: Ticket },
    { label: 'Checked in', value: checkedIn.toLocaleString(), sub: sold > 0 ? `${Math.round((checkedIn / sold) * 100)}%` : '—', icon: CheckCircle2 },
    { label: 'Capacity sold', value: `${pctSold}%`, icon: TrendingUp },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Setup banner — only when something's missing */}
      {incomplete.length > 0 && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-white">Finish setting up your event</h2>
              <p className="mt-0.5 text-sm text-white/50">
                {incomplete.length} step{incomplete.length !== 1 ? 's' : ''} left before this looks its best.
              </p>
            </div>
            <Link
              href={`/organizer/events/${event.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              Continue setup <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {incomplete.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1c1c1c] px-3.5 py-1.5 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-white/45">{k.label}</span>
                <Icon className="h-4 w-4 text-white/30" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl leading-none text-white sm:text-[34px]">{k.value}</span>
                {k.sub && <span className="text-sm text-white/40">{k.sub}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===== Main column ===== */}
        <div className="min-w-0 space-y-6">
          {/* Sales trend */}
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Sales</h3>
                <p className="text-sm text-white/45">Last {TREND_DAYS} days · {soldInWindow} ticket{soldInWindow !== 1 ? 's' : ''}</p>
              </div>
              <Link href={`/organizer/events/${event.id}/analytics`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200">
                Analytics <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {soldInWindow > 0 ? (
              <div className="flex h-32 items-end gap-1.5">
                {buckets.map((b, i) => (
                  <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-brand-500/80 transition-colors group-hover:bg-brand-400"
                      style={{ height: `${Math.max(4, (b.count / maxCount) * 100)}%` }}
                      title={`${format(b.date, 'MMM d')}: ${b.count}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
                <TrendingUp className="mb-1.5 h-6 w-6 text-white/25" />
                <p className="text-sm text-white/45">No sales yet in this window</p>
              </div>
            )}
            <div className="mt-2 flex justify-between text-[11px] text-white/35">
              <span>{format(buckets[0].date, 'MMM d')}</span>
              <span>{format(buckets[buckets.length - 1].date, 'MMM d')}</span>
            </div>
          </section>

          {/* Ticket tiers */}
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-white">Ticket types</h3>
              <Link href={`/organizer/events/${event.id}/tickets`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200">
                Manage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {tiers.length > 0 ? (
              <div className="space-y-4">
                {tiers.map((tier: any) => {
                  const qty = Number(tier.quantity || 0)
                  const tsold = Number(tier.sold || 0)
                  const pct = qty > 0 ? Math.min(100, Math.round((tsold / qty) * 100)) : 0
                  return (
                    <div key={tier.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{tier.name || 'Ticket'}</span>
                        <span className="shrink-0 text-sm text-white/50">
                          {tsold}{qty > 0 ? ` / ${qty}` : ''} ·{' '}
                          {Number(tier.price) > 0 ? formatMoneyFromCents(Math.round(Number(tier.price) * 100), currency) : 'Free'}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-8 text-center">
                <Ticket className="mb-2 h-7 w-7 text-white/25" />
                <p className="text-sm text-white/55">No ticket types yet</p>
                <Link href={`/organizer/events/${event.id}/edit#tickets`} className="mt-2 text-sm font-semibold text-brand-300 hover:text-brand-200">
                  Add ticket types
                </Link>
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
            <h3 className="mb-4 text-[15px] font-semibold text-white">Recent activity</h3>
            {recent.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {recent.map((t: any) => {
                  const cents = Math.round((Number(t.price_paid || 0) || 0) * 100)
                  const cur = normalizeCurrency(t.currency, currency)
                  const when = t.purchased_at ? new Date(t.purchased_at) : null
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15">
                        <Ticket className="h-4 w-4 text-brand-300" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">
                          Ticket sold · {cents > 0 ? formatMoneyFromCents(cents, cur) : 'Free'}
                        </p>
                        {when && !Number.isNaN(when.getTime()) && (
                          <p className="text-xs text-white/40">{formatDistanceToNow(when, { addSuffix: true })}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="mb-2 h-7 w-7 text-white/25" />
                <p className="text-sm text-white/45">No sales yet — share your event to get going.</p>
              </div>
            )}
          </section>
        </div>

        {/* ===== Right rail — event details ===== */}
        <aside className="space-y-4 lg:sticky lg:top-[140px] lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
            {event.banner_image_url ? (
              <div className="relative aspect-[4/5] w-full">
                <Image src={event.banner_image_url} alt={event.title} fill sizes="340px" className="object-cover" />
              </div>
            ) : (
              <Link
                href={`/organizer/events/${event.id}/edit#banner`}
                className="flex aspect-[4/5] w-full flex-col items-center justify-center border-b border-white/10 text-center text-white/45 transition-colors hover:text-white/70"
              >
                <ImageIcon className="mb-2 h-9 w-9" />
                <span className="text-sm font-medium">Add a flyer</span>
                <span className="mt-0.5 text-xs text-white/35">Portrait 4:5 looks best</span>
              </Link>
            )}
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2.5 text-sm">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                <span className="text-white/80">{format(new Date(event.start_datetime), 'EEE, MMM d, yyyy · h:mm a')}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                {event.is_online ? (
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                )}
                <span className="text-white/80">
                  {event.is_online ? 'Online event' : event.venue_name || event.city || 'Location TBD'}
                </span>
              </div>
              <Link
                href={`/organizer/events/${event.id}/edit`}
                className="block w-full rounded-xl border border-white/15 py-2.5 text-center text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
              >
                Edit event
              </Link>
            </div>
          </div>

          {event.description && (
            <div className="rounded-2xl border border-white/10 bg-[#141414] p-4">
              <h4 className="mb-2 text-sm font-semibold text-white">About</h4>
              <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                {event.description}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
