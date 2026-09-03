'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff } from 'lucide-react'
import type { UserProfile } from '@/lib/firestore/user-profile'

interface NotificationsCardProps {
  profile: UserProfile
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>
}

export function NotificationsCard({ profile, onUpdate }: NotificationsCardProps) {
  const { t } = useTranslation('profile')
  const [notify, setNotify] = useState(profile.notify || {
    reminders: true,
    updates: true,
    promos: false
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async (key: 'reminders' | 'updates' | 'promos') => {
    const newNotify = { ...notify, [key]: !notify[key] }
    setNotify(newNotify)
    setIsUpdating(true)
    try {
      await onUpdate({ notify: newNotify })
    } catch (error) {
      console.error('Failed to update notifications:', error)
      // Revert on error
      setNotify(notify)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="bg-white/[0.03] rounded-2xl shadow-sm border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">{t('notifications.title')}</h2>
          <p className="text-sm text-white/65">{t('notifications.subtitle')}</p>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="space-y-4">
        {/* Event Reminders */}
        <div className="flex items-start justify-between py-3 border-b border-white/10">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-white mb-1">{t('notifications.event_reminders')}</h3>
            <p className="text-sm text-white/65">
              {t('notifications.event_reminders_desc')}
            </p>
          </div>
          <button
            onClick={() => handleToggle('reminders')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.reminders ? 'bg-brand-600' : 'bg-white/[0.06]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white/[0.03] transition-transform ${
                notify.reminders ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Event Updates */}
        <div className="flex items-start justify-between py-3 border-b border-white/10">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-white mb-1">{t('notifications.event_updates')}</h3>
            <p className="text-sm text-white/65">
              {t('notifications.event_updates_desc')}
            </p>
          </div>
          <button
            onClick={() => handleToggle('updates')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.updates ? 'bg-brand-600' : 'bg-white/[0.06]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white/[0.03] transition-transform ${
                notify.updates ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Promotions */}
        <div className="flex items-start justify-between py-3">
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-white mb-1">{t('notifications.promos')}</h3>
            <p className="text-sm text-white/65">
              {t('notifications.promos_desc')}
            </p>
          </div>
          <button
            onClick={() => handleToggle('promos')}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
              notify.promos ? 'bg-brand-600' : 'bg-white/[0.06]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white/[0.03] transition-transform ${
                notify.promos ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-lg p-4">
        <p className="text-xs text-white/65">
          {t('notifications.note')}
        </p>
      </div>
    </div>
  )
}
