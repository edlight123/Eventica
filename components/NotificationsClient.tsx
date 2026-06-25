'use client'

import React, { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead,
  getUnreadCount 
} from '@/lib/notifications'
import type { Notification } from '@/types/notifications'

interface NotificationsClientProps {
  userId: string
  initialNotifications: Notification[]
  initialUnreadCount: number
}

export function NotificationsClient({ 
  userId, 
  initialNotifications,
  initialUnreadCount 
}: NotificationsClientProps) {
  const router = useRouter()
  const { t } = useTranslation('notifications')
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const handleAcceptStaffInvite = async (notification: Notification) => {
    const metadata = (notification as any)?.metadata || {}
    const eventId = String(metadata?.eventId || notification.eventId || '')
    const token = String(metadata?.token || '')

    if (!eventId || !token) {
      alert('Missing invite details. Please open the invite link.')
      return
    }

    try {
      const res = await fetch('/api/staff/invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, token }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || 'Failed to accept invite'
        alert(msg)
        return
      }

      if (!notification.isRead) {
        await handleMarkAsRead(notification.id)
      }

      // Send the user to the staff hub.
      router.push('/staff')
    } catch (error) {
      console.error('Error accepting staff invite:', error)
      alert('Failed to accept invite')
    }
  }

  const handleDeclineStaffInvite = async (notification: Notification) => {
    const metadata = (notification as any)?.metadata || {}
    const eventId = String(metadata?.eventId || notification.eventId || '')
    const token = String(metadata?.token || '')

    if (!eventId || !token) {
      alert('Missing invite details. Please open the invite link.')
      return
    }

    try {
      const res = await fetch('/api/staff/invites/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, token }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error || 'Failed to decline invite'
        alert(msg)
        return
      }

      if (!notification.isRead) {
        await handleMarkAsRead(notification.id)
      }

      // Dismiss it from the list (it will still exist in Firestore as read).
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    } catch (error) {
      console.error('Error declining staff invite:', error)
      alert('Failed to decline invite')
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(userId, notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsLoading(true)
    try {
      await markAllAsRead(userId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm(t('confirm_clear'))) {
      return
    }

    setIsClearing(true)
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear notifications')
      }

      // Clear local state
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error('Error clearing notifications:', error)
      alert(t('clear_failed'))
    } finally {
      setIsClearing(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_purchased':
        return '🎫'
      case 'ticket_transfer':
        return '🔁'
      case 'event_updated':
        return '📢'
      case 'event_reminder_24h':
      case 'event_reminder_3h':
      case 'event_reminder_30min':
        return '⏰'
      case 'event_cancelled':
        return '❌'
      case 'staff_invite':
        return '👥'
      default:
        return '🔔'
    }
  }

  const getNotificationLink = (notification: Notification): string => {
    if ((notification as any).actionUrl) {
      return (notification as any).actionUrl as string
    }
    if (notification.ticketId) {
      return `/tickets/${notification.ticketId}`
    }
    if (notification.eventId) {
      return `/events/${notification.eventId}`
    }
    return '#'
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id)
    }

    const link = getNotificationLink(notification)
    if (link !== '#') {
      router.push(link)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('title')}</h1>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isLoading}
                  className="px-3 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
                >
                  {t('mark_all_read')}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {t('clear_all')}
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-600">
            {unreadCount > 0 
              ? t('unread_count', { count: unreadCount })
              : t('all_caught_up')}
          </p>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('empty.title')}</h3>
            <p className="text-gray-600">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer border-b border-gray-200 px-1 py-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-brand-500 rounded-full mt-1.5" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>

                    {notification.type === 'staff_invite' && (
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAcceptStaffInvite(notification)
                          }}
                          className="px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
                        >
                          Accept invite
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeclineStaffInvite(notification)
                          }}
                          className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {getNotificationLink(notification) !== '#' && (
                        <span className="text-brand-600">
                          {t('view_details')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
