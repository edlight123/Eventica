'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import EventSearchFilters from './EventSearchFilters'
import { FiltersModal } from './FiltersModal'
import { FilterChipsRow } from './FilterChipsRow'
import { EventFilters, DEFAULT_FILTERS } from '@/lib/filters/types'
import { parseFiltersFromURL, serializeFilters, resetFilters, countActiveFilters } from '@/lib/filters/utils'

interface FilterManagerProps {
  userCountry?: string
}

export default function FilterManager({ userCountry = 'HT' }: FilterManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse initial filters from URL
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(() => 
    parseFiltersFromURL(searchParams)
  )
  const [draftFilters, setDraftFilters] = useState<EventFilters>(appliedFilters)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const handleOpenFilters = () => {
    // Reset draft to current applied filters when opening
    setDraftFilters(appliedFilters)
    setIsModalOpen(true)
  }
  
  const handleCloseFilters = () => {
    // Discard draft changes
    setDraftFilters(appliedFilters)
    setIsModalOpen(false)
  }
  
  const handleApplyFilters = () => {
    // Apply draft filters
    setAppliedFilters(draftFilters)
    setIsModalOpen(false)
    
    // Update URL
    const params = serializeFilters(draftFilters)
    const newUrl = params.toString() ? `?${params.toString()}` : '/'
    router.push(newUrl, { scroll: false })
  }
  
  const handleResetFilters = () => {
    const reset = resetFilters()
    setDraftFilters(reset)
    setAppliedFilters(reset)
    setIsModalOpen(false)
    router.push('/', { scroll: false })
  }
  
  const handleRemoveFilter = (key: keyof EventFilters, value?: string) => {
    let updated = { ...appliedFilters }
    
    switch (key) {
      case 'date':
        updated.date = DEFAULT_FILTERS.date
        updated.pickedDate = undefined
        break
      case 'city':
        updated.city = DEFAULT_FILTERS.city
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
        updated.price = DEFAULT_FILTERS.price
        break
      case 'eventType':
        updated.eventType = DEFAULT_FILTERS.eventType
        break
    }
    
    setAppliedFilters(updated)
    setDraftFilters(updated)
    
    // Update URL
    const params = serializeFilters(updated)
    const newUrl = params.toString() ? `?${params.toString()}` : '/'
    router.push(newUrl, { scroll: false })
  }
  
  const handleClearAll = () => {
    handleResetFilters()
  }
  
  const hasActiveFilters = countActiveFilters(appliedFilters) > 0
  
  return (
    <>
      <EventSearchFilters 
        filters={appliedFilters}
        onOpenFilters={handleOpenFilters}
      />
      
      {hasActiveFilters && (
        <div className="mb-6">
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
