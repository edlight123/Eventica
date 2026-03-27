/**
 * Helper utilities for the Discover page
 */

import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns'
import type { Database } from '@/types/database'
import { isBudgetFriendlyTicketPrice } from '@/lib/pricing'

type Event = Database['public']['Tables']['events']['Row']

/**
 * Format event date/time for display
 */
export function formatEventDate(datetime: string): string {
  const date = parseISO(datetime)
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  }
  
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  }
  
  if (isThisWeek(date)) {
    return format(date, 'EEEE \'at\' h:mm a')
  }
  
  return format(date, 'MMM d \'at\' h:mm a')
}

/**
 * Get price label for display
 */
export function getPriceLabel(price: number, currency?: string): string {
  const curr = currency || 'HTG'
  if (!price || price === 0) return 'Free'
  const formattedPrice = price.toLocaleString()
  if (price <= 500) return `From ${formattedPrice} ${curr}`
  return `From ${formattedPrice} ${curr}`
}

/**
 * Get location summary (City • Subarea)
 */
export function getLocationSummary(city: string, commune?: string): string {
  if (commune && commune !== city) {
    return `${city} • ${commune}`
  }
  return city
}

/**
 * Check if event is online based on venue name
 */
export function isOnlineEvent(venueName: string): boolean {
  const onlineKeywords = ['online', 'virtual', 'zoom', 'livestream', 'webinar', 'remote']
  return onlineKeywords.some(keyword => 
    venueName.toLowerCase().includes(keyword)
  )
}

/**
 * Get event cue/badge (Popular, Few tickets left, etc.)
 */
export function getEventCue(event: Event): { label: string; variant: 'popular' | 'warning' | 'verified' } | null {
  // Popular: More than 50% tickets sold and at least 20 tickets
  if (event.tickets_sold && event.total_tickets) {
    const soldPercentage = (event.tickets_sold / event.total_tickets) * 100
    
    if (soldPercentage >= 90) {
      return { label: 'Few tickets left', variant: 'warning' }
    }
    
    if (event.tickets_sold >= 20 && soldPercentage >= 50) {
      return { label: 'Popular', variant: 'popular' }
    }
  }
  
  // Verified organizer (if users relation is included)
  // Note: This would require the event to have users relation loaded
  // For now, we'll skip this and let the component handle it
  
  return null
}

/**
 * Bookmark storage utilities (localStorage)
 */
const BOOKMARKS_KEY = 'eventica_bookmarks'

export function getBookmarkedEvents(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function isEventBookmarked(eventId: string): boolean {
  return getBookmarkedEvents().includes(eventId)
}

export function toggleBookmark(eventId: string): boolean {
  const bookmarks = getBookmarkedEvents()
  const isBookmarked = bookmarks.includes(eventId)
  
  let updated: string[]
  if (isBookmarked) {
    updated = bookmarks.filter(id => id !== eventId)
  } else {
    updated = [...bookmarks, eventId]
  }
  
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
    return !isBookmarked
  } catch {
    return isBookmarked
  }
}

/**
 * Filter events by criteria
 */
export function filterEventsByPrice(events: Event[], maxPrice: number): Event[] {
  // Legacy API: used for the "Free & Budget Friendly" section.
  // Keep the callsite signature but interpret 500 as the "cheap" threshold:
  // HTG <= 500 OR USD <= 5 (and always include free).
  if (maxPrice === 500) {
    return events.filter((e: any) => isBudgetFriendlyTicketPrice(e?.ticket_price, e?.currency))
  }

  return events.filter(e => e.ticket_price <= maxPrice)
}

export function filterFreeEvents(events: Event[]): Event[] {
  return events.filter(e => e.ticket_price === 0)
}

export function filterOnlineEvents(events: Event[]): Event[] {
  return events.filter(e => isOnlineEvent(e.venue_name))
}

export function filterEventsByCountry(events: Event[], country: string): Event[] {
  return events.filter(e => e.country === country)
}

export function filterEventsByLocation(events: Event[], city: string, commune?: string): Event[] {
  let filtered = events.filter(e => e.city === city)
  if (commune) {
    filtered = filtered.filter(e => e.commune === commune)
  }
  return filtered
}

/**
 * Get upcoming events (happening soon)
 */
export function getUpcomingEvents(events: Event[], limit: number = 8): Event[] {
  const now = new Date()
  return events
    .filter(e => new Date(e.start_datetime) > now)
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(0, limit)
}

/**
 * Get featured events (most popular/highest tickets sold)
 */
export function getFeaturedEvents(events: Event[], limit: number = 6): Event[] {
  return events
    .filter(e => (e.tickets_sold || 0) > 0)
    .sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
    .slice(0, limit)
}

/**
 * Sort events with default Discover rules:
 * 1. Featured events (high ticket sales) first
 * 2. Then by soonest event date
 * 3. Then by newest created_at
 */
export function sortEventsDefault(events: Event[]): Event[] {
  return events.sort((a, b) => {
    // Featured first (>20 tickets sold or >50% sold)
    const aFeatured = (a.tickets_sold || 0) >= 20 || 
                      ((a.tickets_sold || 0) / a.total_tickets) >= 0.5
    const bFeatured = (b.tickets_sold || 0) >= 20 || 
                      ((b.tickets_sold || 0) / b.total_tickets) >= 0.5
    
    if (aFeatured && !bFeatured) return -1
    if (!aFeatured && bFeatured) return 1
    
    // Then by soonest event date
    const dateA = new Date(a.start_datetime).getTime()
    const dateB = new Date(b.start_datetime).getTime()
    if (dateA !== dateB) return dateA - dateB
    
    // Then by newest created
    const createdA = new Date(a.created_at).getTime()
    const createdB = new Date(b.created_at).getTime()
    return createdB - createdA
  })
}

/**
 * Sort events strictly by date ascending
 */
export function sortEventsByDate(events: Event[]): Event[] {
  return events.sort((a, b) => 
    new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  )
}
