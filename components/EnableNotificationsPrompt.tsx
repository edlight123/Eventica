'use client'

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, X } from 'lucide-react'
import { requestNotificationPermission, canRequestNotificationPermission } from '@/lib/fcm'

interface EnableNotificationsPromptProps {
  userId: string
  onClose?: () => void
  onSuccess?: () => void
  context?: 'purchase' | 'favorite' | 'settings'
}

export function EnableNotificationsPrompt({ 
  userId, 
  onClose, 
  onSuccess,
  context = 'purchase'
}: EnableNotificationsPromptProps) {
  const { t } = useTranslation('common')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't show if user already denied permission
  if (!canRequestNotificationPermission()) {
    return null
  }

  const getContextMessage = () => {
    switch (context) {
      case 'purchase':
        return t('notifications_prompt.context_purchase', 'Get notified about your ticket, event updates, and reminders!')
      case 'favorite':
        return t('notifications_prompt.context_favorite', 'Get notified when this event is updated or when tickets go on sale!')
      case 'settings':
        return t('notifications_prompt.context_settings', 'Stay updated with event reminders and important notifications.')
      default:
        return t('notifications_prompt.context_default', 'Get notified about your events and tickets!')
    }
  }

  const handleEnable = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await requestNotificationPermission(userId)
      
      if (result.success) {
        onSuccess?.()
        onClose?.()
      } else {
        setError(result.error || 'Failed to enable notifications')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-brand-50 to-brand-100 border border-brand-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white mb-1">
            {t('notifications_prompt.title', 'Enable Notifications')}
          </h3>
          <p className="text-sm text-white/65 mb-3">
            {getContextMessage()}
          </p>

          {error && (
            <div className="mb-3 p-2 border border-red-200 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('notifications_prompt.enabling', 'Enabling...') : t('notifications_prompt.enable', 'Enable')}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-white/10 text-white/70 text-sm font-medium rounded-lg hover:bg-[#0a0a0a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('notifications_prompt.not_now', 'Not Now')}
            </button>
          </div>
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/40 hover:text-white/65 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
