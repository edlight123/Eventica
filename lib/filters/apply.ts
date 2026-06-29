/**
 * Apply filters to event list
 */

import { EventFilters } from './types'
import { getDateRange, getPriceRange } from './utils'
import { normalizeEventCategory } from './config'
import { isBudgetFriendlyTicketPrice, isOverBudgetTicketPrice } from '@/lib/pricing'

// Use the actual database event type structure
type Event = any // Will match Database['public']['Tables']['events']['Row']

/**
 * Filter events based on filter criteria
 */
export function filterEvents(events: Event[], filters: EventFilters): Event[] {
  let filtered = [...events]
  
  // Debug: Log all events being filtered
  if (process.env.NODE_ENV === 'development') {
    console.log('=== FILTER DEBUG ===')
    console.log('Total events to filter:', events.length)
    console.log('Filter settings:', filters)
    if (events.length > 0) {
      console.log('Sample event dates:', events.slice(0, 5).map(e => ({
        title: e.title,
        start_datetime: e.start_datetime
      })))
    }
  }
  
  // Date filter
  if (filters.date !== 'any') {
    const { start, end } = getDateRange(filters.date, filters.pickedDate)
    if (start || end) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.start_datetime)
        
        // For single day filters (like pick-date), compare just the date parts
        if (start && end && filters.date === 'pick-date') {
          // Normalize both dates to YYYY-MM-DD strings for comparison to avoid timezone issues
          const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`
          const filterDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Date Filter Debug:', {
              eventTitle: event.title,
              eventStartDateTime: event.start_datetime,
              eventDateStr,
              filterDateStr,
              pickedDate: filters.pickedDate,
              match: eventDateStr === filterDateStr
            })
          }
          
          return eventDateStr === filterDateStr
        }
        
        // For other filters, use time-based comparison
        const eventTime = eventDate.getTime()
        if (start && eventTime < start.getTime()) return false
        if (end && eventTime > end.getTime()) return false
        return true
      })
    }
  }
  
  // City filter
  if (filters.city) {
    filtered = filtered.filter(event => event.city === filters.city)
  }
  
  // Commune filter
  if (filters.commune) {
    filtered = filtered.filter(event => event.commune === filters.commune)
  }
  
  // Category filter
  if (filters.categories.length > 0) {
    // Normalize both sides so legacy / mixed-case event categories still match
    // the canonical filter chips.
    const selected = new Set(filters.categories.map((c) => normalizeEventCategory(c)))
    filtered = filtered.filter((event) => selected.has(normalizeEventCategory(event.category)))
  }
  
  // Price filter
  if (filters.price !== 'any') {
    if (filters.price === '<=500') {
      filtered = filtered.filter((event) => isBudgetFriendlyTicketPrice(event?.ticket_price, event?.currency))
    } else if (filters.price === '>500') {
      filtered = filtered.filter((event) => isOverBudgetTicketPrice(event?.ticket_price, event?.currency))
    } else {
      const { min, max } = getPriceRange(filters.price)
      filtered = filtered.filter(event => {
        const price = event.ticket_price || 0
        if (min !== undefined && price < min) return false
        if (max !== undefined && price > max) return false
        return true
      })
    }
  }
  
  // Event type filter
  // Note: is_online field needs to be added to database schema
  // For now, we check if venue_name contains "online" or "virtual"
  if (filters.eventType !== 'all') {
    filtered = filtered.filter(event => {
      const isOnline = event.venue_name?.toLowerCase().includes('online') || 
                      event.venue_name?.toLowerCase().includes('virtual') ||
                      event.commune?.toLowerCase() === 'virtual'
      
      if (filters.eventType === 'online') return isOnline
      if (filters.eventType === 'in-person') return !isOnline
      return true
    })
  }
  
  return filtered
}

/**
 * Sort events based on sort option
 */
export function sortEvents(events: Event[], sortBy: EventFilters['sortBy']): Event[] {
  const sorted = [...events]
  
  if (sortBy === 'date') {
    // Sort by date ascending (soonest first)
    sorted.sort((a, b) => 
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    )
  } else if (sortBy === 'relevance') {
    // Relevance: featured first, then soonest date, then newest created
    sorted.sort((a, b) => {
      // Featured events first
      const aFeatured = a.is_featured ? 1 : 0
      const bFeatured = b.is_featured ? 1 : 0
      if (aFeatured !== bFeatured) return bFeatured - aFeatured
      
      // Then by soonest event date
      const dateCompare = new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      if (dateCompare !== 0) return dateCompare
      
      // Finally by newest created
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      
      return 0
    })
  }
  
  return sorted
}

/**
 * Apply filters and sort to events
 */
export function applyFiltersAndSort(events: Event[], filters: EventFilters): Event[] {
  const filtered = filterEvents(events, filters)
  return sortEvents(filtered, filters.sortBy)
}
