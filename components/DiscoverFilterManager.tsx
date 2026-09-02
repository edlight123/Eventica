'use client'

import React, { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DiscoverTopBar } from './discover/DiscoverTopBar'
import { DiscoverFilterChipsStrip } from './discover/DiscoverFilterChipsStrip'
import { FiltersModal } from './FiltersModal'
import { FilterChipsRow } from './FilterChipsRow'
import type { EventFilters, DEFAULT_FILTERS } from '@/lib/filters/types'
import { parseFiltersFromURL, serializeFilters, resetFilters, countActiveFilters } from '@/lib/filters/utils'
import { useHeaderCollapse } from '@/lib/hooks/useHeaderCollapse'

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

  // The sticky header sheds its SECONDARY controls as the reader moves down the
  // feed and restores them the moment they scroll back up. Search and the
  // filter button never leave — they are the primary actions on this page.
  const headerRef = useRef<HTMLDivElement>(null)
  const collapsed = useHeaderCollapse(headerRef)
  
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
      {/* Same translucency as the navbar above (which renders `flush` on this
          page), so the two bars read as ONE header band with this single rule
          at its bottom edge. */}
      <div
        ref={headerRef}
        data-collapsed={collapsed ? 'true' : 'false'}
        className="sticky top-14 sm:top-16 z-40 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl"
      >
        <DiscoverTopBar
          filters={appliedFilters}
          onOpenFilters={handleOpenFilters}
          userCountry={userCountry}
        />
        {/* The quick-filter strip is what collapses: it is the tallest
            secondary element, so it reclaims the most feed. Grid-rows is the
            animatable way to collapse to nothing without hard-coding a height
            (the strip's own height varies with the chip set). */}
        <div
          className={`grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            collapsed
              ? 'pointer-events-none grid-rows-[0fr] opacity-0'
              : 'grid-rows-[1fr] opacity-100'
          }`}
          aria-hidden={collapsed}
        >
          <div className="overflow-hidden">
            <DiscoverFilterChipsStrip
              currentDate={appliedFilters.date}
              selectedCategories={appliedFilters.categories}
            />
          </div>
        </div>
      </div>
      
      {hasActiveFilters && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <FilterChipsRow
            filters={appliedFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
            userCountry={userCountry}
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
