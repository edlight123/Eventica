'use client'

import { useState, useTransition } from 'react'
import { EyeOff, Eye } from 'lucide-react'

interface EventActionsClientProps {
  eventId: string
  eventTitle: string
  isPublished: boolean
  togglePublishStatus: (eventId: string, currentStatus: boolean, eventTitle: string) => Promise<void>
}

export function EventActionsClient({ 
  eventId,
  eventTitle, 
  isPublished, 
  togglePublishStatus 
}: EventActionsClientProps) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      await togglePublishStatus(eventId, isPublished, eventTitle)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-sm font-medium ${
        isPublished 
          ? 'text-brand-600 hover:text-brand-900' 
          : 'text-green-600 hover:text-green-900'
      } disabled:opacity-50`}
      title={isPublished ? 'Unpublish event' : 'Publish event'}
    >
      {isPending ? (
        'Loading...'
      ) : isPublished ? (
        <>
          <span className="hidden sm:inline">Unpublish</span>
          <EyeOff className="w-4 h-4 sm:hidden" />
        </>
      ) : (
        <>
          <span className="hidden sm:inline">Publish</span>
          <Eye className="w-4 h-4 sm:hidden" />
        </>
      )}
    </button>
  )
}
