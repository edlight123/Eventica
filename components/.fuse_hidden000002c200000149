'use client'

import { useState, useEffect } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { EventFilters, DateFilter } from '@/lib/filters/types'
import { 
  CATEGORIES, 
  getCitiesForCountry,
  getPriceFiltersForCountry,
  getSubdivisions, 
  getLocationTypeLabel, 
  hasSubdivisions 
} from '@/lib/filters/config'
import { countActiveFilters, filtersEqual } from '@/lib/filters/utils'
import { useTranslation } from 'react-i18next'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  draftFilters: EventFilters
  appliedFilters: EventFilters
  onDraftChange: (filters: EventFilters) => void
  onApply: () => void
  onReset: () => void
  userCountry?: string
}

export default function FilterPanel({
  isOpen,
  onClose,
  draftFilters,
  appliedFilters,
  onDraftChange,
  onApply,
  onReset,
  userCountry = 'HT'
}: FilterPanelProps) {
  const { t } = useTranslation('common')
  const [showDatePicker, setShowDatePicker] = useState(draftFilters.date === 'pick-date')
  
  // Get country-specific options
  const cities = getCitiesForCountry(userCountry)
  const priceFilters = getPriceFiltersForCountry(userCountry)
  
  useEffect(() => {
    setShowDatePicker(draftFilters.date === 'pick-date')
  }, [draftFilters.date])
  
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  const handleFieldChange = <K extends keyof EventFilters>(
    field: K,
    value: EventFilters[K]
  ) => {
    const updated = { ...draftFilters, [field]: value }
    
    // Reset commune when city changes
    if (field === 'city') {
      updated.commune = undefined
    }
    
    // Clear pickedDate if date filter changes away from 'pick-date'
    if (field === 'date' && value !== 'pick-date') {
      updated.pickedDate = undefined
    }
    
    onDraftChange(updated)
  }
  
  const handleCategoryToggle = (category: string) => {
    const newCategories = draftFilters.categories.includes(category)
      ? draftFilters.categories.filter(c => c !== category)
      : [...draftFilters.categories, category]
    
    handleFieldChange('categories', newCategories)
  }
  
  const activeCount = countActiveFilters(draftFilters)
  const hasChanges = !filtersEqual(draftFilters, appliedFilters)
  
  const subdivisions = draftFilters.city ? getSubdivisions(draftFilters.city, userCountry) : []
  const locationLabel = draftFilters.city ? getLocationTypeLabel(draftFilters.city, userCountry) : 'Area'
  const showSubdivisions = draftFilters.city && hasSubdivisions(draftFilters.city, userCountry)
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel - Mobile: Full screen, Desktop: Right drawer */}
      <div className={`
        fixed z-50 bg-white
        
        /* Mobile: Full screen overlay */
        inset-0 md:inset-auto
        
        /* Desktop: Right drawer */
        md:right-0 md:top-0 md:bottom-0 md:w-[450px]
        md:shadow-2xl
        
        /* Animation */
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-full'}
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('filters.filters')}</h2>
              {activeCount > 0 && (
                <p className="text-xs text-gray-500">{activeCount} {t('filters.active')} {t('filter')}{activeCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] px-4 py-6 space-y-6">
          
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('filters.date')}
            </label>
            <div className="space-y-2">
              {[
                { value: 'any', label: t('filters.any_date') },
                { value: 'today', label: t('filters.today') },
                { value: 'tomorrow', label: t('filters.tomorrow') },
                { value: 'this-week', label: t('filters.this_week') },
                { value: 'this-weekend', label: t('filters.this_weekend') },
                { value: 'pick-date', label: t('filters.pick_date') }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="date"
                    value={option.value}
                    checked={draftFilters.date === option.value}
                    onChange={(e) => handleFieldChange('date', e.target.value as DateFilter)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
              
              {showDatePicker && (
                <input
                  type="date"
                  value={draftFilters.pickedDate || ''}
                  onChange={(e) => handleFieldChange('pickedDate', e.target.value)}
                  className="ml-7 mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              )}
            </div>
          </div>
          
          {/* Location Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('filters.location')}
            </label>
            <select
              value={draftFilters.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">{t('filters.all_cities')}</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            
            {showSubdivisions && (
              <select
                value={draftFilters.commune || ''}
                onChange={(e) => handleFieldChange('commune', e.target.value || undefined)}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">{t('filters.all_areas')}</option>
                {subdivisions.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('filters.categories')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(category => {
                const isSelected = draftFilters.categories.includes(category)
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`
                      px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Price Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('filters.price')}
            </label>
            <div className="space-y-2">
              {priceFilters.map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    value={option.value}
                    checked={draftFilters.price === option.value}
                    onChange={(e) => handleFieldChange('price', e.target.value as any)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('filters.event_type')}
            </label>
            <div className="space-y-2">
              {[
                { value: 'all', label: t('filters.all') },
                { value: 'in-person', label: t('filters.in_person') },
                { value: 'online', label: t('filters.online') }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="eventType"
                    value={option.value}
                    checked={draftFilters.eventType === option.value}
                    onChange={(e) => handleFieldChange('eventType', e.target.value as any)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Sort Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              {t('sort')}
            </label>
            <div className="space-y-2">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'date', label: 'Date' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={draftFilters.sortBy === option.value}
                    onChange={(e) => handleFieldChange('sortBy', e.target.value as any)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 flex gap-3">
          <button
            onClick={onReset}
            disabled={!hasChanges && activeCount === 0}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('filters.reset')}
          </button>
          <button
            onClick={onApply}
            disabled={!hasChanges}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-xl hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {t('filters.apply_filters')}
          </button>
        </div>
      </div>
    </>
  )
}
