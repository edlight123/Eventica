import React from 'react'
import Link from 'next/link'

type IconType = React.ComponentType<{ className?: string }>

/** Standard surface card — crisp corners, soft border + shadow. Use everywhere. */
export function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-soft ${className}`}>
      {children}
    </div>
  )
}

/** KPI tile — brand-tinted icon chip + label + value. Value stays bold sans. */
export function StatTile({
  icon: Icon,
  label,
  value,
  sublabel,
  className = '',
}: {
  icon?: IconType
  label: string
  value: React.ReactNode
  sublabel?: string
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-gray-50 p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-gray-500">{sublabel}</p>}
    </div>
  )
}

/** Filter / category chip. active = filled teal. */
export function Chip({
  active = false,
  href,
  onClick,
  children,
  className = '',
}: {
  active?: boolean
  href?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  const base = `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-brand-700 text-white'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
  } ${className}`
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={base}>
      {children}
    </button>
  )
}

/** Designed empty state — serif title + optional CTA. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: IconType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center ${className}`}>
      {Icon && (
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-display text-xl text-gray-900">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

/** Status chip tone. One accent (brand teal) + semantic green/red/amber/neutral. */
export type ChipTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger'

const toneStyles: Record<ChipTone, string> = {
  brand: 'bg-brand-50 text-brand-700 border border-brand-100',
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
}

/**
 * Maps a free-form status string to a semantic tone so tables/cards stay
 * consistent. Unknown statuses fall back to neutral. Keep this the single
 * source of truth for status coloring across admin + organizer.
 */
export function statusTone(status: string): ChipTone {
  const s = (status || '').toLowerCase().replace(/[\s-]+/g, '_')
  if (
    [
      'paid', 'completed', 'complete', 'approved', 'published', 'active', 'valid',
      'success', 'succeeded', 'verified', 'confirmed', 'settled', 'live',
    ].includes(s)
  )
    return 'success'
  if (
    [
      'pending', 'pending_review', 'in_review', 'processing', 'in_progress',
      'awaiting', 'requested', 'on_hold', 'hold', 'draft', 'scheduled', 'queued',
    ].includes(s)
  )
    return 'warning'
  if (
    [
      'failed', 'error', 'denied', 'rejected', 'cancelled', 'canceled',
      'refunded', 'expired', 'declined', 'disputed', 'suspended', 'blocked',
    ].includes(s)
  )
    return 'danger'
  return 'neutral'
}

/**
 * Status pill. Pass a `tone` directly, or a `status` string to auto-map via
 * statusTone(). The label defaults to a humanized status. Use across all tables.
 */
export function StatusChip({
  status,
  tone,
  icon: Icon,
  children,
  className = '',
}: {
  status?: string
  tone?: ChipTone
  icon?: IconType
  children?: React.ReactNode
  className?: string
}) {
  const resolved: ChipTone = tone ?? statusTone(status ?? '')
  const label =
    children ??
    (status ? status.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '')
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${toneStyles[resolved]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}
