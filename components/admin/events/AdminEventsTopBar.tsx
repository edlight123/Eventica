'use client'

import { useState } from 'react'
import { Search, Filter, ChevronDown, Check } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmProvider'

interface AdminEventsTopBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeFiltersCount: number
  onOpenFilters: () => void
  selectedCount: number
  onBulkAction: (action: 'publish' | 'unpublish' | 'delete') => void
}

export function AdminEventsTopBar({
  searchQuery,
  onSearchChange,
  activeFiltersCount,
  onOpenFilters,
  selectedCount,
  onBulkAction
}: AdminEventsTopBarProps) {
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const confirmDialog = useConfirm()

  return (
    <div className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events by title, city, or organizer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/45 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          {/* Filters Button */}
          <button
            onClick={onOpenFilters}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-white/80 hover:bg-white/[0.04] hover:text-white text-sm font-medium whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-brand-300 rounded-full font-mono text-xs font-bold tabular-nums">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium whitespace-nowrap"
              >
                <span>{selectedCount} selected</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showBulkMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => setShowBulkMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-lg py-1 z-20">
                    <button
                      onClick={() => {
                        onBulkAction('publish')
                        setShowBulkMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-300" />
                      Publish Selected
                    </button>
                    <button
                      onClick={() => {
                        onBulkAction('unpublish')
                        setShowBulkMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.04] flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-brand-300" />
                      Unpublish Selected
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: `Delete ${selectedCount} event(s)?`,
                          description: 'This permanently removes the selected events. This cannot be undone.',
                          confirmLabel: 'Delete',
                          variant: 'danger',
                        })
                        if (ok) {
                          onBulkAction('delete')
                        }
                        setShowBulkMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Delete Selected
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
