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
