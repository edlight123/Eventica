'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Info, RotateCcw } from 'lucide-react'
import type { PayoutReleaseConfig } from '@/types/platform-settings'

/**
 * Platform payout release thresholds — the admin face of
 * /api/admin/payout-release. Every knob here decides when other people's money
 * moves, so each field carries a one-line plain-language explanation, its
 * platform default (with a one-click reset), and the server's own min/max.
 *
 * Units: the API stores money in MINOR units of the account currency and
 * percentages in basis points / 0..1 ratios. This form speaks major units and
 * percent to the admin and converts on save.
 */

type NumericField =
  | 'newHoldHours'
  | 'establishedHoldHours'
  | 'establishedAfterEvents'
  | 'establishedAfterGrossMinor'
  | 'preEventEligibleGrossMinor'
  | 'reviewAboveGrossMinor'
  | 'reserveBps'
  | 'reserveDays'
  | 'manualCheckInReviewRatio'
  | 'lowAttendanceReviewRatio'

/** How a stored value is shown to (and read back from) the admin. */
type FieldKind = 'hours' | 'days' | 'events' | 'money' | 'percentBps' | 'percentRatio'

type Limit = { min: number; max: number }

interface FieldDef {
  key: NumericField
  label: string
  kind: FieldKind
  /** One sentence: what changing this does to real organizers. */
  help: string
}

interface GroupDef {
  title: string
  blurb: string
  fields: FieldDef[]
}

const GROUPS: GroupDef[] = [
  {
    title: 'Holds',
    blurb: 'How long after an event ends before ticket money is allowed to move to the organizer.',
    fields: [
      {
        key: 'newHoldHours',
        label: 'New organizer hold',
        kind: 'hours',
        help: 'A new organizer waits this many hours after their event ends before payout — raising it makes us safer and makes them slower.',
      },
      {
        key: 'establishedHoldHours',
        label: 'Established organizer hold',
        kind: 'hours',
        help: 'The same wait once an organizer has earned the established tier below.',
      },
    ],
  },
  {
    title: 'When an organizer becomes established',
    blurb: 'Either threshold is enough — an organizer graduates on whichever they reach first.',
    fields: [
      {
        key: 'establishedAfterEvents',
        label: 'Clean events needed',
        kind: 'events',
        help: 'Events completed without a dispute or a refund storm before an organizer counts as established.',
      },
      {
        key: 'establishedAfterGrossMinor',
        label: 'Lifetime revenue needed',
        kind: 'money',
        help: 'Lifetime gross ticket sales that also earn the established tier, for organizers who sell a lot across few events.',
      },
      {
        key: 'preEventEligibleGrossMinor',
        label: 'Lifetime revenue for pre-event eligibility',
        kind: 'money',
        help: 'Below this, an admin cannot grant pre-event payouts at all; reaching it grants nothing by itself — an admin still has to approve each organizer by hand.',
      },
    ],
  },
  {
    title: 'Reserve',
    blurb: 'A slice of card sales held back against future chargebacks. MonCash sales are never reserved — they cannot be charged back.',
    fields: [
      {
        key: 'reserveBps',
        label: 'Reserve rate',
        kind: 'percentBps',
        help: 'Share of each card sale withheld from the payout; the organizer gets the rest now and the reserve later.',
      },
      {
        key: 'reserveDays',
        label: 'Reserve held for',
        kind: 'days',
        help: 'How long the withheld slice is kept before it is released to the organizer.',
      },
    ],
  },
  {
    title: 'Review triggers',
    blurb: 'These never block an organizer — they route a payout to the admin queue for a human look instead of paying out automatically.',
    fields: [
      {
        key: 'reviewAboveGrossMinor',
        label: 'Review events above',
        kind: 'money',
        help: 'An event this big from an organizer who is still new goes to review rather than paying out on its own.',
      },
      {
        key: 'manualCheckInReviewRatio',
        label: 'Manual check-in share',
        kind: 'percentRatio',
        help: 'If this share or more of an event’s check-ins were typed in by hand instead of scanned, send the payout to review.',
      },
      {
        key: 'lowAttendanceReviewRatio',
        label: 'Low attendance below',
        kind: 'percentRatio',
        help: 'If fewer than this share of sold tickets were checked in, send the payout to review — it can mean the event never really happened.',
      },
    ],
  },
]

const ALL_FIELDS = GROUPS.flatMap((g) => g.fields)

const majorFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const minorFormatter = new Intl.NumberFormat('en-US')

function round(value: number, places: number) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/** Stored (API) value → what the admin types. */
function toDisplay(kind: FieldKind, value: number): string {
  if (!Number.isFinite(value)) return ''
  switch (kind) {
    case 'money':
      return (value / 100).toFixed(2)
    case 'percentBps':
      return String(round(value / 100, 2))
    case 'percentRatio':
      return String(round(value * 100, 2))
    default:
      return String(value)
  }
}

/** What the admin typed → the stored (API) value. NaN when unparseable. */
function toApi(kind: FieldKind, display: string): number {
  const n = Number(display)
  if (display.trim() === '' || !Number.isFinite(n)) return NaN
  switch (kind) {
    case 'money':
      return Math.round(n * 100)
    case 'percentBps':
      return Math.round(n * 100)
    case 'percentRatio':
      // via basis points so 80 → 0.8 exactly rather than 0.7999999
      return Math.round(n * 100) / 10000
    default:
      return n
  }
}

function unitSuffix(kind: FieldKind): string {
  switch (kind) {
    case 'hours':
      return 'hours'
    case 'days':
      return 'days'
    case 'events':
      return 'events'
    case 'percentBps':
    case 'percentRatio':
      return '%'
    case 'money':
      return ''
  }
}

function stepFor(kind: FieldKind): string {
  switch (kind) {
    case 'money':
    case 'percentBps':
      return '0.01'
    case 'percentRatio':
      return '1'
    default:
      return '1'
  }
}

/** Pretty version of a display value, for the default chip and previews. */
function prettyDisplay(kind: FieldKind, display: string): string {
  const n = Number(display)
  if (!Number.isFinite(n)) return display
  if (kind === 'money') return majorFormatter.format(n)
  if (kind === 'percentBps' || kind === 'percentRatio') return `${round(n, 2)}%`
  return `${n} ${unitSuffix(kind)}`.trim()
}

type Values = Record<NumericField, string>

function valuesFrom(config: PayoutReleaseConfig): Values {
  return ALL_FIELDS.reduce((acc, field) => {
    acc[field.key] = toDisplay(field.kind, config[field.key] as number)
    return acc
  }, {} as Values)
}

export function PayoutReleaseSettingsForm() {
  const [config, setConfig] = useState<PayoutReleaseConfig | null>(null)
  const [defaults, setDefaults] = useState<PayoutReleaseConfig | null>(null)
  const [limits, setLimits] = useState<Partial<Record<NumericField, Limit>>>({})

  const [values, setValues] = useState<Values | null>(null)
  const [reserveNewOnly, setReserveNewOnly] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [serverDetails, setServerDetails] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/payout-release')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data?.config) {
          setMessage({ type: 'error', text: data?.error || 'Failed to load payout release settings' })
          return
        }
        setConfig(data.config)
        setDefaults(data.defaults)
        setLimits(data.limits || {})
        setValues(valuesFrom(data.config))
        setReserveNewOnly(data.config.reserveNewOrganizersOnly !== false)
      } catch (error) {
        console.error('Error loading payout release settings:', error)
        if (!cancelled) setMessage({ type: 'error', text: 'Failed to load payout release settings' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  /** Client-side mirror of the server guard rails. The server is the authority. */
  const fieldError = (field: FieldDef): string | null => {
    if (!values) return null
    const raw = values[field.key]
    if (raw.trim() === '') return 'Required'
    const apiValue = toApi(field.kind, raw)
    if (!Number.isFinite(apiValue)) return 'Must be a number'
    const limit = limits[field.key]
    if (limit && (apiValue < limit.min || apiValue > limit.max)) {
      return `Must be between ${toDisplay(field.kind, limit.min)} and ${toDisplay(field.kind, limit.max)}`
    }
    return null
  }

  const errors = values
    ? ALL_FIELDS.reduce<Partial<Record<NumericField, string>>>((acc, field) => {
        const err = fieldError(field)
        if (err) acc[field.key] = err
        return acc
      }, {})
    : {}
  const hasErrors = Object.keys(errors).length > 0

  const isDirtyField = (field: FieldDef) =>
    !!config && !!values && toApi(field.kind, values[field.key]) !== config[field.key]

  const hasChanges =
    !!config &&
    !!values &&
    (ALL_FIELDS.some(isDirtyField) || reserveNewOnly !== (config.reserveNewOrganizersOnly !== false))

  const isDefaultField = (field: FieldDef) =>
    !!defaults && !!values && toApi(field.kind, values[field.key]) === defaults[field.key]

  const setValue = (key: NumericField, next: string) => {
    setValues((prev) => (prev ? { ...prev, [key]: next } : prev))
  }

  const resetField = (field: FieldDef) => {
    if (!defaults) return
    setValue(field.key, toDisplay(field.kind, defaults[field.key] as number))
  }

  const resetAll = () => {
    if (!defaults) return
    setValues(valuesFrom(defaults))
    setReserveNewOnly(defaults.reserveNewOrganizersOnly !== false)
  }

  const discardChanges = () => {
    if (!config) return
    setValues(valuesFrom(config))
    setReserveNewOnly(config.reserveNewOrganizersOnly !== false)
    setMessage(null)
    setServerDetails([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values || hasErrors || saving) return

    setSaving(true)
    setMessage(null)
    setServerDetails([])

    try {
      const payload: Record<string, number | boolean> = {
        reserveNewOrganizersOnly: reserveNewOnly,
      }
      for (const field of ALL_FIELDS) {
        payload[field.key] = toApi(field.kind, values[field.key])
      }

      const res = await fetch('/api/admin/payout-release', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data?.success) {
        setMessage({ type: 'error', text: data?.error || 'Failed to save payout release settings' })
        if (Array.isArray(data?.details)) setServerDetails(data.details)
        return
      }

      setConfig(data.config)
      setValues(valuesFrom(data.config))
      setReserveNewOnly(data.config.reserveNewOrganizersOnly !== false)
      const changed: string[] = Array.isArray(data.changed) ? data.changed : []
      setMessage({
        type: 'success',
        text: changed.length
          ? `Saved — ${changed.length} threshold${changed.length === 1 ? '' : 's'} updated.`
          : 'Nothing to save — these values already match what is live.',
      })
    } catch (error) {
      console.error('Error saving payout release settings:', error)
      setMessage({ type: 'error', text: 'Failed to save payout release settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/10 p-4 sm:p-5">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/4 rounded bg-white/10" />
              <div className="h-4 w-1/2 rounded bg-white/10" />
              <div className="h-4 w-1/3 rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!config || !values || !defaults) {
    return (
      <div className="rounded-xl border border-red-500/30 p-4 text-sm text-red-300">
        {message?.text || 'Could not load payout release settings.'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Live summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">New hold</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {config.newHoldHours}
            <span className="text-base font-medium text-white/50"> h</span>
          </p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Established hold</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {config.establishedHoldHours}
            <span className="text-base font-medium text-white/50"> h</span>
          </p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Reserve</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{round(config.reserveBps / 100, 2)}%</p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Reserve held</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {config.reserveDays}
            <span className="text-base font-medium text-white/50"> days</span>
          </p>
        </div>
        <div className="bg-[#0a0a0a] p-4">
          <p className="text-[11px] uppercase tracking-wide text-white/50">Established after</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {config.establishedAfterEvents}
            <span className="text-base font-medium text-white/50"> events</span>
          </p>
        </div>
      </div>

      {/* Money units, stated honestly */}
      <div className="flex gap-3 rounded-xl border border-white/10 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/40" />
        <p className="text-sm text-white/55">
          Money thresholds are stored and compared in <span className="text-white/80">minor units of the account
          currency</span> (cents for a USD account, centimes for HTG) — there is one number for every currency, so it is
          not dollars. Inputs below are shown in major units for readability: typing{' '}
          <span className="font-mono text-white/80">1,000.00</span> saves{' '}
          <span className="font-mono text-white/80">100,000</span> minor units. Changes take effect on the next release
          decision and are audit-logged.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Messages */}
        {message && (
          <div
            className={`rounded-lg p-4 text-sm ${
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

        {GROUPS.map((group) => (
          <section key={group.title} className="rounded-xl border border-white/10 p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <p className="mt-0.5 text-xs text-white/50">{group.blurb}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {group.fields.map((field) => {
                const limit = limits[field.key]
                const error = errors[field.key]
                const defaultDisplay = toDisplay(field.kind, defaults[field.key] as number)
                const atDefault = isDefaultField(field)
                const suffix = unitSuffix(field.kind)
                const apiValue = toApi(field.kind, values[field.key])

                return (
                  <div key={field.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <label htmlFor={field.key} className="block text-sm font-medium text-white/70">
                        {field.label}
                      </label>
                      {atDefault ? (
                        <span className="label-mono text-[11px] uppercase tracking-wide text-white/35">Default</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => resetField(field)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-300 hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset to {prettyDisplay(field.kind, defaultDisplay)}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        id={field.key}
                        value={values[field.key]}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        step={stepFor(field.kind)}
                        min={limit ? toDisplay(field.kind, limit.min) : undefined}
                        max={limit ? toDisplay(field.kind, limit.max) : undefined}
                        aria-describedby={`${field.key}-help`}
                        className={`w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
                          error ? 'border-red-500/50' : 'border-white/10 focus:border-brand-500/60'
                        } ${suffix ? 'pr-16' : ''}`}
                      />
                      {suffix && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-sm text-white/50">{suffix}</span>
                        </div>
                      )}
                    </div>

                    <p id={`${field.key}-help`} className="mt-1.5 text-xs text-white/50">
                      {field.help}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
                      <span>
                        Default {prettyDisplay(field.kind, defaultDisplay)}
                      </span>
                      {limit && (
                        <span>
                          Allowed {prettyDisplay(field.kind, toDisplay(field.kind, limit.min))} –{' '}
                          {prettyDisplay(field.kind, toDisplay(field.kind, limit.max))}
                        </span>
                      )}
                      {field.kind === 'money' && Number.isFinite(apiValue) && (
                        <span className="font-mono">= {minorFormatter.format(apiValue)} minor units</span>
                      )}
                      {field.kind === 'percentBps' && Number.isFinite(apiValue) && (
                        <span className="font-mono">= {minorFormatter.format(apiValue)} bps</span>
                      )}
                    </div>

                    {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
                  </div>
                )
              })}

              {/* Reserve scope toggle lives with the reserve numbers */}
              {group.title === 'Reserve' && (
                <div className="md:col-span-2">
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-white/10 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">Reserve new organizers only</p>
                      <p className="mt-1 text-xs text-white/50">
                        On, a reserve is held only while an organizer is still new; off, every organizer is reserved on
                        every card sale forever, which permanently withholds cash from promoters who have already proved
                        themselves.
                      </p>
                      <p className="mt-1 text-[11px] text-white/40">
                        Default {defaults.reserveNewOrganizersOnly ? 'on' : 'off'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={reserveNewOnly}
                      onClick={() => setReserveNewOnly((v) => !v)}
                      className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                        reserveNewOnly ? 'bg-brand-600' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          reserveNewOnly ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a0a0a]/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-4 text-sm">
            {hasChanges ? (
              <span className="font-medium text-amber-300">● Unsaved changes</span>
            ) : (
              <span className="text-white/50">All changes saved</span>
            )}
            {hasErrors && (
              <span className="inline-flex items-center gap-1.5 text-xs text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Fix the highlighted fields
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04]"
            >
              Load platform defaults
            </button>
            <button
              type="button"
              onClick={discardChanges}
              disabled={!hasChanges}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.04] disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges || hasErrors}
              className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save thresholds'}
            </button>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-white/40">
          <Clock className="h-3.5 w-3.5" /> Per-organizer exceptions (pre-event payouts, high risk, custom holds) are
          set on each organizer’s detail page, not here.
        </p>
      </form>
    </div>
  )
}
