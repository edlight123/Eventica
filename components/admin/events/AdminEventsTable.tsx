'use client'

import { format } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { DataTable, type Column, type DataTableSelection } from '@/components/ui/DataTable'
import { StatusChip } from '@/components/ui/kit'

interface Event {
  id: string
  title: string
  start_datetime: string
  city: string
  is_published: boolean
  organizer_name: string
  organizer_email: string
  reports_count?: number
}

interface AdminEventsTableProps {
  events: Event[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onRowClick: (event: Event) => void
}

export function AdminEventsTable({
  events,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick
}: AdminEventsTableProps) {
  const columns: Column<Event>[] = [
    {
      key: 'title',
      header: 'Event',
      render: (event) => (
        <div className="text-sm font-medium text-white line-clamp-1">{event.title}</div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (event) => (
        <span className="whitespace-nowrap font-mono text-sm tabular-nums text-white/60">
          {format(new Date(event.start_datetime), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (event) => (
        <span className="whitespace-nowrap font-mono text-sm text-white/60">{event.city}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => (
        <StatusChip tone={event.is_published ? 'success' : 'warning'}>
          {event.is_published ? 'Published' : 'Draft'}
        </StatusChip>
      ),
    },
    {
      key: 'organizer',
      header: 'Organizer',
      render: (event) => (
        <div>
          <div className="text-sm text-white">{event.organizer_name}</div>
          <div className="text-xs text-white/50">{event.organizer_email}</div>
        </div>
      ),
    },
    {
      key: 'reports',
      header: 'Reports',
      render: (event) =>
        event.reports_count && event.reports_count > 0 ? (
          <StatusChip tone="danger" icon={AlertCircle}>
            {event.reports_count}
          </StatusChip>
        ) : (
          <span className="text-white/50 text-sm">—</span>
        ),
    },
  ]

  const selection: DataTableSelection = {
    selectedIds,
    onToggle: onToggleSelect,
    onToggleAll: onToggleSelectAll,
  }

  const renderMobileCard = (event: Event) => (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selectedIds.has(event.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect(event.id)
          }}
          className="mt-1 w-4 h-4 text-brand-300 rounded focus:ring-brand-500"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-white text-sm line-clamp-2">{event.title}</h4>
            {event.reports_count && event.reports_count > 0 ? (
              <StatusChip tone="danger" icon={AlertCircle} className="flex-shrink-0">
                {event.reports_count}
              </StatusChip>
            ) : null}
          </div>

          <div className="space-y-1 text-xs text-white/60">
            <div className="font-mono tabular-nums">{format(new Date(event.start_datetime), 'MMM d, yyyy')}</div>
            <div className="font-mono">{event.city}</div>
            <div>{event.organizer_name}</div>
          </div>

          <div className="mt-2">
            <StatusChip tone={event.is_published ? 'success' : 'warning'}>
              {event.is_published ? 'Published' : 'Draft'}
            </StatusChip>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <DataTable<Event>
      columns={columns}
      rows={events}
      rowKey={(event) => event.id}
      onRowClick={onRowClick}
      selection={selection}
      renderMobileCard={renderMobileCard}
      empty={<p className="text-white/50">No events found</p>}
    />
  )
}
