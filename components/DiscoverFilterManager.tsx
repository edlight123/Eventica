'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DiscoverTopBar } from './discover/DiscoverTopBar'
import { DiscoverFilterChipsStrip } from './discover/DiscoverFilterChipsStrip'
import { FiltersModal } from './FiltersModal'
import { FilterChipsRow } from './FilterChipsRow'
import type { EventFilters, DEFAULT_FILTERS } from '@/lib/filters/types'
import { parseFiltersFromURL, serializeFilters, resetFilters, countActiveFilters } from '@/lib/filters/utils'

interface DiscoverFilterManagerProps {
  userCountry?: string
}

export function DiscoverFilterManager({ userCountry = 'HT' }: DiscoverFilterManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse filters from URL
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(() => 
    parseFiltersFromURL(searchParams ?? new URLSearchParams())
  )
  const [draftFilters, setDraftFilters] = useState<EventFilters>(appliedFilters)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const handleOpenFilters = () => {
    setDraftFilters(appliedFilters)
    setIsModalOpen(true)
  }
  
  const handleCloseFilters = () => {
    setDraftFilters(appliedFilters)
    setIsModalOpen(false)
  }
  
  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters)
    setIsModalOpen(false)
    
    const params = serializeFilters(draftFilters)
    const newUrl = params.toString() ? `/discover?${params.toString()}` : '/discover'
    router.push(newUrl, { scroll: false })
  }
  
  const handleResetFilters = () => {
    const reset = resetFilters()
    setDraftFilters(reset)
    setAppliedFilters(reset)
    setIsModalOpen(false)
    router.push('/discover', { scroll: false })
  }
  
  const handleRemoveFilter = (key: keyof EventFilters, value?: string) => {
    let updated = { ...appliedFilters }
    
    switch (key) {
      case 'date':
        updated.date = 'any'
        updated.pickedDate = undefined
        break
      case 'city':
        updated.city = ''
        updated.commune = undefined
        break
      case 'commune':
        updated.commune = undefined
        break
      case 'categories':
        if (value) {
          updated.categories = updated.categories.filter(c => c !== value)
        }
        break
      case 'price':
        updated.price = 'any'
        break
      case 'eventType':
        updated.eventType = 'all'
        break
    }
    
    setAppliedFilters(updated)
    setDraftFilters(updated)
    
    const params = serializeFilters(updated)
    const newUrl = params.toString() ? `/discover?${params.toString()}` : '/discover'
    router.push(newUrl, { scroll: false })
  }
  
  const handleClearAll = () => {
    handleResetFilters()
  }
  
  const hasActiveFilters = countActiveFilters(appliedFilters) > 0
  
  return (
    <>
      {/* Sticky discover header: search + location + always-reachable quick filters.
          Pins directly below the navbar (h-14 / sm:h-16). */}
      <div className="sticky top-14 sm:top-16 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10 shadow-sm">
        <DiscoverTopBar
          filters={appliedFilters}
          onOpenFilters={handleOpenFilters}
          userCountry={userCountry}
        />
        <DiscoverFilterChipsStrip
          currentDate={appliedFilters.date}
          selectedCategories={appliedFilters.categories}
        />
      </div>
      
      {hasActiveFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FilterChipsRow
            filters={appliedFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />
        </div>
      )}
      
      <FiltersModal
        isOpen={isModalOpen}
        draftFilters={draftFilters}
        appliedFilters={appliedFilters}
        onClose={handleCloseFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        onDraftChange={setDraftFilters}
        userCountry={userCountry}
      />
    </>
  )
}
