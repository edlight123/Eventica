import React from 'react'
import { AlertCircle } from 'lucide-react'

type IconType = React.ComponentType<{ className?: string }>

/**
 * Dark-canvas empty state — centered icon, serif title, optional description + CTA.
 * Drop-in for any zero-data list on the organizer portal.
 */
export function OrgEmptyState({
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
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0a0a0a] p-10 text-center ${className}`}
    >
      {Icon && (
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl text-brand-400">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="font-display text-xl text-white">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * Dark-canvas error state — shows an error icon + message.
 * Use when a data fetch fails or a permission is denied.
 */
export function OrgErrorState({
  title = 'Something went wrong',
  description,
  action,
  className = '',
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-red-500/20 p-10 text-center ${className}`}
    >
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl text-red-400">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl text-white">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/50">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

/**
 * Dark-canvas row skeleton.
 * Each row: icon placeholder + two text lines + right pill.
 */
export function OrgLoadingSkeleton({
  rows = 6,
  className = '',
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={`animate-pulse space-y-0 divide-y divide-white/5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-[#0a0a0a]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-[#0a0a0a]" />
            <div className="h-3 w-1/4 rounded bg-[#0a0a0a]" />
          </div>
          <div className="h-6 w-16 rounded-full bg-[#0a0a0a]" />
        </div>
      ))}
    </div>
  )
}

/**
 * Full-page skeleton for organizer routes — shows the PageHeader outline + rows.
 */
export function OrgPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-16 rounded " />
        <div className="h-9 w-56 rounded-lg bg-[#0a0a0a]" />
        <div className="h-4 w-80 rounded bg-[#0a0a0a]" />
      </div>
      {/* Content skeleton */}
      <div className="overflow-hidden rounded-2xl  bg-[#0a0a0a]">
        {/* Toolbar */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="h-9 w-52 rounded-lg bg-[#0a0a0a]" />
        </div>
        <OrgLoadingSkeleton rows={rows} />
      </div>
    </div>
  )
}
