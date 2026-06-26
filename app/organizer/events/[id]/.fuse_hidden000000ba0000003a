'use client'

import { useState } from 'react'
import NotifyAttendeesModal from '@/components/NotifyAttendeesModal'

interface NotifyAttendeesButtonProps {
  eventId: string
}

export default function NotifyAttendeesButton({ eventId }: NotifyAttendeesButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-medium flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Notify Attendees
      </button>

      <NotifyAttendeesModal
        eventId={eventId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
