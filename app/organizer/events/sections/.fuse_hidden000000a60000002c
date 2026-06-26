import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { EmptyState, StatusChip } from '@/components/ui/kit'
import { Calendar } from 'lucide-react'

export default async function OrganizerEventsList({ events }: { events: any[] }) {
  if (!events || events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No events yet"
        description="Create your first event to get started."
        action={
          <Link
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-800 transition-colors"
          >
            Create Event
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        const ticketsSold = event.tickets_sold || 0
        const totalTickets = event.total_tickets || 0
        const salesPercentage = totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0
        const isSoldOut = ticketsSold >= totalTickets && totalTickets > 0

        return (
          <div key={event.id} className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group hover:-translate-y-2">
            {/* Event Banner/Thumbnail */}
            {event.banner_image_url ? (
              <div className="relative h-48 bg-gray-200 overflow-hidden">
                <Image
                  src={event.banner_image_url}
                  alt={event.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  priority={false}
                />
                {isSoldOut && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    SOLD OUT
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center relative bg-gradient-to-br from-brand-700 to-[#0C5E57]">
                <span className="font-display text-6xl leading-none text-[#F8F5EE]">T</span>
                {isSoldOut && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    SOLD OUT
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              {/* Status Badge & Category */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-md">
                  {event.category}
                </span>
                <StatusChip tone={event.is_published ? 'success' : 'neutral'}>
                  {event.is_published ? 'Published' : 'Draft'}
                </StatusChip>
              </div>

              {/* Event Title */}
              <h3 className="font-display text-xl text-gray-900 mb-3 line-clamp-2 group-hover:text-brand-700 transition-colors">
                {event.title}
              </h3>

              {/* Event Details */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium">{format(new Date(event.start_datetime), 'MMM d, yyyy • h:mm a')}</span>
                </div>

                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-medium">{event.city}</span>
                </div>
              </div>

              {/* Ticket Sales Progress */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Ticket Sales</span>
                  <span className="text-sm font-bold text-gray-900">{ticketsSold} / {totalTickets}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      salesPercentage >= 100 ? 'bg-red-600' : 'bg-brand-600'
                    }`}
                    style={{ width: `${Math.min(salesPercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{salesPercentage.toFixed(0)}% sold</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href={`/organizer/events/${event.id}`}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border-2 border-brand-100 transition-all duration-300 text-center"
                >
                  View Details
                </Link>
                <Link
                  href={`/organizer/events/${event.id}/edit`}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-md hover:shadow-lg transition-all duration-300 text-center"
                >
                  Edit Event
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
