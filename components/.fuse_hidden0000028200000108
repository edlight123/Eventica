'use client'

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { updateNotificationPreferences } from '@/lib/notifications'
import { EnableNotificationsPrompt } from '@/components/EnableNotificationsPrompt'
import { hasNotificationPermission } from '@/lib/fcm'
import type { NotificationPreferences as NotificationPrefs } from '@/types/notifications'

interface NotificationSettingsClientProps {
  userId: string
  initialPreferences: NotificationPrefs
}

export function NotificationSettingsClient({ 
  userId, 
  initialPreferences 
}: NotificationSettingsClientProps) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showEnablePrompt, setShowEnablePrompt] = useState(false)

  const handleToggle = async (key: keyof NotificationPrefs) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] }
    setPreferences(newPrefs)
    
    setIsSaving(true)
    try {
      await updateNotificationPreferences(userId, { [key]: newPrefs[key] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error updating preferences:', error)
      // Revert on error
      setPreferences(preferences)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Setup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Push Notifications</h2>
            <p className="text-sm text-gray-600">Get instant updates on your device</p>
          </div>
        </div>

        {hasNotificationPermission() ? (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">
              Push notifications are enabled
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {!showEnablePrompt ? (
              <button
                onClick={() => setShowEnablePrompt(true)}
                className="w-full px-4 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
              >
                Enable Push Notifications
              </button>
            ) : (
              <EnableNotificationsPrompt
                userId={userId}
                context="settings"
                onClose={() => setShowEnablePrompt(false)}
                onSuccess={() => setShowEnablePrompt(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* In-App Notification Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Preferences</h2>
        <p className="text-sm text-gray-600 mb-6">
          Choose which types of notifications you want to receive
        </p>

        <div className="space-y-4">
          {/* Ticket Purchase Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Ticket Purchases</h3>
              <p className="text-sm text-gray-600">Get notified when you purchase tickets</p>
            </div>
            <button
              onClick={() => handleToggle('notifyTicketPurchase')}
              disabled={isSaving}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.notifyTicketPurchase ? 'bg-brand-600' : 'bg-gray-300'}
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${preferences.notifyTicketPurchase ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Event Updates */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Event Updates</h3>
              <p className="text-sm text-gray-600">Get notified about changes to your events</p>
            </div>
            <button
              onClick={() => handleToggle('notifyEventUpdates')}
              disabled={isSaving}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.notifyEventUpdates ? 'bg-brand-600' : 'bg-gray-300'}
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${preferences.notifyEventUpdates ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Event Reminders */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Event Reminders</h3>
              <p className="text-sm text-gray-600">Get reminded before your events (24h, 3h, 30min)</p>
            </div>
            <button
              onClick={() => handleToggle('notifyReminders')}
              disabled={isSaving}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.notifyReminders ? 'bg-brand-600' : 'bg-gray-300'}
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${preferences.notifyReminders ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Save Indicator */}
        {saved && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800 font-medium">Preferences saved</p>
          </div>
        )}
      </div>
    </div>
  )
}
