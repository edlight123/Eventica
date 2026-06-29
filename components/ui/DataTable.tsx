'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

export type SortDir = 'asc' | 'desc'
type Align = 'left' | 'right' | 'center'

export interface Column<T> {
  /** Stable id for the column; also used as the default sort key. */
  key: string
  /** Header label / node. */
  header: React.ReactNode
  /** Cell renderer. Defaults to String((row as any)[key]). */
  render?: (row: T) => React.ReactNode
  /** Enables the sortable header affordance for this column. */
  sortable?: boolean
  /** Value used when sorting client-side. Falls back to (row as any)[key]. */
  sortAccessor?: (row: T) => string | number | Date | null | undefined
  align?: Align
  /** Extra classes for the <td>. */
  cellClassName?: string
  /** Extra classes for the <th>. */
  headerClassName?: string
  /** Hide this column below md (it still appears in the mobile fallback card). */
  hideOnMobile?: boolean
}

export interface DataTableSelection {
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  /** Stable key per row. */
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void

  /** Toolbar slot (search input, filters). Rendered above the table. */
  toolbar?: React.ReactNode

  /** Loading skeleton. */
  loading?: boolean
  /** Number of skeleton rows to render while loading. */
  skeletonRows?: number
  /** Shown when there are no rows (and not loading). */
  empty?: React.ReactNode

  /** Controlled sort — provide together with onSortChange for server-side sort. */
  sortKey?: string
  sortDir?: SortDir
  onSortChange?: (key: string, dir: SortDir) => void

  /** Controlled pagination (server-side). */
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  /** Client-side pagination — used only when controlled `page` is not provided. */
  pageSize?: number

  /** Optional row selection (checkbox column). */
  selection?: DataTableSelection

  /** Custom mobile (<md) card renderer. Falls back to a stacked label/value card. */
  renderMobileCard?: (row: T) => React.ReactNode

  stickyHeader?: boolean
  className?: string
}

const alignClass: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Shared admin/organizer data table. Crisp corners, sticky header, clean
 * (zebra-free) rows, row hover, optional sort/pagination/selection, designed
 * empty + loading states, and a responsive mobile card fallback. One accent:
 * teal brand tokens only.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  toolbar,
  loading = false,
  skeletonRows = 6,
  empty,
  sortKey,
  sortDir,
  onSortChange,
  page,
  totalPages,
  onPageChange,
  pageSize,
  selection,
  renderMobileCard,
  stickyHeader = true,
  className = '',
}: DataTableProps<T>) {
  const controlledSort = typeof onSortChange === 'function'
  const [internalSortKey, setInternalSortKey] = useState<string | undefined>(undefined)
  const [internalSortDir, setInternalSortDir] = useState<SortDir>('asc')
  const [internalPage, setInternalPage] = useState(1)

  const activeSortKey = controlledSort ? sortKey : internalSortKey
  const activeSortDir = controlledSort ? (sortDir ?? 'asc') : internalSortDir

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return
    const nextDir: SortDir = activeSortKey === col.key && activeSortDir === 'asc' ? 'desc' : 'asc'
    if (controlledSort) {
      onSortChange!(col.key, nextDir)
    } else {
      setInternalSortKey(col.key)
      setInternalSortDir(nextDir)
    }
  }

  // Client-side sort only when uncontrolled.
  const sortedRows = useMemo(() => {
    if (controlledSort || !internalSortKey) return rows
    const col = columns.find((c) => c.key === internalSortKey)
    if (!col) return rows
    const accessor = col.sortAccessor ?? ((row: T) => (row as Record<string, unknown>)[col.key] as never)
    const copy = [...rows]
    copy.sort((a, b) => {
      const res = compare(accessor(a), accessor(b))
      return internalSortDir === 'asc' ? res : -res
    })
    return copy
  }, [rows, columns, controlledSort, internalSortKey, internalSortDir])

  // Client-side pagination only when controlled page is absent and pageSize set.
  const clientPaginated = typeof page !== 'number' && typeof pageSize === 'number'
  const clientTotalPages = clientPaginated ? Math.max(1, Math.ceil(sortedRows.length / pageSize!)) : 1
  const currentPage = clientPaginated ? Math.min(internalPage, clientTotalPages) : page

  const visibleRows = useMemo(() => {
    if (!clientPaginated) return sortedRows
    const start = (currentPage! - 1) * pageSize!
    return sortedRows.slice(start, start + pageSize!)
  }, [sortedRows, clientPaginated, currentPage, pageSize])

  const goToPage = (next: number) => {
    if (clientPaginated) {
      setInternalPage(next)
    } else {
      onPageChange?.(next)
    }
  }

  const allSelected =
    !!selection && rows.length > 0 && rows.every((r) => selection.selectedIds.has(rowKey(r)))
  const someSelected =
    !!selection && !allSelected && rows.some((r) => selection.selectedIds.has(rowKey(r)))

  const colSpan = columns.length + (selection ? 1 : 0)
  const footerTotalPages = clientPaginated ? clientTotalPages : totalPages
  const footerPage = clientPaginated ? currentPage : page
  const showFooter = !!footerTotalPages && footerTotalPages > 1

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null
    if (activeSortKey !== col.key) return <ChevronsUpDown className="h-3.5 w-3.5 text-white/50" />
    return activeSortDir === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5 text-brand-600" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-brand-600" />
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-soft ${className}`}
    >
      {toolbar && <div className="border-b border-white/10 p-3 sm:p-4">{toolbar}</div>}

      {loading ? (
        <div className="divide-y divide-white/10">
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-6">
              <div className="h-9 w-9 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-white/[0.04]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8">
          {empty ?? <p className="text-center text-sm text-white/50">No results found.</p>}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead className={`bg-[#0a0a0a] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
                <tr className="border-b border-white/10">
                  {selection && (
                    <th className="w-12 px-4 py-3 sm:px-6">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected
                        }}
                        onChange={selection.onToggleAll}
                        className="h-4 w-4 rounded border-white/10 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col)}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-white/50 sm:px-6 ${
                        alignClass[col.align ?? 'left']
                      } ${col.sortable ? 'cursor-pointer select-none hover:text-white/70' : ''} ${
                        col.hideOnMobile ? '' : ''
                      } ${col.headerClassName ?? ''}`}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {col.header}
                        <SortIcon col={col} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {visibleRows.map((row) => {
                  const id = rowKey(row)
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={`transition-colors hover:bg-[#0a0a0a] ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                    >
                      {selection && (
                        <td className="px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={selection.selectedIds.has(id)}
                            onChange={() => selection.onToggle(id)}
                            className="h-4 w-4 rounded border-white/10 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 align-middle text-sm text-white sm:px-6 ${
                            alignClass[col.align ?? 'left']
                          } ${col.cellClassName ?? ''}`}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-white/10 md:hidden">
            {visibleRows.map((row) => {
              const id = rowKey(row)
              if (renderMobileCard) {
                return (
                  <div
                    key={id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {renderMobileCard(row)}
                  </div>
                )
              }
              return (
                <div
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`space-y-2 p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-start justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                        {col.header}
                      </span>
                      <span className="min-w-0 text-right text-sm text-white">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}

      {showFooter && (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6">
          <p className="text-xs text-white/50">
            Page {footerPage} of {footerTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage((footerPage ?? 1) - 1)}
              disabled={(footerPage ?? 1) <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => goToPage((footerPage ?? 1) + 1)}
              disabled={(footerPage ?? 1) >= (footerTotalPages ?? 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-white/70 transition-colors hover:bg-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
