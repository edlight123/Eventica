'use client'

import { useState, useMemo } from 'react'
import { Download, Mail, User, CreditCard, Calendar, Check, AlertCircle, QrCode } from 'lucide-react'
import { format } from 'date-fns'
import { formatMoneyFromCents, normalizeCurrency } from '@/lib/money'
import {
  SearchInput,
  FilterBar,
  FilterChip,
  OrgDataTable,
  OrgEmptyState,
  Drawer,
  StatusChip,
} from '@/components/organizer/ui'
import type { OrgColumn } from '@/components/organizer/ui'

interface Ticket {
  id: string
  qr_code_data: string
  status: string
  attendee_id: string
  event_id: string
  ticket_tier_id?: string
  price_paid: number
  currency?: string | null
  quantity: number
  checked_in_at?: string | null
  purchased_at: string
  attendee?: {
    id: string
    full_name?: string
    email?: string
    phone_number?: string
  } | null
}

interface AttendeesManagerProps {
  eventId: string
  eventTitle: string
  tickets: Ticket[]
}

type FilterStatus = 'all' | 'checked-in' | 'not-checked-in' | 'cancelled'

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'checked-in', label: 'Checked In' },
  { value: 'not-checked-in', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
]

const COLUMNS: OrgColumn<Ticket>[] = [
  {
    key: 'attendee',
    header: 'Attendee',
    sortable: true,
    sortAccessor: (t: Ticket) => t.attendee?.full_name || '',
    render: (t: Ticket) => (
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full ">
          <User className="h-4 w-4 text-brand-300" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{t.attendee?.full_name || 'Unknown'}</p>
          <p className="truncate text-xs text-white/50 sm:hidden">{t.attendee?.email || ''}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    sortAccessor: (t: Ticket) => t.attendee?.email || '',
    render: (t: Ticket) => (
      <span className="text-sm text-white/70">{t.attendee?.email || '—'}</span>
    ),
    cellClassName: 'hidden sm:table-cell',
    headerClassName: 'hidden sm:table-cell',
  },
  {
    key: 'status',
    header: 'Status',
    render: (t: Ticket) => {
      if (t.checked_in_at) {
        return (
          <div>
            <StatusChip tone="success">Checked In</StatusChip>
            <p className="mt-0.5 text-xs text-white/40">
              {format(new Date(t.checked_in_at), 'MMM d, h:mm a')}
            </p>
          </div>
        )
      }
      if (t.status === 'cancelled') return <StatusChip tone="danger">Cancelled</StatusChip>
      return <StatusChip tone="warning">Pending</StatusChip>
    },
  },
  {
    key: 'purchased_at',
    header: 'Purchased',
    sortable: true,
    sortAccessor: (t: Ticket) => t.purchased_at,
    render: (t: Ticket) => (
      <span className="text-sm text-white/60">
        {format(new Date(t.purchased_at), 'MMM d, yyyy')}
      </span>
    ),
    cellClassName: 'hidden lg:table-cell',
    headerClassName: 'hidden lg:table-cell',
  },
]

export function AttendeesManager({ eventId, eventTitle, tickets }: AttendeesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const stats = useMemo(() => {
    const total = tickets.length
    const checkedIn = tickets.filter((t) => t.checked_in_at).length
    const notCheckedIn = tickets.filter((t) => !t.checked_in_at && t.status !== 'cancelled').length
    const cancelled = tickets.filter((t) => t.status === 'cancelled').length
    return { total, checkedIn, notCheckedIn, cancelled }
  }, [tickets])

  const statusCount: Record<FilterStatus, number> = {
    all: stats.total,
    'checked-in': stats.checkedIn,
    'not-checked-in': stats.notCheckedIn,
    cancelled: stats.cancelled,
  }

  const filteredTickets = useMemo(() => {
    let filtered = tickets

    if (filterStatus === 'checked-in') filtered = filtered.filter((t) => t.checked_in_at)
    else if (filterStatus === 'not-checked-in')
      filtered = filtered.filter((t) => !t.checked_in_at && t.status !== 'cancelled')
    else if (filterStatus === 'cancelled') filtered = filtered.filter((t) => t.status === 'cancelled')

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.attendee?.full_name?.toLowerCase().includes(q) ||
          t.attendee?.email?.toLowerCase().includes(q) ||
          t.attendee?.phone_number?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [tickets, filterStatus, searchQuery])

  const handleExportCSV = () => {
    const csv = [
      ['Name', 'Email', 'Phone', 'Ticket ID', 'Status', 'Checked In', 'Purchase Date'],
      ...filteredTickets.map((t) => [
        t.attendee?.full_name || 'N/A',
        t.attendee?.email || 'N/A',
        t.attendee?.phone_number || 'N/A',
        t.id,
        t.status,
        t.checked_in_at
          ? format(new Date(t.checked_in_at), 'MMM d, yyyy h:mm a')
          : 'Not checked in',
        format(new Date(t.purchased_at), 'MMM d, yyyy'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${eventTitle}-attendees-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleEmailAttendees = () => {
    const emails = filteredTickets
      .map((t) => t.attendee?.email)
      .filter(Boolean)
      .join(',')
    window.location.href = `mailto:${emails}?subject=${encodeURIComponent(`Update: ${eventTitle}`)}`
  }

  const mobileCard = (t: Ticket) => (
    <button
      key={t.id}
      type="button"
      onClick={() => setSelectedTicket(t)}
      className="flex w-full items-center gap-3 p-4 text-left hover:bg-[#1c1c1c] active:bg-[#1c1c1c]"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full ">
        <User className="h-5 w-5 text-brand-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{t.attendee?.full_name || 'Unknown'}</p>
        <p className="truncate text-xs text-white/50">{t.attendee?.email || ''}</p>
      </div>
      <div>
        {t.checked_in_at ? (
          <StatusChip tone="success">In</StatusChip>
        ) : t.status === 'cancelled' ? (
          <StatusChip tone="danger">Cancelled</StatusChip>
        ) : (
          <StatusChip tone="warning">Pending</StatusChip>
        )}
      </div>
    </button>
  )

  return (
    <>
      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-white', bg: 'border-white/10' },
          { label: 'Checked In', value: stats.checkedIn, color: 'text-emerald-300', bg: 'border-emerald-500/30' },
          { label: 'Pending', value: stats.notCheckedIn, color: 'text-amber-300', bg: 'border-amber-500/30' },
          { label: 'Cancelled', value: stats.cancelled, color: 'text-red-300', bg: 'border-red-500/30' },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border bg-[#141414] p-4 ${k.bg}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, phone, or ticket ID…"
          className="flex-1"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#141414] px-4 text-sm font-medium text-white/70 transition-colors hover:bg-[#1c1c1c] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleEmailAttendees}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email All</span>
          </button>
        </div>
      </div>

      {/* Status filter chips */}
      <FilterBar className="mb-4">
        {STATUS_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            active={filterStatus === f.value}
            onClick={() => setFilterStatus(f.value)}
            count={statusCount[f.value]}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterBar>

      {/* Table */}
      <OrgDataTable<Ticket>
        columns={COLUMNS}
        rows={filteredTickets}
        rowKey={(t) => t.id}
        onRowClick={(t) => setSelectedTicket(t)}
        renderMobileCard={mobileCard}
        empty={
          <OrgEmptyState
            icon={User}
            title={searchQuery || filterStatus !== 'all' ? 'No attendees match' : 'No attendees yet'}
            description={
              searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No tickets have been sold for this event yet.'
            }
          />
        }
      />

      {/* Detail drawer */}
      <Drawer
        open={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        title="Attendee Details"
        size="md"
        footer={
          selectedTicket && selectedTicket.status !== 'cancelled' ? (
            <AttendeeActions ticket={selectedTicket} eventId={eventId} />
          ) : undefined
        }
      >
        {selectedTicket && <AttendeeDetail ticket={selectedTicket} />}
      </Drawer>
    </>
  )
}

function AttendeeDetail({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-6 p-6">
      {/* Attendee info */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
          Attendee Information
        </p>
        <div className="space-y-3">
          <InfoRow icon={<User className="h-4 w-4" />} label="Name">
            {ticket.attendee?.full_name || '—'}
          </InfoRow>
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Email">
            {ticket.attendee?.email || '—'}
          </InfoRow>
          <InfoRow
            icon={
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
            label="Phone"
          >
            {ticket.attendee?.phone_number || '—'}
          </InfoRow>
        </div>
      </section>

      {/* Ticket info */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">
          Ticket Information
        </p>
        <div className="space-y-3">
          <InfoRow icon={<QrCode className="h-4 w-4" />} label="Ticket ID">
            <span className="font-mono text-sm">{ticket.id}</span>
          </InfoRow>
          <InfoRow icon={<Calendar className="h-4 w-4" />} label="Purchased">
            {format(new Date(ticket.purchased_at), 'MMMM d, yyyy h:mm a')}
          </InfoRow>
          <InfoRow
            icon={
              ticket.checked_in_at ? (
                <Check className="h-4 w-4 text-emerald-300" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-300" />
              )
            }
            label="Check-In"
          >
            {ticket.checked_in_at ? (
              <span className="text-emerald-300">
                {format(new Date(ticket.checked_in_at), 'MMM d, h:mm a')}
              </span>
            ) : (
              <span className="text-amber-300">Not checked in</span>
            )}
          </InfoRow>
          <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Price Paid">
            {formatMoneyFromCents(
              Math.round(Number(ticket.price_paid || 0) * 100),
              normalizeCurrency(ticket.currency, 'HTG')
            )}
          </InfoRow>
        </div>
      </section>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-white/40">{icon}</span>
      <div>
        <p className="text-xs text-white/40">{label}</p>
        <p className="font-medium text-white">{children}</p>
      </div>
    </div>
  )
}

function AttendeeActions({ ticket, eventId }: { ticket: Ticket; eventId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleResendTicket = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/resend-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      })
      if (!res.ok) throw new Error()
      setMessage({ type: 'success', text: 'Ticket resent successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to resend ticket' })
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!confirm('Refund this ticket? This cannot be undone.')) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/refund-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      })
      if (!res.ok) throw new Error()
      setMessage({ type: 'success', text: 'Refund processed!' })
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setMessage({ type: 'error', text: 'Failed to process refund' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 p-4">
      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'text-emerald-300'
              : 'text-red-300'
          }`}
        >
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={handleResendTicket}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        Resend Ticket Email
      </button>
      <button
        type="button"
        onClick={handleRefund}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        <CreditCard className="h-4 w-4" />
        Process Refund
      </button>
    </div>
  )
}
