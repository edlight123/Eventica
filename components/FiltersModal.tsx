'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { EventFilters, DateFilter, EventTypeFilter, PriceFilter } from '@/lib/filters/types'
import { CATEGORIES, getCitiesForCountry, getPriceFiltersForCountry, getSubdivisions, getLocationTypeLabel, hasSubdivisions } from '@/lib/filters/config'
import { countActiveFilters, filtersEqual } from '@/lib/filters/utils'
import { FilterChip } from './FilterChip'

interface FiltersModalProps {
  isOpen: boolean
  draftFilters: EventFilters
  appliedFilters: EventFilters
  onClose: () => void
  onApply: () => void
  onReset: () => void
  onDraftChange: (filters: EventFilters) => void
  userCountry?: string
}

export function FiltersModal({
  isOpen,
  draftFilters,
  appliedFilters,
  onClose,
  onApply,
  onReset,
  onDraftChange,
  userCountry = 'HT'
}: FiltersModalProps) {
  const { t } = useTranslation('common')
  const [mounted, setMounted] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Get country-specific options
  const cities = getCitiesForCountry(userCountry)
  const priceFilters = getPriceFiltersForCountry(userCountry)

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'any', label: t('filters.any_date') },
    { value: 'today', label: t('filters.today') },
    { value: 'tomorrow', label: t('filters.tomorrow') },
    { value: 'this-week', label: t('filters.this_week') },
    { value: 'this-weekend', label: t('filters.this_weekend') },
    { value: 'pick-date', label: t('filters.pick_date') }
  ]

  const EVENT_TYPE_OPTIONS: { value: EventTypeFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'in-person', label: t('filters.in_person') },
    { value: 'online', label: t('filters.online') }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    setShowDatePicker(draftFilters.date === 'pick-date')
  }, [draftFilters.date])

  if (!mounted || !isOpen) return null

  const hasChanges = !filtersEqual(draftFilters, appliedFilters)
  const activeCount = countActiveFilters(draftFilters)
  const subdivisions = draftFilters.city ? getSubdivisions(draftFilters.city, userCountry) : []
  const locationLabel = draftFilters.city ? getLocationTypeLabel(draftFilters.city, userCountry) : 'Area'
  const hasLocation = hasSubdivisions(draftFilters.city, userCountry)

  const handleDateChange = (date: DateFilter) => {
    onDraftChange({ ...draftFilters, date, pickedDate: date === 'pick-date' ? draftFilters.pickedDate : undefined })
  }

  const handleCityChange = (city: string) => {
    onDraftChange({ ...draftFilters, city, commune: undefined })
  }

  const handleCommuneChange = (commune: string) => {
    onDraftChange({ ...draftFilters, commune })
  }

  const handleCategoryToggle = (category: string) => {
    const categories = draftFilters.categories.includes(category)
      ? draftFilters.categories.filter(c => c !== category)
      : [...draftFilters.categories, category]
    onDraftChange({ ...draftFilters, categories })
  }

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal/Sheet */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4 pointer-events-none">
        <div 
          className="pointer-events-auto bg-[#0a0a0a] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[600px] rounded-t-3xl md:rounded-3xl shadow-poster md:border md:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-10">
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-2xl leading-none text-white">{t('filters.filters')}</h2>
              {activeCount > 0 && (
                <span className="eyebrow text-[11px] text-brand-400">{activeCount} {t('filters.active')}</span>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.close', { defaultValue: 'Close' })}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Date Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/50">{t('filters.date')}</label>
              <div className="flex flex-wrap gap-2">
                {DATE_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.date === option.value}
                    onClick={() => handleDateChange(option.value)}
                  />
                ))}
              </div>
              {showDatePicker && (
                <input
                  type="date"
                  value={draftFilters.pickedDate || ''}
                  onChange={(e) => onDraftChange({ ...draftFilters, pickedDate: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
              )}
            </div>

            {/* Event Type - Segmented Control */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/50">{t('filters.event_type')}</label>
              <div className="inline-flex rounded-xl  p-1 bg-white/5">
                {EVENT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onDraftChange({ ...draftFilters, eventType: option.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${draftFilters.eventType === option.value
                        ? 'bg-white/15 text-brand-300 shadow-sm'
                        : 'text-white/55 hover:text-white'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/50">{t('filters.price')}</label>
              <div className="flex flex-wrap gap-2">
                {priceFilters.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.price === option.value}
                    onClick={() => onDraftChange({ ...draftFilters, price: option.value as PriceFilter })}
                  />
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/50">{t('filters.categories')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={draftFilters.categories.includes(category)}
                    onClick={() => handleCategoryToggle(category)}
                  />
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/50">{t('filters.location')}</label>
              <div className="space-y-3">
                {/* City Dropdown */}
                <select
                  value={draftFilters.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                >
                  <option value="">{t('filters.all_cities')}</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {/* Commune/Neighborhood Dropdown */}
                {hasLocation && (
                  <div className="space-y-2">
                    <label className="eyebrow text-[10px] text-white/40">{locationLabel}</label>
                    <select
                      value={draftFilters.commune || ''}
                      onChange={(e) => handleCommuneChange(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/5 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    >
                      <option value="">{t('filters.all_areas')} {locationLabel.toLowerCase()}s</option>
                      {subdivisions.map(subdivision => (
                        <option key={subdivision} value={subdivision}>{subdivision}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 bg-[#0a0a0a]/85 backdrop-blur border-t border-white/10 p-4 flex items-center justify-between gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2.5 text-sm font-semibold text-white/55 hover:text-white transition-colors"
            >
              {t('filters.reset')}
            </button>
            <button
              onClick={onApply}
              disabled={!hasChanges}
              className={`px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${hasChanges
                  ? 'bg-brand-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-brand-700'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
            >
              {t('filters.apply_filters')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
