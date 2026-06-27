'use client'

import { useState } from 'react'
import { EnableNotificationsPrompt } from './EnableNotificationsPrompt'
import { hasNotificationPermission } from '@/lib/fcm'

interface PurchaseSuccessNotificationPromptProps {
  userId: string
}

export function PurchaseSuccessNotificationPrompt({ userId }: PurchaseSuccessNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(!hasNotificationPermission())

  if (!showPrompt) {
    return null
  }

  return (
    <div className="mt-6">
      <EnableNotificationsPrompt
        userId={userId}
        onClose={() => setShowPrompt(false)}
        onSuccess={() => setShowPrompt(false)}
        context="purchase"
      />
    </div>
  )
}
