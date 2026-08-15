'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, RefreshCw, ShieldQuestion, XCircle } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ageClass, formatAge } from '@/lib/admin/age'

/**
 * The payout review queue.
 *
 * /api/cron/release-payouts flags an event when its rules want human eyes, and a
 * flagged row also blocks that event's automatic payout. Until this page existed
 * nothing read those rows, so a flagged organizer simply never got paid and
 * nobody was told. Everything here is written for someone deciding about a real
 * promoter's money: the machine's reason is spelled out in words, and both
 * actions say what happens to the money.
 */

type ReviewItem = {
  eventId: string
  organizerId: string
  amountMinor: number
  currency: string | null
  reason: string
  tier: string | null
  status: string
  createdAt: string | null
  updatedAt: string | null
  resolvedAt: string | null
  resolvedBy: string | null
  resolvedByEmail: string | null
  note: string | null
  eventTitle: string | null
  organizerName: string | null
  organizerEmail: string | null
}

/** The machine's reason codes, in words an admin can act on. */
const REASON_LABELS: Record<string, string> = {
  mostly_manual_checkins: 'Most attendees were checked in by hand, not scanned',
  very_low_attendance: 'Hardly any of the tickets sold were ever checked in',
  large_event_from_new_organizer: 'A large payout from an organizer who is still new',
  organizer_flagged_high_risk: 'This organizer is flagged high risk, so every payout is reviewed',
  awaiting_admin_review: 'Held because this event was already sitting in this queue',
  eligible: 'Passed every automatic check',
}

/** What an admin should actually go and look at before deciding. */
const REASON_HINTS: Record<string, string> = {
  mostly_manual_checkins:
    'Hand-entered check-ins are indistinguishable from scans in the data, so they can hide tickets that were never really sold. Check the door staff and the guest list.',
  very_low_attendance:
    'Very few check-ins can mean the event did not happen, or that nobody scanned at the door. Confirm the event ran before releasing.',
  large_event_from_new_organizer:
    'First big payout for this promoter. Confirm who they are and that the event took place.',
  organizer_flagged_high_risk:
    'Someone set the high-risk flag on this organizer. Read the note on their detail page before releasing.',
}

const TIER_LABELS: Record<string, string> = {
  new: 'New organizer',
  established: 'Established organizer',
  pre_event: 'Pre-event payouts approved',
}

function describeReason(reason: string): string {
  const parts = String(reason || '')
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  if (!parts.length) return 'No reason recorded'
  return parts
    .map((part) => REASON_LABELS[part] || part.replace(/_/g, ' '))
    .join(' · ')
}

function reasonHint(reason: string): string | null {
  for (const part of String(reason || '').split('+')) {
    const hint = REASON_HINTS[part.trim()]
    if (hint) return hint
  }
  return null
}

/**
 * Amounts are stored in MINOR units of the account currency. Format with the
 * stored code rather than assuming dollars — a HTG queue row is not a USD one.
 */
function formatMinor(amountMinor: number, currency: string | null): string {
  const code = (currency || 'USD').toUpperCase()
  const major = (Number(amountMinor) || 0) / 100
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(major)
  } catch {
    return `${major.toFixed(2)} ${code}`
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'unknown'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'unknown'
  const hours = (Date.now() - then.getTime()) / 3_600_000
  if (hours < 1) return 'less than an hour ago'
  if (hours < 48) return `${Math.round(hours)} hours ago`
  return `${Math.round(hours / 24)} days ago`
}

/**
 * Which timestamp says how long this payout has been waiting.
 *
 * Rows in this collection have been written by more than one job over the life
 * of the queue, so the field that carries the queue time is not guaranteed to be
 * `createdAt`. Take the first candidate that actually parses instead of trusting
 * a single name — an age that silently reads "—" would hide exactly the item an
 * admin most needs to see. `updatedAt` is last because a re-check moves it, so
 * it understates the wait; it is still better than showing nothing.
 */
const WAITING_SINCE_FIELDS = ['createdAt', 'submittedAt', 'created_at', 'updatedAt'] as const

function waitingSince(item: ReviewItem): string | null {
  const row = item as unknown as Record<string, unknown>
  for (const field of WAITING_SINCE_FIELDS) {
    const value = row[field]
    if (typeof value !== 'string' || !value.trim()) continue
    if (Number.isNaN(new Date(value).getTime())) continue
    return value
  }
  return null
}

/** The exact moment, for the hover title — the badge itself is deliberately terse. */
function waitingSinceTitle(iso: string | null): string {
  if (!iso) return 'No queue timestamp recorded on this item'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'No queue timestamp recorded on this item'
  return `Waiting since ${then.toLocaleString()}`
}

export default function PayoutReviewQueue() {
  const confirmDialog = useConfirm()

  const [pending, setPending] = useState<ReviewItem[]>([])
  const [resolved, setResolved] = useState<ReviewItem[]>([])
  const [pendingByCurrency, setPendingByCurrency] = useState<Record<string, number>>({})

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/admin/payouts/review')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Failed to load the review queue' })
        return
      }
      setPending(Array.isArray(data.pending) ? data.pending : [])
      setResolved(Array.isArray(data.resolved) ? data.resolved : [])
      setPendingByCurrency(data.pendingByCurrency || {})
    } catch (error) {
      console.error('Error loading payout review queue:', error)
      setMessage({ type: 'error', text: 'Failed to load the review queue' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (item: ReviewItem, action: 'release' | 'dismiss') => {
    const amount = formatMinor(item.amountMinor, item.currency)
    const who = item.organizerName || item.organizerEmail || item.organizerId

    const ok = await confirmDialog(
      action === 'release'
        ? {
            title: `Approve release of ${amount}?`,
            description: `This lifts the review hold on “${item.eventTitle || item.eventId}” for ${who}. The hourly release run pays it out on its next pass — nothing moves from this page.`,
            confirmLabel: 'Approve release',
            variant: 'default',
          }
        : {
            title: `Dismiss ${amount} without paying?`,
            description: `This closes the review for “${item.eventTitle || item.eventId}” (${who}) and pays nothing. The money stays in their Stripe balance and the event stops appearing here.`,
            confirmLabel: 'Dismiss without paying',
            variant: 'danger',
          }
    )
    if (!ok) return

    setBusyId(item.eventId)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/payouts/review/${encodeURIComponent(item.eventId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        setMessage({
          type: 'error',
          text: [data?.error || 'Could not resolve this review item', data?.details].filter(Boolean).join(' — '),
        })
        // A 409 means someone else already decided; re-read so the list is true.
        if (res.status === 409) await load(false)
        return
      }

      setMessage({
        type: 'success',
        text:
          action === 'release'
            ? `Release approved — ${amount} is queued for the next payout run.`
            : `Dismissed — ${amount} stays held and will not be paid.`,
      })
      await load(false)
    } catch (error) {
      console.error('Error resolving payout review item:', error)
      setMessage({ type: 'error', text: 'Could not resolve this review item' })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/10 p-4 sm:p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="h-4 w-1/2 rounded bg-white/10" />
              <div className="h-4 w-1/4 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const currencyRows = Object.entries(pendingByCurrency).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Waiting on a decision</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{pending.length}</p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Held from organizers</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {currencyRows.length ? (
              currencyRows.map(([code, minor]) => (
                <span key={code} className="mr-3 whitespace-nowrap">
                  {formatMinor(minor, code)}
                </span>
              ))
            ) : (
              <span>—</span>
            )}
          </p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Recently resolved</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{resolved.length}</p>
        </div>
      </div>

      {/* What this queue is */}
      <div className="flex gap-3 rounded-xl border border-white/10 p-4">
        <ShieldQuestion className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/40" />
        <p className="text-sm text-white/55">
          The hourly release job sends an event here when something about it wants human eyes, and a queued event is{' '}
          <span className="text-white/80">not paid</span> while it sits here. Approving lifts that hold so the next run
          pays it; dismissing closes it and pays nothing. Neither button moves money by itself — the release job does,
          on its own schedule, with the balance and idempotency checks it already has. The thresholds that decide what
          lands here live in{' '}
          <Link href="/admin/payouts/release-settings" className="text-brand-300 hover:underline">
            release settings
          </Link>
          .
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 text-sm ${
            message.type === 'success'
              ? 'border border-emerald-500/30 text-emerald-300'
              : 'border border-red-500/30 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">Pending review</h2>
        <button
          type="button"
          onClick={() => load(false)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-8 text-center">
          <CheckCircle className="mx-auto h-8 w-8 text-white/25" />
          <p className="mt-3 text-sm font-medium text-white">Nothing is waiting on a decision</p>
          <p className="mt-1 text-xs text-white/50">
            Every flagged payout has been actioned. New ones appear here within an hour of the release job flagging
            them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => {
            const hint = reasonHint(item.reason)
            const busy = busyId === item.eventId
            const since = waitingSince(item)

            return (
              <div key={item.eventId} className="rounded-xl border border-white/10 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/events/${item.eventId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-semibold text-white hover:text-brand-300"
                    >
                      {item.eventTitle || 'Untitled event'}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {item.organizerId ? (
                        <Link href={`/admin/organizers/${item.organizerId}`} className="text-brand-300 hover:underline">
                          {item.organizerName || item.organizerEmail || item.organizerId}
                        </Link>
                      ) : (
                        <span>Unknown organizer</span>
                      )}
                      {item.organizerName && item.organizerEmail ? (
                        <span className="text-white/35"> · {item.organizerEmail}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-white/30">{item.eventId}</p>
                  </div>

                  <div className="text-right">
                    {/* How long this organizer has been unpaid — the reason this queue is urgent. */}
                    <p
                      className={`label-mono text-[13px] tabular-nums ${ageClass(since)}`}
                      title={waitingSinceTitle(since)}
                    >
                      {since ? `${formatAge(since)} waiting` : 'age unknown'}
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                      {formatMinor(item.amountMinor, item.currency)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">held from this organizer</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-amber-500/25 p-3">
                  <p className="text-sm text-white">
                    <span className="text-amber-300">●</span> {describeReason(item.reason)}
                  </p>
                  {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
                  <p className="mt-2 font-mono text-[11px] text-white/30">{item.reason}</p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40">
                  <span>Queued {timeAgo(item.createdAt)}</span>
                  {item.tier && <span>{TIER_LABELS[item.tier] || item.tier}</span>}
                  {item.updatedAt && item.updatedAt !== item.createdAt && (
                    <span>Re-checked {timeAgo(item.updatedAt)}</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => act(item, 'dismiss')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Dismiss — do not pay
                  </button>
                  <button
                    type="button"
                    onClick={() => act(item, 'release')}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {busy ? 'Working…' : 'Approve release'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recently resolved */}
      <section className="rounded-xl border border-white/10 p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white">Recently resolved</h2>
          <p className="mt-0.5 text-xs text-white/50">
            The last decisions made here, so you can see what a colleague already actioned. Every one is also in the
            admin audit log.
          </p>
        </div>

        {resolved.length === 0 ? (
          <p className="text-xs text-white/40">Nothing has been resolved yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {resolved.map((item) => (
              <li key={item.eventId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{item.eventTitle || item.eventId}</p>
                  <p className="text-[11px] text-white/40">
                    {item.organizerName || item.organizerEmail || item.organizerId} · {describeReason(item.reason)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-white">
                    {formatMinor(item.amountMinor, item.currency)}
                  </p>
                  <p className="text-[11px] text-white/40">
                    <span className={item.status === 'released' ? 'text-emerald-300' : 'text-white/50'}>●</span>{' '}
                    {item.status === 'released' ? 'Released' : 'Dismissed'} {timeAgo(item.resolvedAt || item.updatedAt)}
                    {item.resolvedByEmail ? ` by ${item.resolvedByEmail}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 text-xs text-white/40">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Approving does not itself send money: it clears the block, and the release job pays the event on its next run
        once its own rules allow. If an event keeps re-appearing here, the condition that flagged it is still true —
        change the organizer&rsquo;s settings or the platform thresholds rather than re-approving.
      </p>
    </div>
  )
}
