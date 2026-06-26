'use client'

import { useMemo, useState } from 'react'
import { format, isValid } from 'date-fns'
import { Search } from 'lucide-react'

interface Order {
  id: string
  eventTitle: string
  attendeeName: string
  attendeeEmail: string
  amount: number
  currency: string
  status: string
  purchasedAt: string
}

function money(amount: number, currency: string) {
  if (!amount) return 'Free'
  return `${currency} ${Number(amount).toLocaleString()}`
}

function statusTone(status: string) {
  const s = status.toLowerCase()
  if (s === 'valid' || s === 'paid' || s === 'completed') return 'bg-emerald-500/15 text-emerald-300'
  if (s === 'refunded' || s === 'cancelled' || s === 'canceled') return 'bg-red-500/15 text-red-300'
  if (s === 'checked_in') return 'bg-brand-500/15 text-brand-300'
  return 'bg-white/10 text-white/70'
}

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(
      (o) =>
        o.eventTitle.toLowerCase().includes(q) ||
        o.attendeeName.toLowerCase().includes(q) ||
        o.attendeeEmail.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    )
  }, [orders, query])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-10">
      <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.05] text-white">Orders</h1>
      <p className="mt-1 text-[15px] text-white/55">Every ticket sold across your events.</p>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by event, attendee, email or order #"
          className="w-full rounded-xl border border-white/10 bg-[#1c1c1c] py-3 pl-11 pr-4 text-[15px] text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#141414] py-20 text-center text-white/50">
          {orders.length === 0 ? 'No orders yet — they’ll appear here as you sell tickets.' : 'No orders match your search.'}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
          {/* header row (desktop) */}
          <div className="hidden grid-cols-[1.6fr_1.4fr_0.8fr_1fr_0.8fr] gap-4 border-b border-white/10 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 md:grid">
            <span>Attendee</span>
            <span>Event</span>
            <span className="text-right">Amount</span>
            <span>Date</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-white/10">
            {filtered.map((o) => {
              const d = new Date(o.purchasedAt)
              return (
                <div
                  key={o.id}
                  className="grid grid-cols-1 gap-1 px-5 py-3.5 md:grid-cols-[1.6fr_1.4fr_0.8fr_1fr_0.8fr] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-white">{o.attendeeName}</p>
                    {o.attendeeEmail && <p className="truncate text-xs text-white/45">{o.attendeeEmail}</p>}
                  </div>
                  <p className="truncate text-sm text-white/70">{o.eventTitle}</p>
                  <p className="text-sm font-semibold text-white tabular-nums md:text-right">{money(o.amount, o.currency)}</p>
                  <p className="text-sm text-white/55">{isValid(d) ? format(d, 'MMM d, yyyy') : '—'}</p>
                  <div className="md:text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusTone(o.status)}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
