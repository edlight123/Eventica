'use client'

import { useState } from 'react'
import { X, Calendar, MapPin, Tag, DollarSign, ArrowUpDown } from 'lucide-react'

export interface EventFilters {
  dateRange: {
    start: string
    end: string
  } | null
  cities: string[]
  categories: string[]
  hasSales: boolean | null
  sortBy: 'date' | 'sales' | 'created' | 'alphabetical'
  sortOrder: 'asc' | 'desc'
}

interface OrganizerEventsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: EventFilters
  onApplyFilters: (filters: EventFilters) => void
  availableCities: string[]
  availableCategories: string[]
}

export default function OrganizerEventsFiltersModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  availableCities,
  availableCategories
}: OrganizerEventsFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<EventFilters>(filters)

  if (!isOpen) return null

  const handleApply = () => {
    onApplyFilters(localFilters)
    onClose()
  }

  const handleClearAll = () => {
    const clearedFilters: EventFilters = {
      dateRange: null,
      cities: [],
      categories: [],
      hasSales: null,
      sortBy: 'date',
      sortOrder: 'desc'
    }
    setLocalFilters(clearedFilters)
  }

  const toggleCity = (city: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city]
    }))
  }

  const toggleCategory = (category: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category]
    }))
  }

  const activeFiltersCount =
    (localFilters.dateRange ? 1 : 0) +
    localFilters.cities.length +
    localFilters.categories.length +
    (localFilters.hasSales !== null ? 1 : 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl z-50 flex flex-col bg-[#141414] md:rounded-2xl md:shadow-2xl md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-brand-700 text-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Filters</h2>
            {activeFiltersCount > 0 && (
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#242424] transition-colors"
            aria-label="Close filters"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date Range */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-brand-300" />
              <label className="text-sm font-semibold text-white">Date Range</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange?.start || ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        start: e.target.value,
                        end: prev.dateRange?.end || ''
                      }
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1">End Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange?.end || ''}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        start: prev.dateRange?.start || '',
                        end: e.target.value
                      }
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/15 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            {localFilters.dateRange?.start && (
              <button
                onClick={() => setLocalFilters((prev) => ({ ...prev, dateRange: null }))}
                className="mt-2 text-xs text-brand-300 hover:text-brand-300 font-medium"
              >
                Clear date range
              </button>
            )}
          </div>

          {/* Cities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-brand-300" />
              <label className="text-sm font-semibold text-white">Cities</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCities.map((city) => {
                const isSelected = localFilters.cities.includes(city)
                return (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
                    }`}
                  >
                    {city}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-brand-300" />
              <label className="text-sm font-semibold text-white">Categories</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => {
                const isSelected = localFilters.categories.includes(category)
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-700 text-white shadow-sm'
                        : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sales Filter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-brand-300" />
              <label className="text-sm font-semibold text-white">Sales Status</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocalFilters((prev) => ({ ...prev, hasSales: null }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasSales === null
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setLocalFilters((prev) => ({ ...prev, hasSales: true }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasSales === true
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
                }`}
              >
                Has Sales
              </button>
              <button
                onClick={() => setLocalFilters((prev) => ({ ...prev, hasSales: false }))}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilters.hasSales === false
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'bg-[#1c1c1c] text-white/70 hover:bg-[#242424]'
                }`}
              >
                No Sales
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpDown className="w-5 h-5 text-brand-300" />
              <label className="text-sm font-semibold text-white">Sort By</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={localFilters.sortBy}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as EventFilters['sortBy']
                  }))
                }
                className="px-4 py-2 bg-[#0a0a0a] border border-white/15 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="date">Event Date</option>
                <option value="sales">Ticket Sales</option>
                <option value="created">Date Created</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
              <select
                value={localFilters.sortOrder}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    sortOrder: e.target.value as EventFilters['sortOrder']
                  }))
                }
                className="px-4 py-2 bg-[#0a0a0a] border border-white/15 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-[#0a0a0a]">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            Clear All
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-[#141414] border border-white/15 rounded-lg text-sm font-semibold text-white/70 hover:bg-[#0a0a0a] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-brand-700 text-white font-semibold rounded-lg shadow-sm hover:bg-brand-800 transition-all"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
