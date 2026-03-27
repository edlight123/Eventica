import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { notFound } from 'next/navigation'
import OrganizerProfileClient from './OrganizerProfileClient'
import type { Metadata } from 'next'

export const runtime = 'nodejs'
export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ organizerId: string }> }): Promise<Metadata> {
  const { organizerId } = await params
  
  const supabase = await createClient()
  const { data: organizer } = await supabase
    .from('users')
    .select('full_name, is_verified')
    .eq('id', organizerId)
    .single()

  if (!organizer) {
    return {
      title: 'Organizer Not Found',
    }
  }

  return {
    title: `${organizer.full_name} | Eventica Organizer`,
    description: `View all events organized by ${organizer.full_name} on Eventica`,
  }
}

export default async function OrganizerProfilePage({ params }: { params: Promise<{ organizerId: string }> }) {
  const user = await getCurrentUser()
  const { organizerId } = await params
  
  const supabase = await createClient()
  
  // Fetch organizer info
  const { data: organizer } = await supabase
    .from('users')
    .select('id, full_name, email, is_verified, created_at')
    .eq('id', organizerId)
    .single()

  if (!organizer) {
    notFound()
  }

  // Fetch organizer's events
  const now = new Date().toISOString()
  console.log('=== ORGANIZER PROFILE QUERIES ===')
  console.log('Organizer ID:', organizerId)
  console.log('Current time:', now)
  
  // Fetch all events by this organizer, then filter in memory to avoid needing complex indexes
  const { data: allOrganizerEvents, error: allEventsError } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)

  console.log('All organizer events:', { count: allOrganizerEvents?.length, error: allEventsError })

  // Filter upcoming and past events in memory
  const upcomingEventsRaw = allOrganizerEvents?.filter((event: any) => 
    event.is_published && event.start_datetime >= now
  ).sort((a: any, b: any) => a.start_datetime.localeCompare(b.start_datetime))

  const pastEventsRaw = allOrganizerEvents?.filter((event: any) => 
    event.is_published && event.start_datetime < now
  ).sort((a: any, b: any) => b.start_datetime.localeCompare(a.start_datetime)).slice(0, 6)

  console.log('Upcoming events result:', { count: upcomingEventsRaw?.length })
  if (upcomingEventsRaw?.length) {
    console.log('First upcoming event:', upcomingEventsRaw[0])
  }

  console.log('Past events result:', { count: pastEventsRaw?.length })
  
  // Also check ALL events for this organizer (no date filter)
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
  
  console.log('Total events for organizer (any date):', allEvents?.length)
  if (allEvents?.length) {
    console.log('Sample event dates:', allEvents.slice(0, 3).map((e: any) => ({ title: e.title, start: e.start_datetime })))
  }

  // Add organizer info to each event
  const upcomingEvents = upcomingEventsRaw?.map((event: any) => ({
    ...event,
    users: {
      full_name: organizer.full_name,
      is_verified: organizer.is_verified
    }
  }))

  const pastEvents = pastEventsRaw?.map((event: any) => ({
    ...event,
    users: {
      full_name: organizer.full_name,
      is_verified: organizer.is_verified
    }
  }))

  // Count followers
  const { data: followersData } = await supabase
    .from('organizer_follows')
    .select('id')
    .eq('organizer_id', organizerId)
  
  const followerCount = followersData?.length || 0

  // Count total events
  const { data: eventsCountData } = await supabase
    .from('events')
    .select('id')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)
  
  const totalEvents = eventsCountData?.length || 0

  // Count total tickets sold across all organizer's events
  const { data: ticketStats } = await supabase
    .from('events')
    .select('tickets_sold')
    .eq('organizer_id', organizerId)
    .eq('is_published', true)

  const totalTicketsSold = ticketStats?.reduce((sum: number, event: any) => sum + (event.tickets_sold || 0), 0) || 0

  // Check if current user is following this organizer
  let isFollowing = false
  if (user) {
    const { data: followData } = await supabase
      .from('organizer_follows')
      .select('id')
      .eq('organizer_id', organizerId)
      .eq('follower_id', user.id)
      .single()
    
    isFollowing = !!followData
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <OrganizerProfileClient
        organizer={organizer}
        upcomingEvents={upcomingEvents || []}
        pastEvents={pastEvents || []}
        followerCount={followerCount}
        totalEvents={totalEvents}
        totalTicketsSold={totalTicketsSold}
        isFollowing={isFollowing}
        userId={user?.id}
      />

      <MobileNavWrapper user={user} />
    </div>
  )
}
