'use client'

import { useState } from 'react'

interface SearchFiltersProps {
  onSearch: (query: string) => void
  onFilterChange: (filters: FilterOptions) => void
}

export interface FilterOptions {
  category?: string
  city?: string
  minPrice?: number
  maxPrice?: number
  startDate?: string
  endDate?: string
  sortBy?: 'date' | 'price_low' | 'price_high' | 'popular'
}

const CATEGORIES = ['All', 'Concert', 'Party', 'Conference', 'Festival', 'Workshop', 'Sports', 'Theater', 'Other']
const CITIES = ['All', 'Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Les Cayes', 'Jacmel', 'Port-de-Paix', 'Jérémie', 'Saint-Marc']

export default function SearchFilters({ onSearch, onFilterChange }: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'All',
    city: 'All',
    sortBy: 'date',
  })

  function handleFilterChange(key: keyof FilterOptions, value: any) {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Clean up "All" selections
    const cleanFilters: FilterOptions = {}
    if (newFilters.category && newFilters.category !== 'All') cleanFilters.category = newFilters.category
    if (newFilters.city && newFilters.city !== 'All') cleanFilters.city = newFilters.city
    if (newFilters.minPrice) cleanFilters.minPrice = newFilters.minPrice
    if (newFilters.maxPrice) cleanFilters.maxPrice = newFilters.maxPrice
    if (newFilters.startDate) cleanFilters.startDate = newFilters.startDate
    if (newFilters.endDate) cleanFilters.endDate = newFilters.endDate
    if (newFilters.sortBy) cleanFilters.sortBy = newFilters.sortBy
    
    onFilterChange(cleanFilters)
  }

  function clearFilters() {
    const defaultFilters = {
      category: 'All',
      city: 'All',
      sortBy: 'date' as const,
    }
    setFilters(defaultFilters)
    onFilterChange({ sortBy: 'date' })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search events by name or venue..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center space-x-2 text-teal-700 font-medium hover:text-teal-800 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            >
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
            >
              <option value="date">Date (Newest First)</option>
              <option value="price_low">Price (Low to High)</option>
              <option value="price_high">Price (High to Low)</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="md:col-span-2 lg:col-span-4">
            <button
              onClick={clearFilters}
              className="text-sm text-teal-700 hover:text-teal-800 font-medium"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
