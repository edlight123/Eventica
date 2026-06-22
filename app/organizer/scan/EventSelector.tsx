'use client'

import { format } from 'date-fns'
import Link from 'next/link'
import { QrCode } from 'lucide-react'

interface EventSelectorProps {
  events: any[]
  organizerId: string
}

export default function EventSelector({ events, organizerId }: EventSelectorProps) {
  // Separate today's events from others for display
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const todayEvents = events.filter(e => {
    const eventDate = new Date(e.start_datetime)
    return eventDate >= today && eventDate < tomorrow
  })
  
  const otherEvents = events.filter(e => {
    const eventDate = new Date(e.start_datetime)
    return eventDate < today || eventDate >= tomorrow
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select an Event to Scan</h2>
      
      {events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-600 mb-4">You don&apos;t have any events yet.</p>
          <Link
            href="/organizer/events/new"
            className="inline-block px-6 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-lg font-medium"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Events */}
          {todayEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-brand-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>📍</span>
                <span>Happening Today</span>
              </h3>
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/organizer/scan/${event.id}`}
                    className="block w-full text-left p-4 bg-brand-50 hover:bg-brand-100 rounded-lg border-2 border-brand-200 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-brand-900">{event.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {format(new Date(event.start_datetime), 'PPP • p')}
                        </p>
                        <p className="text-sm text-gray-600">
                          📍 {event.venue_name}, {event.city}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {event.tickets_sold || 0} tickets sold
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-600 text-white">
                          Today
                        </span>
                        <div className="flex items-center gap-1 text-brand-700 group-hover:text-brand-800">
                          <QrCode className="w-4 h-4" />
                          <span className="text-xs font-medium">Scan</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* Other Events */}
          {otherEvents.length > 0 && (
            <div>
              {todayEvents.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Other Events
                </h3>
              )}
              <div className="space-y-3">
                {otherEvents.map((event) => {
                  const isPast = new Date(event.start_datetime) < new Date()
                  
                  return (
                    <Link
                      key={event.id}
                      href={`/organizer/scan/${event.id}`}
                      className="block w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            📅 {format(new Date(event.start_datetime), 'PPP • p')}
                          </p>
                          <p className="text-sm text-gray-600">
                            📍 {event.venue_name}, {event.city}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {event.tickets_sold || 0} tickets sold
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isPast && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                              Past
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-gray-600 group-hover:text-gray-900">
                            <QrCode className="w-4 h-4" />
                            <span className="text-xs font-medium">Scan</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
