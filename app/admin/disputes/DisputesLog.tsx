'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, HelpCircle, RefreshCw, ShieldAlert } from 'lucide-react'
import { Card, EmptyState, StatTile, StatusChip } from '@/components/ui/kit'

/**
 * The chargeback log.
 *
 * Read-only on purpose. Nothing on this page moves money: a dispute is answered
 * with evidence in Stripe, and what a lost dispute should cost an organizer is
 * decided by the payout pipeline. What an admin needs from this screen is (a) which
 * disputes still have a live deadline, (b) which ones nobody could match to a
 * ticket and therefore need finding by hand, and (c) whether the organizer was
 * actually reached — a chargeback we never told anyone about is a chargeback we
 * lose by default.
 */

type DisputeItem = {
  disputeId: string
  status: string
  outcome: string
  isOpen: boolean
  reason: string | null
  reasonLabel: string
  amountMinor: number
  currency: string
  chargeId: string | null
  paymentIntentId: string | null
  evidenceDueBy: string | null
  evidenceSubmitted: boolean
  evidencePastDue: boolean
  fundsWithdrawnAt: string | null
  fundsReinstatedAt: string | null
  attributed: boolean
  unattributedReason: string | null
  lookupFailed: boolean
  ticketId: string | null
  eventId: string | null
  eventTitle: string | null
  organizerId: string | null
  organizerName: string | null
  organizerEmail: string | null
  attendeeName: string | null
  organizerNotifiedAt: string | null
  notifyError: string | null
  stripeCreatedAt: string | null
  firstSeenAt: string | null
  updatedAt: string | null
  closedAt: string | null
  lostAt: string | null
}

/** Why a dispute could not be pinned to a ticket, in words. */
const UNATTRIBUTED_LABELS: Record<string, string> = {
  no_ticket_matched_charge_or_payment_intent:
    'No ticket in Firestore carries this payment reference. Look the charge up in Stripe and find the order by buyer email.',
  dispute_had_no_charge_or_payment_intent:
    'Stripe sent this dispute with neither a charge nor a PaymentIntent, so there was nothing to match on.',
  ticket_lookup_failed:
    'The ticket lookup ERRORED — this is not a confirmed non-match. Refresh; if it persists, check Firestore.',
  attribution_threw:
    'Attribution crashed while this dispute was recorded. The dispute is stored; the match needs redoing by hand.',
  matched_ticket_has_no_event_id:
    'A ticket matched the payment but carries no event id, so it points at no show.',
}

function formatMinor(amountMinor: number, currency: string): string {
  const code = (currency || 'USD').toUpperCase()
  const major = (Number(amountMinor) || 0) / 100
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(major)
  } catch {
    return `${major.toFixed(2)} ${code}`
  }
}

function formatMoneyMap(map: Record<string, number>): string {
  const entries = Object.entries(map || {})
  if (!entries.length) return '—'
  return entries.map(([currency, minor]) => formatMinor(minor, currency)).join(' · ')
}

function shortDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Deadlines are the whole point of this screen, so they read in hours/days. */
function deadlineLabel(iso: string | null): { text: string; urgent: boolean } | null {
  if (!iso) return null
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return null
  const hours = (due.getTime() - Date.now()) / 3_600_000
  if (hours <= 0) return { text: `Deadline passed ${shortDate(iso)}`, urgent: true }
  if (hours < 48) return { text: `Evidence due in ${Math.max(1, Math.round(hours))} hours`, urgent: true }
  return { text: `Evidence due ${shortDate(iso)} (${Math.round(hours / 24)} days)`, urgent: false }
}

function outcomeTone(outcome: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (outcome === 'won' || outcome === 'inquiry_closed') return 'success'
  if (outcome === 'lost') return 'danger'
  if (outcome === 'open') return 'warning'
  return 'neutral'
}

function DisputeRow({ item }: { item: DisputeItem }) {
  const deadline = item.isOpen ? deadlineLabel(item.evidenceDueBy) : null

  return (
    <div className="border-t border-white/10 px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-white">
              {formatMinor(item.amountMinor, item.currency)}
            </span>
            <StatusChip tone={outcomeTone(item.outcome)}>
              {item.status.replace(/_/g, ' ')}
            </StatusChip>
            {!item.attributed && <StatusChip tone="warning">Unattributed</StatusChip>}
            {item.fundsWithdrawnAt && !item.fundsReinstatedAt && (
              <StatusChip tone="danger">Funds debited</StatusChip>
            )}
            {item.fundsReinstatedAt && <StatusChip tone="success">Funds returned</StatusChip>}
          </div>

          <p className="mt-1.5 text-sm text-white/70">
            {item.attributed ? (
              <>
                {item.eventId ? (
                  // No admin event-detail route exists; the public page is the
                  // fastest way to see what the buyer actually bought.
                  <Link
                    href={`/events/${item.eventId}`}
                    className="font-medium text-white underline decoration-white/30 hover:decoration-white"
                  >
                    {item.eventTitle || item.eventId}
                  </Link>
                ) : (
                  <span className="font-medium text-white">{item.eventTitle || 'Unknown event'}</span>
                )}
                {item.organizerId && (
                  <>
                    {' · '}
                    <Link
                      href={`/admin/organizers/${item.organizerId}`}
                      className="underline decoration-white/20 hover:decoration-white"
                    >
                      {item.organizerName || item.organizerEmail || item.organizerId}
                    </Link>
                  </>
                )}
              </>
            ) : (
              <span className="text-amber-300">Not matched to any ticket</span>
            )}
          </p>

          <p className="mt-1 text-sm text-white/50">
            Buyer’s stated reason: {item.reasonLabel}
            {item.attendeeName ? ` · Buyer on file: ${item.attendeeName}` : ''}
          </p>
        </div>

        <div className="text-right text-xs text-white/40">
          <div>Opened {shortDate(item.stripeCreatedAt || item.firstSeenAt)}</div>
          {item.lostAt && <div className="text-red-300">Lost {shortDate(item.lostAt)}</div>}
          {item.closedAt && !item.lostAt && <div>Closed {shortDate(item.closedAt)}</div>}
        </div>
      </div>

      {deadline && (
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            deadline.urgent
              ? 'border-red-200 text-red-300'
              : 'border-amber-200 text-amber-300'
          }`}
        >
          ⏰ {deadline.text}
          {item.evidenceSubmitted ? ' · evidence already submitted' : ' · no evidence submitted yet'}
          {item.evidencePastDue ? ' · Stripe marks it past due' : ''}
        </div>
      )}

      {!item.attributed && item.unattributedReason && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
          {UNATTRIBUTED_LABELS[item.unattributedReason] || item.unattributedReason.replace(/_/g, ' ')}
        </div>
      )}

      {item.isOpen && item.attributed && !item.organizerNotifiedAt && (
        <div className="mt-3 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-300">
          The organizer has NOT been reached about this dispute
          {item.notifyError ? ` (${item.notifyError})` : ''}. They hold the evidence — contact them
          directly.
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/35">
        <span>dispute {item.disputeId}</span>
        {item.paymentIntentId && <span>pi {item.paymentIntentId}</span>}
        {item.ticketId && <span>ticket {item.ticketId}</span>}
      </div>
    </div>
  )
}

export default function DisputesLog() {
  const [open, setOpen] = useState<DisputeItem[]>([])
  const [closed, setClosed] = useState<DisputeItem[]>([])
  const [counts, setCounts] = useState<Record<string, any>>({})
  const [openByCurrency, setOpenByCurrency] = useState<Record<string, number>>({})
  const [lostByCurrency, setLostByCurrency] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/admin/disputes')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setError(data?.error || 'Failed to load chargebacks')
        return
      }
      setError(null)
      setOpen(Array.isArray(data.open) ? data.open : [])
      setClosed(Array.isArray(data.closed) ? data.closed : [])
      setCounts(data.counts || {})
      setOpenByCurrency(data.openByCurrency || {})
      setLostByCurrency(data.lostByCurrency || {})
    } catch (err) {
      console.error('Error loading chargebacks:', err)
      setError('Failed to load chargebacks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ShieldAlert} label="Open" value={counts.open ?? 0} sublabel={formatMoneyMap(openByCurrency)} />
        <StatTile icon={AlertTriangle} label="Lost" value={counts.lost ?? 0} sublabel={formatMoneyMap(lostByCurrency)} />
        <StatTile label="Won" value={counts.won ?? 0} sublabel="Money reinstated" />
        <StatTile
          icon={HelpCircle}
          label="Unattributed"
          value={counts.unattributed ?? 0}
          sublabel="Need matching by hand"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => load(false)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl text-white">Still open</h2>
        {open.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No open chargebacks"
            description="Nothing is currently being disputed. New disputes land here the moment Stripe tells us, and the organizer is emailed at the same time."
          />
        ) : (
          <Card>
            {open.map((item) => (
              <DisputeRow key={item.disputeId} item={item} />
            ))}
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-white">Resolved</h2>
        {closed.length === 0 ? (
          <EmptyState title="Nothing resolved yet" description="Closed disputes stay here as an organizer's risk history." />
        ) : (
          <Card>
            {closed.map((item) => (
              <DisputeRow key={item.disputeId} item={item} />
            ))}
          </Card>
        )}
      </section>

      {counts.truncated && (
        <p className="text-xs text-white/40">
          Showing the 200 most recently updated disputes. Older ones exist in Firestore and in Stripe.
        </p>
      )}
    </div>
  )
}
