'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (!userId) return
    
    let unsubscribe: (() => void) | undefined
    
    try {
      // Real-time listener for unread notifications
      const notificationsRef = collection(db, 'users', userId, 'notifications')
      const q = query(notificationsRef, where('isRead', '==', false))
      
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setUnreadCount(snapshot.size)
        },
        (error) => {
          // Handle errors gracefully - don't break the UI
          if (error.code === 'permission-denied') {
            console.warn('Notifications permission denied. Please configure Firestore security rules.')
          } else if (error.code === 'unavailable') {
            console.warn('Firestore temporarily unavailable. Notifications will retry automatically.')
          } else {
            console.error('Error listening to notifications:', error)
          }
          // Set count to 0 on error so the UI still works
          setUnreadCount(0)
        }
      )
    } catch (error) {
      console.error('Failed to initialize notifications listener:', error)
      setUnreadCount(0)
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from notifications:', error)
        }
      }
    }
  }, [userId])
  
  // Prevent hydration mismatch by not showing count until mounted
  if (!mounted) {
    return (
      <Link
        href="/notifications"
        className="relative p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
      </Link>
    )
  }

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[1.25rem]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
