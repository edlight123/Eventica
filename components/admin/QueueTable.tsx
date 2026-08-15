'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatAge, ageClass } from '@/lib/admin/age'

export type QueueColumn<T> = {
  key: string
  header: string
  className?: string
  render: (row: T) => ReactNode
}

/**
 * An admin queue as a table: the shared DataTable plus one thing it does not
 * have — a "Waiting" column carrying how long each item has sat there.
 *
 * This deliberately delegates rather than reimplementing. DataTable already
 * provides sorting, pagination, row selection, a sticky header, loading
 * skeletons, designed empty states and a mobile card fallback; a hand-rolled
 * table here would have been a strictly worse version of all of it. Age is the
 * genuinely new idea in this console, so age is the only thing this adds.
 *
 * Sorting on the Waiting column works on the raw timestamp, not the rendered
 * "6d" string, so it orders correctly rather than alphabetically.
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
  toolbar,
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
  toolbar?: ReactNode
}) {
  const showAge = typeof getAgeAt === 'function'
  const showAction = typeof onAction === 'function' && !!actionLabel

  // Rows arrive from the server, so an age computed at render time would be
  // measured against the SERVER clock in the HTML and the CLIENT clock a beat
  // later — a guaranteed hydration mismatch for any row near a minute boundary.
  // Stamping `now` on mount means the age is computed only on the client.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    // Keep the column honest while an admin sits on the page.
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const tableColumns: Column<T>[] = [
    ...columns.map((col) => ({
      key: col.key,
      header: col.header,
      render: col.render,
      cellClassName: col.className,
      headerClassName: col.className,
    })),
  ]

  if (showAge) {
    tableColumns.push({
      key: 'waiting',
      header: 'Waiting',
      align: 'right' as const,
      sortable: true,
      // Sort on the timestamp itself; the rendered string would sort as text.
      sortAccessor: (row: T) => {
        const at = getAgeAt!(row)
        if (!at) return null
        const d = new Date(at)
        return Number.isNaN(d.getTime()) ? null : d
      },
      render: (row: T) => {
        const at = getAgeAt!(row)
        // Before mount there is no client clock yet; render the cell empty
        // rather than a value the server and client would disagree about.
        if (!now) return <span className="label-mono text-[13px] text-white/25">·</span>
        return (
          <span
            className={`label-mono text-[13px] tabular-nums ${ageClass(at, now)}`}
            title={at ? `Waiting since ${new Date(at).toISOString()}` : 'No timestamp recorded'}
          >
            {formatAge(at, now)}
          </span>
        )
      },
    })
  }

  if (showAction) {
    tableColumns.push({
      key: 'action',
      header: '',
      align: 'right' as const,
      render: (row: T) => (
        <button
          type="button"
          onClick={(e) => {
            // The row itself may be clickable; the button owns this click.
            e.stopPropagation()
            onAction!(row)
          }}
          className="font-grotesk rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {actionLabel}
        </button>
      ),
    })
  }

  return (
    <DataTable
      columns={tableColumns}
      rows={rows}
      rowKey={getKey}
      loading={loading}
      toolbar={toolbar}
      empty={<div className="px-4 py-12 text-center text-sm text-white/50">{emptyMessage}</div>}
    />
  )
}
