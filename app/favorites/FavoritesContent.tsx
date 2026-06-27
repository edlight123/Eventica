'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'
import PullToRefresh from '@/components/PullToRefresh'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { EditorialHeader } from '@/components/ui/EditorialHeader'
import type { Database } from '@/types/database'
import { Heart, TrendingUp } from 'lucide-react'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, documentId } from 'firebase/firestore'

type Event = Database['public']['Tables']['events']['Row']

interface FavoritesContentProps {
  userId: string
}

export default function FavoritesContent({ userId }: FavoritesContentProps) {
  const { t } = useTranslation('favorites')
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    try {
      console.log('=== FAVORITES PAGE QUERY ===')
      console.log('User ID:', userId)
      
      // First, get the event IDs from favorites
      const favoritesRef = collection(db, 'event_favorites')
      const favoritesQuery = query(favoritesRef, where('user_id', '==', userId))
      const favoritesSnapshot = await getDocs(favoritesQuery)
      
      console.log('Favorites query result:', { count: favoritesSnapshot.size })
      
      if (!favoritesSnapshot.empty) {
        const eventIds = favoritesSnapshot.docs.map(doc => doc.data().event_id)
        console.log('Favorite event IDs:', eventIds)
        
        if (eventIds.length === 0) {
          setFavoriteEvents([])
          return
        }
        
        // Firestore 'in' queries support up to 10 items, but let's batch to be safe
        // Also, some events might not exist anymore, so we handle that gracefully
        const batchSize = 10
        const eventBatches = []
        for (let i = 0; i < eventIds.length; i += batchSize) {
          eventBatches.push(eventIds.slice(i, i + batchSize))
        }
        
        const allEvents = []
        for (const batch of eventBatches) {
          const eventsRef = collection(db, 'events')
          const eventsQuery = query(
            eventsRef,
            where(documentId(), 'in', batch)
          )
          const eventsSnapshot = await getDocs(eventsQuery)
          allEvents.push(...eventsSnapshot.docs)
        }
        
        console.log('Events query result:', { count: allEvents.length })
        
        if (allEvents.length > 0) {
          // Batch fetch all organizers (instead of N+1 queries)
          const organizerIds = Array.from(new Set(
            allEvents.map(doc => doc.data().organizer_id).filter(Boolean)
          ))
          
          const organizersMap = new Map<string, any>()
          
          if (organizerIds.length > 0) {
            // Firestore 'in' queries support up to 10 items
            const orgBatchSize = 10
            const orgBatches = []
            for (let i = 0; i < organizerIds.length; i += orgBatchSize) {
              orgBatches.push(organizerIds.slice(i, i + orgBatchSize))
            }
            
            // Fetch all organizers in parallel batches
            const orgSnapshots = await Promise.all(
              orgBatches.map(batch => {
                const usersRef = collection(db, 'users')
                return getDocs(query(usersRef, where(documentId(), 'in', batch)))
              })
            )
            
            orgSnapshots.forEach(snapshot => {
              snapshot.docs.forEach(doc => {
                organizersMap.set(doc.id, doc.data())
              })
            })
          }
          
          // Map events with pre-fetched organizer data (no more N+1)
          const eventsWithOrganizers = allEvents.map((eventDoc) => {
            const eventData = eventDoc.data()
            const organizerData = organizersMap.get(eventData.organizer_id) || {
              full_name: 'Event Organizer',
              is_verified: false
            }
            
            return {
              id: eventDoc.id,
              title: eventData.title || '',
              description: eventData.description || '',
              start_datetime: eventData.start_datetime?.toDate?.().toISOString() || new Date().toISOString(),
              end_datetime: eventData.end_datetime?.toDate?.().toISOString() || new Date().toISOString(),
              venue_name: eventData.venue_name || '',
              address: eventData.address || '',
              country: eventData.country || 'HT',
              city: eventData.city || '',
              commune: eventData.commune || '',
              department: eventData.department || '',
              location: eventData.location || null,
              category: eventData.category || 'other',
              ticket_price: eventData.ticket_price || 0,
              currency: eventData.currency || 'HTG',
              total_tickets: eventData.total_tickets || 0,
              tickets_sold: eventData.tickets_sold || 0,
              image_url: eventData.image_url || null,
              banner_image_url: eventData.banner_image_url || eventData.image_url || null,
              organizer_id: eventData.organizer_id || '',
              is_published: eventData.is_published ?? true,
              tags: eventData.tags || [],
              created_at: eventData.created_at?.toDate?.().toISOString() || new Date().toISOString(),
              updated_at: eventData.updated_at?.toDate?.().toISOString() || new Date().toISOString(),
              users: {
                full_name: organizerData.full_name || 'Event Organizer',
                is_verified: organizerData.is_verified ?? false
              }
            } as Event
          })
          
          console.log('Final events with organizers:', eventsWithOrganizers.length)
          setFavoriteEvents(eventsWithOrganizers)
        } else {
          console.log('No events found for favorite IDs')
          setFavoriteEvents([])
        }
      } else {
        setFavoriteEvents([])
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
      setFavoriteEvents([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadFavorites()
  }, [loadFavorites])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EditorialHeader title={t('title')} subtitle={t('subtitle')} className="mb-8" tone="dark" />
        <LoadingSkeleton rows={8} animated tone="dark" />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={loadFavorites}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EditorialHeader title={t('title')} subtitle={t('subtitle')} className="mb-8" tone="dark" />

        {favoriteEvents.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t('empty.title')}
            description={t('empty.description')}
            actionLabel={t('empty.action')}
            actionHref="/"
            actionIcon={TrendingUp}
            tone="dark"
          />
        ) : (
          <>
            {/* Mobile: Horizontal Cards */}
            <div className="md:hidden space-y-4">
              {favoriteEvents.map((event) => (
                <EventCardHorizontal key={event.id} event={event} />
              ))}
            </div>
            
            {/* Desktop: Grid Cards */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </PullToRefresh>
  )
}
