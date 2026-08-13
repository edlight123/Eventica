'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PayoutReleaseConfig, PayoutReleaseOverride } from '@/types/platform-settings'

/**
 * Per-organizer payout release override (/api/admin/organizers/[id]/payout-release).
 *
 * Numeric fields left blank INHERIT the platform threshold — clearing one sends
 * null so the organizer falls back to /admin/payouts/release-settings. The three
 * flags relax the rules, and the API refuses to save a relaxation without a
 * note, so the note field is treated as required here too.
 */

type NumericKey = 'newHoldHours' | 'establishedHoldHours' | 'reserveBps' | 'reserveDays' | 'reviewAboveGrossMinor'

type FieldKind = 'hours' | 'days' | 'money' | 'percentBps'

interface FieldDef {
  key: NumericKey
  label: string
  kind: FieldKind
  help: string
}

/** Mirrors the server guard rails; the server remains the authority. */
const LIMITS: Record<NumericKey, { min: number; max: number }> = {
  newHoldHours: { min: 0, max: 720 },
  establishedHoldHours: { min: 0, max: 720 },
  reserveBps: { min: 0, max: 5000 },
  reserveDays: { min: 0, max: 365 },
  reviewAboveGrossMinor: { min: 0, max: 100_000_000 },
}

const FIELDS: FieldDef[] = [
  {
    key: 'newHoldHours',
    label: 'Hold while new',
    kind: 'hours',
    help: 'Hours after an event ends before this organizer is paid, while they still count as new.',
  },
  {
    key: 'establishedHoldHours',
    label: 'Hold once established',
    kind: 'hours',
    help: 'The same wait once this organizer counts as established.',
  },
  {
    key: 'reserveBps',
    label: 'Reserve rate',
    kind: 'percentBps',
    help: 'Share of each card sale withheld against chargebacks — setting it to 0% removes their reserve entirely.',
  },
  {
    key: 'reserveDays',
    label: 'Reserve held for',
    kind: 'days',
    help: 'How long this organizer’s reserve is kept before it is released to them.',
  },
  {
    key: 'reviewAboveGrossMinor',
    label: 'Review events above',
    kind: 'money',
    help: 'Events bigger than this go to the review queue while this organizer is still new.',
  },
]

const majorFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function toDisplay(kind: FieldKind, value: number): string {
  if (!Number.isFinite(value)) return ''
  if (kind === 'money') return (value / 100).toFixed(2)
  if (kind === 'percentBps') return String(round2(value / 100))
  return String(value)
}

function toApi(kind: FieldKind, display: string): number {
  const n = Number(display)
  if (display.trim() === '' || !Number.isFinite(n)) return NaN
  if (kind === 'money') return Math.round(n * 100)
  if (kind === 'percentBps') return Math.round(n * 100)
  return n
}

function unitSuffix(kind: FieldKind): string {
  if (kind === 'hours') return 'hours'
  if (kind === 'days') return 'days'
  if (kind === 'percentBps') return '%'
  return ''
}

function pretty(kind: FieldKind, apiValue: number): string {
  if (!Number.isFinite(apiValue)) return '—'
  if (kind === 'money') return majorFormatter.format(apiValue / 100)
  if (kind === 'percentBps') return `${round2(apiValue / 100)}%`
  return `${apiValue} ${unitSuffix(kind)}`
}

function formatStamp(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

type Values = Record<NumericKey, string>

const EMPTY_VALUES: Values = {
  newHoldHours: '',
  establishedHoldHours: '',
  reserveBps: '',
  reserveDays: '',
  reviewAboveGrossMinor: '',
}

function valuesFrom(override: PayoutReleaseOverride | null): Values {
  const next = { ...EMPTY_VALUES }
  if (!override) return next
  for (const field of FIELDS) {
    const value = override[field.key]
    if (typeof value === 'number') next[field.key] = toDisplay(field.kind, value)
  }
  return next
}

export default function OrganizerPayoutReleaseCard({ organizerId }: { organizerId: string }) {
  const [override, setOverride] = useState<PayoutReleaseOverride | null>(null)
  const [platform, setPlatform] = useState<PayoutReleaseConfig | null>(null)

  const [values, setValues] = useState<Values>(EMPTY_VALUES)
  const [preEventApproved, setPreEventApproved] = useState(false)
  const [highRisk, setHighRisk] = useState(false)
  const [forceEstablished, setForceEstablished] = useState(false)
  const [note, setNote] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [serverDetails, setServerDetails] = useState<string[]>([])

  const applyOverride = (next: PayoutReleaseOverride | null) => {
    setOverride(next)
    setValues(valuesFrom(next))
    setPreEventApproved(next?.preEventReleaseApproved === true)
    setHighRisk(next?.highRisk === true)
    setForceEstablished(next?.forceEstablished === true)
    setNote('')
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [overrideRes, platformRes] = await Promise.all([
          fetch(`/api/admin/organizers/${organizerId}/payout-release`),
          fetch('/api/admin/payout-release'),
        ])
        const overrideData = await overrideRes.json().catch(() => ({}))
        const platformData = await platformRes.json().catch(() => ({}))
        if (cancelled) return
        if (!overrideRes.ok) {
          setMessage({ type: 'error', text: overrideData?.error || 'Failed to load payout release override' })
          return
        }
        applyOverride(overrideData?.override || null)
        if (platformRes.ok && platformData?.config) setPlatform(platformData.config)
      } catch (error) {
        console.error('Error loading payout release override:', error)
        if (!cancelled) setMessage({ type: 'error', text: 'Failed to load payout release override' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [organizerId])

  const fieldError = (field: FieldDef): string | null => {
    const raw = values[field.key]
    if (raw.trim() === '') return null // blank = inherit the platform threshold
    const apiValue = toApi(field.kind, raw)
    if (!Number.isFinite(apiValue)) return 'Must be a number'
    const limit = LIMITS[field.key]
    if (apiValue < limit.min || apiValue > limit.max) {
      return `Must be between ${toDisplay(field.kind, limit.min)} and ${toDisplay(field.kind, limit.max)}`
    }
    return null
  }

  const errors = FIELDS.reduce<Partial<Record<NumericKey, string>>>((acc, field) => {
    const err = fieldError(field)
    if (err) acc[field.key] = err
    return acc
  }, {})
  const hasErrors = Object.keys(errors).length > 0

  // Same test the API applies before it demands a note.
  const zeroReserve = values.reserveBps.trim() !== '' && toApi('percentBps', values.reserveBps) === 0
  const isRelaxing = preEventApproved || forceEstablished || zeroReserve
  const noteRequired = isRelaxing && !note.trim() && !override?.note

  const handleSave = async () => {
    if (saving || hasErrors) return
    if (noteRequired) {
      setMessage({ type: 'error', text: 'A note is required when relaxing payout rules for an organizer.' })
      return
    }

    setSaving(true)
    setMessage(null)
    setServerDetails([])

    try {
      const payload: Record<string, unknown> = {
        preEventReleaseApproved: preEventApproved,
        highRisk,
        forceEstablished,
      }
      for (const field of FIELDS) {
        const raw = values[field.key]
        payload[field.key] = raw.trim() === '' ? null : toApi(field.kind, raw)
      }
      if (note.trim()) payload.note = note.trim()

      const res = await fetch(`/api/admin/organizers/${organizerId}/payout-release`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        setMessage({
          type: 'error',
          text:
            data?.code === 'note_required'
              ? 'A note is required when relaxing payout rules for an organizer.'
              : data?.error || 'Failed to save payout release override',
        })
        if (Array.isArray(data?.details)) setServerDetails(data.details)
        return
      }

      applyOverride(data.override || null)
      setMessage({ type: 'success', text: 'Payout release override saved.' })
    } catch (error) {
      console.error('Error saving payout release override:', error)
      setMessage({ type: 'error', text: 'Failed to save payout release override' })
    } finally {
      setSaving(false)
    }
  }

  const clearAllNumeric = () => setValues(EMPTY_VALUES)

  const toggles: {
    label: string
    help: string
    value: boolean
    set: (next: boolean) => void
    relaxes: boolean
  }[] = [
    {
      label: 'Pre-event payouts approved',
      help: 'Pay this organizer BEFORE their event ends — money advanced against a show that has not happened yet. Never automatic; only grant it to a promoter you know.',
      value: preEventApproved,
      set: setPreEventApproved,
      relaxes: true,
    },
    {
      label: 'Treat as established',
      help: 'Skip the history requirements and give this organizer the established hold and no new-organizer reserve right away.',
      value: forceEstablished,
      set: setForceEstablished,
      relaxes: true,
    },
    {
      label: 'High risk',
      help: 'Send every payout for this organizer to the review queue, whatever tier they are in. This tightens the rules, so no note is required.',
      value: highRisk,
      set: setHighRisk,
      relaxes: false,
    },
  ]

  return (
    <div className="rounded-lg border border-white/10 p-4 sm:p-5 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payout Release
          </h2>
          <p className="mt-1 text-xs text-white/50">
            Exceptions for this organizer only. Leave a field blank to follow the{' '}
            <Link href="/admin/payouts/release-settings" className="text-brand-300 hover:underline">
              platform thresholds
            </Link>
            .
          </p>
        </div>
        {override?.updatedAt && (
          <p className="font-mono tabular-nums text-xs text-white/40">
            Updated {formatStamp(override.updatedAt)}
            {override.updatedBy ? ` by ${override.updatedBy}` : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-1/4 rounded bg-white/10" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current effective state, dot + label (no filled pills) */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
            {override?.preEventReleaseApproved && (
              <span className="label-mono uppercase text-amber-300">● Pre-event payouts approved</span>
            )}
            {override?.forceEstablished && (
              <span className="label-mono uppercase text-amber-300">● Forced established</span>
            )}
            {override?.highRisk && <span className="label-mono uppercase text-red-300">● High risk</span>}
            {!override && <span className="label-mono uppercase text-white/40">● No override — platform defaults</span>}
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.type === 'success'
                  ? 'border border-emerald-500/30 text-emerald-300'
                  : 'border border-red-500/30 text-red-300'
              }`}
            >
              <p>{message.text}</p>
              {serverDetails.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-300/90">
                  {serverDetails.map((detail, i) => (
                    <li key={i} className="font-mono">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Numeric overrides */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => {
              const limit = LIMITS[field.key]
              const error = errors[field.key]
              const suffix = unitSuffix(field.kind)
              const inherited = platform ? pretty(field.kind, platform[field.key] as number) : null
              const isOverridden = values[field.key].trim() !== ''
              const apiValue = toApi(field.kind, values[field.key])

              return (
                <div key={field.key}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor={`override-${field.key}`} className="block text-sm font-medium text-white/70">
                      {field.label}
                    </label>
                    {isOverridden ? (
                      <button
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [field.key]: '' }))}
                        className="text-[11px] font-semibold text-brand-300 hover:text-white"
                      >
                        Use platform default
                      </button>
                    ) : (
                      <span className="label-mono text-[11px] uppercase tracking-wide text-white/35">Inherited</span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      id={`override-${field.key}`}
                      value={values[field.key]}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      step={field.kind === 'money' || field.kind === 'percentBps' ? '0.01' : '1'}
                      min={toDisplay(field.kind, limit.min)}
                      max={toDisplay(field.kind, limit.max)}
                      placeholder={inherited ? `Platform default — ${inherited}` : 'Platform default'}
                      className={`w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
                        error ? 'border-red-500/50' : 'border-white/10 focus:border-brand-500/60'
                      } ${suffix ? 'pr-16' : ''}`}
                    />
                    {suffix && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-sm text-white/50">{suffix}</span>
                      </div>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-white/50">{field.help}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                    <span>
                      Allowed {toDisplay(field.kind, limit.min)} – {toDisplay(field.kind, limit.max)}
                      {suffix ? ` ${suffix}` : ''}
                    </span>
                    {field.kind === 'money' && isOverridden && Number.isFinite(apiValue) && (
                      <span className="font-mono">= {apiValue.toLocaleString('en-US')} minor units (cents)</span>
                    )}
                  </div>
                  {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
                </div>
              )
            })}
          </div>

          {/* Flags */}
          <div className="space-y-2">
            {toggles.map((toggle) => (
              <div
                key={toggle.label}
                className="flex items-start justify-between gap-4 rounded-lg border border-white/10 p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {toggle.label}
                    {toggle.relaxes && (
                      <span className="ml-2 label-mono text-[10px] uppercase tracking-wide text-amber-300">
                        note required
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-white/50">{toggle.help}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggle.value}
                  onClick={() => toggle.set(!toggle.value)}
                  className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    toggle.value ? (toggle.relaxes ? 'bg-amber-500' : 'bg-red-600') : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      toggle.value ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Note */}
          <div>
            <label htmlFor="override-note" className="mb-1.5 flex flex-wrap items-baseline gap-2 text-sm font-medium text-white/70">
              Note
              <span className={`label-mono text-[10px] uppercase tracking-wide ${isRelaxing ? 'text-amber-300' : 'text-white/35'}`}>
                {isRelaxing ? 'required' : 'optional'}
              </span>
            </label>
            <textarea
              id="override-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={
                override?.note
                  ? 'Add a new note to replace the one below'
                  : 'Why is this organizer trusted? e.g. “Known promoter, 4 sold-out shows with us, verified in person.”'
              }
              className={`w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
                noteRequired ? 'border-amber-500/50' : 'border-white/10 focus:border-brand-500/60'
              }`}
            />
            <p className="mt-1.5 text-xs text-white/50">
              Relaxing the rules — approving pre-event payouts, forcing established, or setting the reserve to 0% —
              cannot be saved without a note. It is the record of why this organizer was trusted, read back later if
              something goes wrong.
            </p>
            {override?.note && (
              <div className="mt-2 rounded-lg border border-white/10 p-3">
                <p className="text-xs text-white/50">Current note</p>
                <p className="mt-1 text-sm text-white">{override.note}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-white/40">
              {noteRequired
                ? 'Add a note before saving — the API rejects a relaxation without one.'
                : 'Saved changes are audit-logged with the before/after.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAllNumeric}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
              >
                Clear custom numbers
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || hasErrors || noteRequired}
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
