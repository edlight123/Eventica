'use client'

import { useState } from 'react'
import { Search, Filter, ChevronDown, Check } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ConsoleButton } from '@/components/admin/console'

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
    <div className="sticky top-0 z-30 bg-console-ground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-console-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search events by title, city, or organizer..."
              className="w-full pl-10 pr-4 py-2.5 rounded bg-console-panel text-sm text-console-text placeholder:text-console-faint focus:outline-none focus:ring-2 focus:ring-console-mut"
            />
          </div>

          {/* Filters Button */}
          <ConsoleButton
            onClick={onOpenFilters}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="label-mono ml-1 text-xs font-bold tabular-nums text-console-text">
                {activeFiltersCount}
              </span>
            )}
          </ConsoleButton>

          {/* Bulk Actions */}
          {selectedCount > 0 && (
            <div className="relative">
              <ConsoleButton
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <span>{selectedCount} selected</span>
                <ChevronDown className="w-4 h-4" />
              </ConsoleButton>

              {showBulkMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowBulkMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-console-panel rounded-lg shadow-xl py-1 z-20">
                    <button
                      onClick={() => {
                        onBulkAction('publish')
                        setShowBulkMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-console-mut hover:bg-console-raise hover:text-console-text flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-console-green" />
                      Publish Selected
                    </button>
                    <button
                      onClick={() => {
                        onBulkAction('unpublish')
                        setShowBulkMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-console-mut hover:bg-console-raise hover:text-console-text flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-console-amber" />
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
                      className="w-full px-4 py-2 text-left text-sm text-console-red hover:bg-console-raise flex items-center gap-2"
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
