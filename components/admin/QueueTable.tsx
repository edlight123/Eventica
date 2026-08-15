'use client'

import type { ReactNode } from 'react'
import { formatAge, ageClass } from '@/lib/admin/age'

export type QueueColumn<T> = {
  key: string
  header: string
  /** Applied to both the header cell and the body cell so they stay aligned. */
  className?: string
  render: (row: T) => ReactNode
}

/**
 * The one table every admin queue and register renders through: 44px rows, and
 * an age column when the rows have an age worth showing.
 *
 * State is never a filled pill — callers render a dot plus a label in their own
 * column (existing product rule).
 */
export function QueueTable<T>({
  rows,
  columns,
  getKey,
  getAgeAt,
  actionLabel,
  onAction,
  emptyMessage,
  loading = false,
}: {
  rows: T[]
  columns: QueueColumn<T>[]
  getKey: (row: T) => string
  /** Omit to drop the age column — that is the Register archetype. */
  getAgeAt?: (row: T) => string | null | undefined
  actionLabel?: string
  onAction?: (row: T) => void
  emptyMessage: string
  loading?: boolean
}) {
  const showAge = typeof getAgeAt === 'function'
  const showAction = typeof onAction === 'function' && !!actionLabel

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-4 border-b border-white/[0.06] px-4 last:border-0">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 px-4 py-12 text-center text-sm text-white/50">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`font-grotesk px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/45 ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
            {showAge && (
              <th scope="col" className="font-grotesk px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Waiting
              </th>
            )}
            {showAction && <th scope="col" className="px-4 py-2.5"><span className="sr-only">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const ageAt = showAge ? getAgeAt!(row) : null
            return (
              <tr key={getKey(row)} className="h-11 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03]">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 text-sm text-white ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
                {showAge && (
                  <td className={`label-mono px-4 text-right text-[13px] tabular-nums ${ageClass(ageAt)}`}>
                    {formatAge(ageAt)}
                  </td>
                )}
                {showAction && (
                  <td className="px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onAction!(row)}
                      className="font-grotesk rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {actionLabel}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
