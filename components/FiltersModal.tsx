'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { EventFilters, DateFilter, EventTypeFilter } from '@/lib/filters/types'
import { CATEGORIES, getCitiesForCountry, getPriceSliderConfig, formatPriceForCountry, getSubdivisions, getLocationTypeLabel, hasSubdivisions } from '@/lib/filters/config'
import { buildPriceRangeFilter, countActiveFilters, filtersEqual, parsePriceRange } from '@/lib/filters/utils'
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
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  
  // Get country-specific options
  const cities = getCitiesForCountry(userCountry)
  // Slider bounds follow the country's currency: ~0–10,000 HTG, ~0–200 USD/CAD/EUR.
  const priceSlider = getPriceSliderConfig(userCountry)

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

    // Move focus into the dialog when it opens
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    return () => {
      window.clearTimeout(focusTimer)
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

  // ——— Price: one dual-thumb slider, plus a "free only" toggle a slider can't express.
  const isFreeOnly = draftFilters.price === 'free'
  const clampToTrack = (n: number) => Math.min(priceSlider.max, Math.max(priceSlider.min, n))

  // Where the two thumbs sit for the CURRENT value. Legacy chip values are shown
  // on the track (≤ threshold / threshold and up) so an old shared URL still
  // reads correctly; it only becomes a range once a thumb moves.
  const [minPrice, maxPrice] = ((): [number, number] => {
    const custom = parsePriceRange(draftFilters.price)
    if (custom) {
      return [clampToTrack(custom.min), custom.max === undefined ? priceSlider.max : clampToTrack(custom.max)]
    }
    if (draftFilters.price === '<=500') return [priceSlider.min, clampToTrack(priceSlider.threshold)]
    if (draftFilters.price === '>500') return [clampToTrack(priceSlider.threshold), priceSlider.max]
    return [priceSlider.min, priceSlider.max]
  })()

  const topThumbParked = maxPrice >= priceSlider.max
  const priceMoney = (amount: number) => formatPriceForCountry(amount, userCountry)
  const andUp = (amount: number) =>
    t('filters.price_and_up', { price: priceMoney(amount), defaultValue: '{{price}} and up' })

  const priceReadout = isFreeOnly
    ? t('common.free_label', { defaultValue: 'Free' })
    : minPrice <= priceSlider.min && topThumbParked
      ? t('filters.any_price', { defaultValue: 'Any price' })
      : topThumbParked
        ? andUp(minPrice)
        : `${priceMoney(minPrice)} – ${priceMoney(maxPrice)}`

  // Thumbs stay a step apart so they can never cross (and never coincide, which
  // would make one of them unreachable by pointer).
  const commitPriceRange = (min: number, max: number) => {
    onDraftChange({ ...draftFilters, price: buildPriceRangeFilter(min, max, priceSlider.max) })
  }
  const handleMinPriceChange = (value: number) => {
    commitPriceRange(clampToTrack(Math.min(value, maxPrice - priceSlider.step)), maxPrice)
  }
  const handleMaxPriceChange = (value: number) => {
    commitPriceRange(minPrice, clampToTrack(Math.max(value, minPrice + priceSlider.step)))
  }

  const span = priceSlider.max - priceSlider.min || 1
  const fillLeft = ((minPrice - priceSlider.min) / span) * 100
  const fillWidth = ((maxPrice - minPrice) / span) * 100

  // Layered native ranges: the input body is click-through, only the thumb takes
  // the pointer, so both thumbs are draggable and each stays keyboard-operable.
  const rangeInputClass = [
    'absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent',
    'pointer-events-none disabled:cursor-not-allowed focus:outline-none',
    '[&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent',
    '[&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent',
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
    '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
    '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/40 [&::-webkit-slider-thumb]:bg-brand-400',
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
    '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full',
    '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/40 [&::-moz-range-thumb]:bg-brand-400',
    // Visible keyboard focus, drawn on the thumb itself.
    '[&:focus-visible::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(45,212,191,0.35)]',
    '[&:focus-visible::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(45,212,191,0.35)]',
  ].join(' ')

  // The max input is painted last, so its thumb would sit on top of the min one
  // once the two are adjacent. Lift the min input above it in the top half of
  // the track, where the collision happens, so both thumbs stay grabbable.
  const minRangeZ = minPrice >= priceSlider.min + span / 2 ? 'z-20' : 'z-10'

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
          role="dialog"
          aria-modal="true"
          aria-labelledby="filters-modal-title"
          className="pointer-events-auto bg-white/[0.03] w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[600px] rounded-t-3xl md:rounded-3xl shadow-poster md:border md:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-10">
            <div className="flex items-baseline gap-2.5">
              <h2 id="filters-modal-title" className="font-display text-2xl leading-none text-white">{t('filters.filters')}</h2>
              {activeCount > 0 && (
                <span className="eyebrow text-[11px] text-brand-400">{activeCount} {t('filters.active')}</span>
              )}
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label={t('common.close', { defaultValue: 'Close' })}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Date Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/70">{t('filters.date')}</label>
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
                  className="w-full rounded-xl border border-white/15 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
              )}
            </div>

            {/* Event Type - Segmented Control */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/70">{t('filters.event_type')}</label>
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                {EVENT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onDraftChange({ ...draftFilters, eventType: option.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                      ${draftFilters.eventType === option.value
                        ? 'bg-white/15 text-brand-300 shadow-sm'
                        : 'text-white/70 hover:text-white'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter — dual-thumb range, currency-aware */}
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="eyebrow text-[11px] text-white/70">{t('filters.price')}</span>
                <span aria-live="polite" className="text-sm font-medium tabular-nums text-white">
                  {priceReadout}
                </span>
              </div>

              <div
                className={`rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-3 pt-4 transition-opacity ${
                  isFreeOnly ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="relative h-6">
                  {/* Track */}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/[0.12]" />
                  {/* Selected portion */}
                  <div
                    className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-brand-400"
                    style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                  />
                  <input
                    type="range"
                    min={priceSlider.min}
                    max={priceSlider.max}
                    step={priceSlider.step}
                    value={minPrice}
                    disabled={isFreeOnly}
                    onChange={(e) => handleMinPriceChange(Number(e.target.value))}
                    aria-label={t('filters.price_min', { defaultValue: 'Minimum price' })}
                    aria-valuetext={priceMoney(minPrice)}
                    className={`${rangeInputClass} ${minRangeZ}`}
                  />
                  <input
                    type="range"
                    min={priceSlider.min}
                    max={priceSlider.max}
                    step={priceSlider.step}
                    value={maxPrice}
                    disabled={isFreeOnly}
                    onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
                    aria-label={t('filters.price_max', { defaultValue: 'Maximum price' })}
                    aria-valuetext={topThumbParked ? andUp(priceSlider.max) : priceMoney(maxPrice)}
                    className={`${rangeInputClass} z-10`}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between text-[11px] tabular-nums text-white/40">
                  <span>{priceMoney(priceSlider.min)}</span>
                  <span>{andUp(priceSlider.max)}</span>
                </div>
              </div>

              {/* A slider can't say "free": free is a point, not a span. */}
              <FilterChip
                label={t('filters.free_only', { defaultValue: 'Free only' })}
                active={isFreeOnly}
                onClick={() => onDraftChange({ ...draftFilters, price: isFreeOnly ? 'any' : 'free' })}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <label className="eyebrow text-[11px] text-white/70">{t('filters.categories')}</label>
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
              <label className="eyebrow text-[11px] text-white/70">{t('filters.location')}</label>
              <div className="space-y-3">
                {/* City Dropdown */}
                <select
                  value={draftFilters.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full rounded-xl border border-white/15 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                >
                  <option value="">{t('filters.all_cities')}</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {/* Commune/Neighborhood Dropdown */}
                {hasLocation && (
                  <div className="space-y-2">
                    <label className="eyebrow text-[10px] text-white/70">{locationLabel}</label>
                    <select
                      value={draftFilters.commune || ''}
                      onChange={(e) => handleCommuneChange(e.target.value)}
                      className="w-full rounded-xl border border-white/15 text-white [color-scheme:dark] px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                    >
                      <option value="">{t('filters.all_areas')}</option>
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
              className="px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white transition-colors"
            >
              {t('filters.reset')}
            </button>
            <button
              onClick={onApply}
              disabled={!hasChanges}
              className={`px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${hasChanges
                  ? 'bg-brand-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-brand-700'
                  : 'text-white/40 cursor-not-allowed'
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
