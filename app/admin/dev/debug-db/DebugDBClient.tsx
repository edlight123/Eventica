'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase/client'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import MobileNavWrapper from '@/components/MobileNavWrapper'

export default function DebugDBClient() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const checkDatabase = async () => {
    if (!user) {
      setResults({ error: 'Not logged in' })
      return
    }

    setLoading(true)
    try {
      // Get user document
      const usersQuery = query(collection(db, 'users'), where('email', '==', user.email))
      const userSnapshot = await getDocs(usersQuery)
      const userId = userSnapshot.docs[0]?.id

      // Get all events
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const allEvents = eventsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          firestoreId: doc.id,
          hasIdField: 'id' in data,
          idFieldValue: (data as any).id,
          ...data
        }
      })

      // Get events by this user
      const userEventsQuery = query(collection(db, 'events'), where('organizer_id', '==', userId))
      const userEventsSnapshot = await getDocs(userEventsQuery)
      const userEvents = userEventsSnapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }))

      // Get event_favorites
      const favoritesSnapshot = await getDocs(collection(db, 'event_favorites'))
      const allFavorites = favoritesSnapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }))

      // Get user's favorites
      const userFavoritesQuery = query(collection(db, 'event_favorites'), where('user_id', '==', userId))
      const userFavoritesSnapshot = await getDocs(userFavoritesQuery)
      const userFavorites = userFavoritesSnapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }))

      // Test date comparison
      const now = new Date().toISOString()
      const nowDate = new Date()
      console.log('Testing date comparisons:')
      console.log('Now as ISO string:', now)
      console.log('Now as Date:', nowDate)

      // Try to query upcoming events
      const upcomingQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', userId),
        where('start_datetime', '>=', now)
      )
      const upcomingSnapshot = await getDocs(upcomingQuery)
      const upcomingEvents = upcomingSnapshot.docs.map(doc => doc.data())

      console.log('Upcoming events found:', upcomingEvents.length)

      // Get organizer_follows
      const followsSnapshot = await getDocs(collection(db, 'organizer_follows'))
      const allFollows = followsSnapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }))

      // Get ticket_tiers
      const tiersSnapshot = await getDocs(collection(db, 'ticket_tiers'))
      const allTiers = tiersSnapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
      }))

      setResults({
        userId,
        userEmail: user.email,
        currentTime: now,
        totalEvents: allEvents.length,
        userEvents: userEvents.length,
        upcomingEventsCount: upcomingEvents.length,
        totalFavorites: allFavorites.length,
        userFavorites: userFavorites.length,
        totalFollows: allFollows.length,
        totalTiers: allTiers.length,
        sampleEvent: allEvents[0],
        sampleUserEvent: userEvents[0],
        sampleUpcomingEvent: upcomingEvents[0],
        sampleFavorite: allFavorites[0],
        sampleUserFavorite: userFavorites[0],
        sampleFollow: allFollows[0],
        sampleTier: allTiers[0],
        allEvents: allEvents.slice(0, 3),
        allUserEvents: userEvents,
        allUpcomingEvents: upcomingEvents,
        allUserFavorites: userFavorites,
      })
    } catch (error: any) {
      setResults({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="font-display text-2xl text-gray-900 mb-4">Please sign in</h1>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 pb-mobile-nav">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8">
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900 mb-4 sm:mb-6">Database Debug Tool</h1>

            <button
              onClick={checkDatabase}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[15px] sm:text-base font-semibold disabled:opacity-50 mb-4 sm:mb-6 min-h-[44px] w-full sm:w-auto"
            >
              {loading ? 'Checking...' : 'Check Database'}
            </button>

            {results && (
              <div className="space-y-4">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs font-mono max-h-[600px]">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileNavWrapper user={null} />
    </>
  )
}
