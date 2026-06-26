'use client'

import { useMemo, useState } from 'react'
import { format, isValid } from 'date-fns'
import { Search } from 'lucide-react'

interface Attendee {
  id: string
  name: string
  email: string
  phone: string
  ticketCount: number
  spendByCurrency: Record<string, number>
  lastPurchase: string
}

function spendLabel(spend: Record<string, number>) {
  const entries = Object.entries(spend).filter(([, v]) => v > 0)
  if (entries.length === 0) return '—'
  return entries.map(([cur, v]) => `${cur} ${Number(v).toLocaleString()}`).join(' · ')
}

export default function MarketingClient({ attendees }: { attendees: Attendee[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return attendees
    return attendees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q)
    )
  }, [attendees, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.05] text-white">Attendees</h1>
          <p className="mt-1 text-[15px] text-white/55">Everyone who has bought a ticket to your events.</p>
        </div>
        {attendees.length > 0 && (
          <span className="rounded-full border border-white/10 bg-[#1c1c1c] px-3.5 py-2 text-sm text-white/70">
            {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
          </span>
        )}
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone"
          className="w-full rounded-xl border border-white/10 bg-[#1c1c1c] py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#141414] py-20 text-center text-white/50">
          {attendees.length === 0
            ? 'Once you begin selling tickets, attendee information will appear here.'
            : 'No attendees match your search.'}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
          <div className="hidden grid-cols-[1.6fr_1.4fr_0.7fr_1fr_0.9fr] gap-4 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 md:grid">
            <span>Name</span>
            <span>Contact</span>
            <span className="text-right">Tickets</span>
            <span className="text-right">Total spend</span>
            <span className="text-right">Last purchase</span>
          </div>
          <div className="divide-y divide-white/10">
            {filtered.map((a) => {
              const d = new Date(a.lastPurchase)
              return (
                <div
                  key={a.id}
                  className="grid grid-cols-1 gap-1 px-5 py-3.5 md:grid-cols-[1.6fr_1.4fr_0.7fr_1fr_0.9fr] md:items-center md:gap-4"
                >
                  <p className="truncate text-[15px] font-medium text-white">{a.name}</p>
                  <p className="truncate text-sm text-white/55">{a.email || a.phone || '—'}</p>
                  <p className="text-sm font-semibold text-white tabular-nums md:text-right">{a.ticketCount}</p>
                  <p className="text-sm text-white/70 tabular-nums md:text-right">{spendLabel(a.spendByCurrency)}</p>
                  <p className="text-sm text-white/55 md:text-right">{isValid(d) ? format(d, 'MMM d, yyyy') : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
