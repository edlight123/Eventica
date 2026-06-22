'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import Image from 'next/image'

interface TicketCardProps {
  eventId: string
  title: string
  bannerImageUrl?: string
  startDatetime?: string
  venueName?: string
  city?: string
  ticketCount: number
}

export default function TicketCard({ 
  eventId,
  title,
  bannerImageUrl,
  startDatetime,
  venueName,
  city,
  ticketCount 
}: TicketCardProps) {
  return (
    <Link
      href={`/tickets/event/${eventId}`}
      className="block bg-white rounded-xl shadow-soft hover:shadow-medium transition-shadow border border-gray-100 overflow-hidden"
    >
      <div className="flex">
        {bannerImageUrl ? (
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-auto bg-gray-200 flex-shrink-0 relative">
            <Image
              src={bannerImageUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 200px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-auto bg-gradient-to-br from-brand-700 to-[#0C5E57] flex items-center justify-center flex-shrink-0">
            <span className="font-display text-3xl md:text-5xl text-[#F8F5EE]">T</span>
          </div>
        )}

        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                {title.replace(/^\[[^\]]*\]\s*/, '')}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-brand-50 text-brand-700 whitespace-nowrap flex-shrink-0">
                {ticketCount} {ticketCount === 1 ? 'Ticket' : 'Tickets'}
              </span>
            </div>

            <div className="space-y-1.5 text-[13px] text-gray-600">
              <div className="flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">
                  {startDatetime ? format(new Date(startDatetime), 'EEE, MMM d, yyyy • h:mm a') : 'Date TBA'}
                </span>
              </div>

              <div className="flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">
                  {venueName || 'Venue TBA'}, {city || 'Location TBA'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <span className="text-brand-700 text-[13px] md:text-sm font-medium flex items-center">
              View Tickets
              <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
