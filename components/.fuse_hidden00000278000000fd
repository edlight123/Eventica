'use client'

import { useState } from 'react'
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl } from '@/lib/calendar'

interface AddToCalendarProps {
  event: {
    id: string
    title: string
    description: string | null
    start_datetime: string
    end_datetime: string | null
    venue_name: string
    address: string | null
    city: string
  }
}

export default function AddToCalendar({ event }: AddToCalendarProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleDownloadICS = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/calendar`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      setShowDropdown(false)
    } catch (error) {
      console.error('Error downloading calendar file:', error)
    }
  }

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event)
    window.open(url, '_blank')
    setShowDropdown(false)
  }

  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarUrl(event)
    window.open(url, '_blank')
    setShowDropdown(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">Add to Calendar</span>
        <svg className={`w-4 h-4 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <button
              onClick={handleGoogleCalendar}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Google Calendar</span>
            </button>

            <button
              onClick={handleOutlookCalendar}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b border-gray-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M24 7.875V16.2c0 1.6-1.3 2.9-2.9 2.9h-2.6l-1.9-1.9v-4.4l1.9-1.9h2.6c.3 0 .5 0 .8.1V7.8L12 3.1 2.1 7.8v8.4l9.9 4.7 7.6-3.6v2.2l-7.6 3.6L0 18.2V6l12-5.7L24 7.875z"/>
                <path fill="#0078D4" d="M17.5 11.1v6.5l3.6 1.7c.5-.3.8-.8.8-1.4v-5.8l-4.4-1z"/>
                <path fill="#0078D4" d="M21.1 11.1h-3.6v6.5h3.6c.8 0 1.4-.6 1.4-1.4v-3.6c0-.9-.6-1.5-1.4-1.5z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700">Outlook Calendar</span>
            </button>

            <button
              onClick={handleDownloadICS}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 rounded-b-lg"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Apple Calendar (.ics)</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
