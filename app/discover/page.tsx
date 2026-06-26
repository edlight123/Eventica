// Event Discovery Page
// Optimized with data layer caching and efficient queries
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { isAdmin } from '@/lib/admin'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'
import { parseFiltersFromURL } from '@/lib/filters/utils'
import { applyFiltersAndSort } from '@/lib/filters/apply'
import { DiscoverFilterManager } from '@/components/DiscoverFilterManager'
import { DiscoverPageContent } from '@/components/discover/DiscoverPageContent'
import { DiscoverFilterBarSkeleton, DiscoverContentSkeleton } from '@/components/discover/DiscoverSkeleton'
import { LocationBannerWrapper } from '@/components/LocationBannerWrapper'
import { 
  getFeaturedEvents, 
  getUpcomingEvents, 
  filterFreeEvents, 
  filterEventsByPrice, 
  filterOnlineEvents,
  filterEventsByLocation,
  filterEventsByCountry,
  sortEventsDefault,
  sortEventsByDate
} from '@/lib/discover/helpers'
import { getDiscoverEvents } from '@/lib/data/events'
import { getUserProfileAdmin } from '@/lib/firestore/user-profile-admin'

// Revalidate every 30 seconds for discover page (frequently updated)
export const revalidate = 30

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()
  const params = await searchParams
  
  // Get user's default country for prioritization
  let userCountry = 'HT' // Default to Haiti
  let userCity = ''
  if (user?.id) {
    try {
      const profile = await getUserProfileAdmin(user.id)
      userCountry = profile?.defaultCountry || 'HT'
      userCity = profile?.defaultCity || ''
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }
  
  // Parse filters from URL
  const urlParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => urlParams.append(key, v))
      } else {
        urlParams.set(key, String(value))
      }
    }
  })
  const filters = parseFiltersFromURL(urlParams)
  
  let allEvents: any[] = []
  
  if (isDemoMode()) {
    allEvents = DEMO_EVENTS
  } else {
    // Use optimized data layer with 30s caching
    allEvents = await getDiscoverEvents(filters, 200)
  }

  // Apply filters and sort
  let filteredEvents = applyFiltersAndSort(allEvents, filters)

  // Filter out events that have definitively ended
  // Be lenient: show events that are ongoing or haven't started yet
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const notDefinitelyEnded = (event: any) => {
    const start = event?.start_datetime ? new Date(event.start_datetime) : null
    const end = event?.end_datetime ? new Date(event.end_datetime) : null

    // If event has an end time, check if it's passed
    if (end && !Number.isNaN(end.getTime())) {
      return end.getTime() >= now.getTime()
    }
    
    // If no end time but has start, show if started within last week (could be ongoing)
    // or hasn't started yet
    if (start && !Number.isNaN(start.getTime())) {
      return start.getTime() >= oneWeekAgo.getTime()
    }
    
    // If no valid dates, show it anyway
    return true
  }

  filteredEvents = filteredEvents.filter(notDefinitelyEnded)
  
  // STRICT country filtering - ONLY show events from user's country
  // Events without a country field are assumed to be in Haiti (HT)
  filteredEvents = filteredEvents.filter(e => {
    const eventCountry = e.country || 'HT' // Default to Haiti if no country set
    return eventCountry === userCountry
  })
  
  // Apply search filter
  const searchQuery = params.search as string | undefined
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim()
    filteredEvents = filteredEvents.filter(event => 
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    )
  }
  
  // Apply sorting rules
  if (filters.sortBy === 'date') {
    filteredEvents = sortEventsByDate(filteredEvents)
  } else {
    filteredEvents = sortEventsDefault(filteredEvents)
  }
  
  // Organize into sections
  const featuredEvents = getFeaturedEvents(filteredEvents, 6)
  const upcomingEvents = getUpcomingEvents(filteredEvents, 8)
  const freeEvents = filterFreeEvents(filteredEvents)
  const budgetEvents = filterEventsByPrice(filteredEvents, 500)
  const onlineEvents = filterOnlineEvents(filteredEvents)
  
  // Events from user's country (prioritized)
  const countryEvents = filterEventsByCountry(filteredEvents, userCountry)
  
  // Near you events (specific city + commune)
  const nearYouEvents = filters.city 
    ? filterEventsByLocation(allEvents, filters.city, filters.commune).filter(notDefinitelyEnded)
    : []

  const hasActiveFilters: boolean = filters.date !== 'any' || 
                          filters.city !== '' || 
                          filters.categories.length > 0 || 
                          filters.price !== 'any' || 
                          filters.eventType !== 'all' ||
                          (!!searchQuery && searchQuery.trim() !== '')

  // Serialize all event data before passing to client component
  const serializeData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj
    if (obj.toDate && typeof obj.toDate === 'function') return obj.toDate().toISOString()
    if (Array.isArray(obj)) return obj.map(serializeData)
    
    const serialized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeData(obj[key])
      }
    }
    return serialized
  }

  const serializedFeaturedEvents = serializeData(featuredEvents)
  const serializedUpcomingEvents = serializeData(upcomingEvents)
  const serializedCountryEvents = serializeData(countryEvents)
  const serializedNearYouEvents = serializeData(nearYouEvents)
  const serializedBudgetEvents = serializeData(budgetEvents)
  const serializedOnlineEvents = serializeData(onlineEvents)
  const serializedFilteredEvents = serializeData(filteredEvents)

  return (
    <div className="surface-dark min-h-screen pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      {/* Location Detection Banner */}
      <LocationBannerWrapper 
        userId={user?.id}
        currentCountry={userCountry}
        currentCity={userCity}
      />

      {/* Top Bar with Filter Manager (includes ActiveFiltersRow) */}
      <Suspense fallback={<DiscoverFilterBarSkeleton />}>
        <DiscoverFilterManager userCountry={userCountry} />
      </Suspense>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<DiscoverContentSkeleton />}>
          <DiscoverPageContent
            hasActiveFilters={hasActiveFilters}
            featuredEvents={serializedFeaturedEvents}
            upcomingEvents={serializedUpcomingEvents}
            countryEvents={serializedCountryEvents}
            nearYouEvents={serializedNearYouEvents}
            budgetEvents={serializedBudgetEvents}
            onlineEvents={serializedOnlineEvents}
            filteredEvents={serializedFilteredEvents}
            city={filters.city}
            commune={filters.commune}
            userCountry={userCountry}
          />
        </Suspense>
      </div>

      <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
    </div>
  )
}
