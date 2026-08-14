'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Search, MapPin, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { getCitiesForCountry, getSubdivisions, getLocationTypeLabel, hasSubdivisions } from '@/lib/filters/config'
import { countActiveFilters } from '@/lib/filters/utils'
import type { EventFilters } from '@/lib/filters/types'

interface DiscoverTopBarProps {
  filters: EventFilters
  onOpenFilters: () => void
  userCountry?: string
}

export function DiscoverTopBar({ filters, onOpenFilters, userCountry = 'HT' }: DiscoverTopBarProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [showSubareaDropdown, setShowSubareaDropdown] = useState(false)
  
  // Get country-specific cities
  const cities = getCitiesForCountry(userCountry)

  const activeFiltersCount = countActiveFilters(filters)
  const subdivisions = filters.city ? getSubdivisions(filters.city, userCountry) : []
  const locationLabel = filters.city ? getLocationTypeLabel(filters.city, userCountry) : ''
  const hasLocation = hasSubdivisions(filters.city, userCountry)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim())
    } else {
      params.delete('search')
    }
    router.push(`/discover?${params.toString()}`, { scroll: false })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Clear search if empty
    if (!value.trim()) {
      const params = new URLSearchParams(searchParams)
      params.delete('search')
      router.push(`/discover?${params.toString()}`, { scroll: false })
    }
  }

  const handleCitySelect = (city: string) => {
    const params = new URLSearchParams(searchParams)
    if (city) {
      params.set('city', city)
      params.delete('commune')
    } else {
      params.delete('city')
      params.delete('commune')
    }
    router.push(`?${params.toString()}`)
    setShowCityDropdown(false)
  }

  const handleSubareaSelect = (subarea: string) => {
    const params = new URLSearchParams(searchParams)
    if (subarea) {
      params.set('commune', subarea)
    } else {
      params.delete('commune')
    }
    router.push(`?${params.toString()}`)
    setShowSubareaDropdown(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2">
      <div className="flex items-center gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t('filters.search_placeholder')}
                className="w-full pl-10 pr-4 py-2.5 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent text-sm"
              />
            </div>
          </form>

          {/* Location Pills */}
          <div className="hidden md:flex items-center gap-2">
            {/* City Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCityDropdown(!showCityDropdown)}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-white/15 rounded-full text-sm font-medium text-white/80 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                {filters.city || t('filters.all_cities')}
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCityDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowCityDropdown(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] rounded-lg shadow-xl  py-1 min-w-[180px] z-20">
                    <button
                      onClick={() => handleCitySelect('')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white/80"
                    >
                      {t('filters.all_cities')}
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => handleCitySelect(city)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${
                          filters.city === city ? 'font-medium text-brand-300' : 'text-white/80'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Subarea Selector */}
            {hasLocation && (
              <div className="relative">
                <button
                  onClick={() => setShowSubareaDropdown(!showSubareaDropdown)}
                  className="flex items-center gap-1.5 px-4 py-2 hover:bg-white/15 rounded-full text-sm font-medium text-white/80 transition-colors"
                >
                  {filters.commune || `${t('filters.all_areas')} ${locationLabel.toLowerCase()}s`}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showSubareaDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowSubareaDropdown(false)}
                    />
                    <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] rounded-lg shadow-xl  py-1 min-w-[180px] z-20">
                      <button
                        onClick={() => handleSubareaSelect('')}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white/80"
                      >
                        {t('filters.all_areas')} {locationLabel.toLowerCase()}s
                      </button>
                      {subdivisions.map(subarea => (
                        <button
                          key={subarea}
                          onClick={() => handleSubareaSelect(subarea)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${
                            filters.commune === subarea ? 'font-medium text-brand-300' : 'text-white/80'
                          }`}
                        >
                          {subarea}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={onOpenFilters}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">{t('filters.filters')}</span>
            {activeFiltersCount > 0 && (
              <span className="bg-[#0a0a0a] text-brand-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
  )
}
