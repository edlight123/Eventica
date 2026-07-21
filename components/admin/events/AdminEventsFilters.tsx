'use client'

import { X, MapPin, Tag, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

interface FilterOptions {
  city: string
  category: string
  sortBy: 'newest' | 'soonest'
}

interface AdminEventsFiltersProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterOptions
  onApply: (filters: FilterOptions) => void
}

const DEFAULT_FILTERS: FilterOptions = {
  city: '',
  category: '',
  sortBy: 'newest',
}

export function AdminEventsFilters({ isOpen, onClose, filters, onApply }: AdminEventsFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters)

  if (!isOpen) return null

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS)
    onApply(DEFAULT_FILTERS)
    onClose()
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/45 focus:border-brand-500/60 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#0a0a0a] shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">Filters</h3>
          <button onClick={onClose} aria-label="Close filters" className="p-2 hover:bg-white/[0.04] rounded-lg">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* City */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/70 mb-3">
              <MapPin className="w-4 h-4" />
              City
            </label>
            <select
              value={localFilters.city}
              onChange={(e) => setLocalFilters({ ...localFilters, city: e.target.value })}
              className={inputClass}
            >
              <option value="">All cities</option>
              <option value="Port-au-Prince">Port-au-Prince</option>
              <option value="Cap-Haïtien">Cap-Haïtien</option>
              <option value="Jacmel">Jacmel</option>
              <option value="Les Cayes">Les Cayes</option>
              <option value="Gonaïves">Gonaïves</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/70 mb-3">
              <Tag className="w-4 h-4" />
              Category
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
              className={inputClass}
            >
              <option value="">All categories</option>
              <option value="Music">Music</option>
              <option value="Sports">Sports</option>
              <option value="Arts">Arts</option>
              <option value="Food">Food & Drink</option>
              <option value="Business">Business</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-white/70 mb-3">
              <ArrowUpDown className="w-4 h-4" />
              Sort By
            </label>
            <div className="space-y-2">
              {[
                { value: 'newest', label: 'Newest first' },
                { value: 'soonest', label: 'Soonest event date' },
              ].map((sort) => (
                <label key={sort.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortBy"
                    value={sort.value}
                    checked={localFilters.sortBy === sort.value}
                    onChange={(e) => setLocalFilters({ ...localFilters, sortBy: e.target.value as FilterOptions['sortBy'] })}
                    className="w-4 h-4 text-brand-300 focus:ring-brand-500"
                  />
                  <span className="text-sm text-white/70">{sort.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-white/10">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2.5 border border-white/10 text-white/70 rounded-lg hover:bg-white/[0.04] hover:text-white font-medium text-sm"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}
