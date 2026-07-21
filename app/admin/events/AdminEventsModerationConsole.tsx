'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminEventsTopBar } from '@/components/admin/events/AdminEventsTopBar'
import { AdminEventsFilters } from '@/components/admin/events/AdminEventsFilters'
import { AdminEventsTabs } from '@/components/admin/events/AdminEventsTabs'
import { AdminEventsTable } from '@/components/admin/events/AdminEventsTable'
import { AdminEventDetailSheet } from '@/components/admin/events/AdminEventDetailSheet'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import { useToast } from '@/components/ui/Toast'
import { filterEventsByTab, getEventTabCounts } from '@/lib/admin/event-moderation'

interface FilterOptions {
  dateRange: 'any' | 'today' | 'week' | 'custom'
  startDate?: string
  endDate?: string
  city: string
  category: string
  priceRange: 'any' | 'free' | 'low' | 'high'
  riskLevel: 'any' | 'reported' | 'flagged' | 'suspicious'
  sortBy: 'newest' | 'soonest' | 'most_reported'
}

interface AdminEventsModerationConsoleProps {
  userId: string
  userEmail: string
}

export function AdminEventsModerationConsole({ userId, userEmail }: AdminEventsModerationConsoleProps) {
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'reported' | 'unpublished'>('published')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'any',
    city: '',
    category: '',
    priceRange: 'any',
    riskLevel: 'any',
    sortBy: 'newest'
  })

  const loadEvents = useCallback(async (searchOverride?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/events/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: activeTab, filters, searchQuery: searchOverride ?? searchQuery })
      })
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filters, searchQuery])

  // Load events
  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Debounce search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      void loadEvents(query)
    }, 300)
  }

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(events.map(e => e.id)))
    }
  }

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    try {
      const response = await fetch('/api/admin/events/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds: Array.from(selectedIds),
          action,
          adminId: userId,
          adminEmail: userEmail
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as any).error || `Action failed (${response.status})`)
      }
      setSelectedIds(new Set())
      void loadEvents()
    } catch (error) {
      console.error('Bulk action failed:', error)
      showToast({
        type: 'error',
        title: 'Action failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleEventAction = async (action: 'publish' | 'unpublish' | 'delete' | 'feature', reason?: string) => {
    if (!selectedEvent) return

    try {
      const response = await fetch('/api/admin/events/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          action,
          reason,
          adminId: userId,
          adminEmail: userEmail
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as any).error || `Action failed (${response.status})`)
      }
      setSelectedEvent(null)
      void loadEvents()
    } catch (error) {
      console.error('Action failed:', error)
      showToast({
        type: 'error',
        title: 'Action failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortBy') return false
    if (key === 'dateRange') return value !== 'any'
    return value !== '' && value !== 'any'
  }).length

  // Calculate tab counts (shared, tested moderation logic)
  const tabCounts = getEventTabCounts(events)
  const tabs = [
    { id: 'pending' as const, label: 'Pending Review', count: tabCounts.pending },
    { id: 'published' as const, label: 'Published', count: tabCounts.published },
    { id: 'reported' as const, label: 'Reported', count: tabCounts.reported },
    { id: 'unpublished' as const, label: 'Unpublished', count: tabCounts.unpublished },
  ]

  // Filter events based on tab
  const filteredEvents = filterEventsByTab(events, activeTab)

  return (
    <div>
      {/* Page Header — aligned with the breadcrumb + content column (matches other admin pages) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-5">
        <EditorialHeader
          eyebrow="Platform"
          title="Events Moderation"
          subtitle="Review and manage all events on the platform"
        />
      </div>

      {/* Top Bar */}
      <AdminEventsTopBar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        activeFiltersCount={activeFiltersCount}
        onOpenFilters={() => setShowFilters(true)}
        selectedCount={selectedIds.size}
        onBulkAction={handleBulkAction}
      />

      {/* Tabs */}
      <AdminEventsTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* Events Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/50">Loading events...</p>
          </div>
        ) : (
          <AdminEventsTable
            events={filteredEvents}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onRowClick={setSelectedEvent}
          />
        )}

        {/* Pagination placeholder */}
        {filteredEvents.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="font-mono text-sm tabular-nums text-white/60">
              Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </p>
            {/* Future: Add pagination controls here */}
          </div>
        )}
      </div>

      {/* Filters Sheet */}
      <AdminEventsFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters)
          void loadEvents()
        }}
      />

      {/* Event Detail Sheet */}
      <AdminEventDetailSheet
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onAction={handleEventAction}
      />
    </div>
  )
}
