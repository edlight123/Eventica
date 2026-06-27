'use client'

import { EventFormData, TicketTier } from '@/lib/event-validation'
import { Calendar, MapPin, DollarSign, Users, Tag, Clock, Globe } from 'lucide-react'
import Image from 'next/image'

interface EventLivePreviewProps {
  data: EventFormData
  tiers?: TicketTier[]
}

export function EventLivePreview({ data, tiers }: EventLivePreviewProps) {
  const formattedPrice = () => {
    if (!data.ticket_price || data.ticket_price === '0' || data.ticket_price === 0) {
      return 'Free'
    }
    return `${data.ticket_price} ${data.currency || 'USD'}`
  }

  const formattedDate = () => {
    if (!data.start_datetime) return 'Date TBD'
    const date = new Date(data.start_datetime)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formattedEndDate = () => {
    if (!data.end_datetime) return null
    const date = new Date(data.end_datetime)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const eventDuration = () => {
    if (!data.start_datetime || !data.end_datetime) return null
    const start = new Date(data.start_datetime)
    const end = new Date(data.end_datetime)
    const hours = Math.abs(end.getTime() - start.getTime()) / 36e5
    
    if (hours < 24) {
      return `${hours.toFixed(1)} hours`
    }
    return `${(hours / 24).toFixed(1)} days`
  }

  return (
    <div className="sticky top-24 space-y-4">
      <div className="border-2 border-brand-500/30 rounded-xl p-4">
        <h3 className="font-bold text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-2 bg-brand-600 rounded-full animate-pulse"></span>
          Live Preview
        </h3>
        <p className="text-sm text-white/60">
          See how your event will appear to attendees
        </p>
      </div>

      <div className="bg-[#0a0a0a] border-2 border-white/10 rounded-xl overflow-hidden shadow-lg">
        {/* Banner Image */}
        <div className="relative w-full h-48 bg-gradient-to-br from-white/10 to-white/20">
          {data.banner_image_url ? (
            <Image
              src={data.banner_image_url}
              alt={data.title || 'Event banner'}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No banner image</p>
              </div>
            </div>
          )}
          
          {/* Category Badge */}
          {data.category && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/95 backdrop-blur-sm text-white text-xs font-bold rounded-lg shadow-md">
                <Tag className="w-3 h-3" />
                {data.category}
              </span>
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-700 text-white text-xs font-bold rounded-lg shadow-md">
              <DollarSign className="w-3 h-3" />
              {formattedPrice()}
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div className="p-5">
          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-3 line-clamp-2">
            {data.title || 'Untitled Event'}
          </h2>

          {/* Date & Time */}
          <div className="space-y-2.5 mb-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-brand-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {formattedDate()}
                </p>
                {formattedEndDate() && (
                  <p className="text-xs text-white/60 mt-0.5">
                    Until {formattedEndDate()}
                  </p>
                )}
                {eventDuration() && (
                  <p className="text-xs text-brand-300 font-medium mt-0.5">
                    Duration: {eventDuration()}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              {data.is_online ? (
                <>
                  <Globe className="w-5 h-5 text-brand-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Online Event</p>
                    {data.join_url ? (
                      <p className="text-xs text-white/60 mt-0.5 truncate">
                        {data.join_url}
                      </p>
                    ) : (
                      <p className="text-xs text-white/40 mt-0.5">
                        Join link will be provided
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-brand-300 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {data.venue_name ? (
                      <>
                        <p className="text-sm font-semibold text-white">
                          {data.venue_name}
                        </p>
                        <p className="text-xs text-white/60 mt-0.5">
                          {[data.commune, data.city].filter(Boolean).join(', ') || 'Location TBD'}
                        </p>
                        {data.address && (
                          <p className="text-xs text-white/50 mt-0.5">
                            {data.address}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-white/40">Location TBD</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Capacity */}
            {data.total_tickets && parseInt(data.total_tickets.toString()) > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-brand-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    Up to {data.total_tickets} attendees
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {data.description && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-2">About</h3>
              <p className="text-sm text-white/70 line-clamp-4 leading-relaxed">
                {data.description}
              </p>
              <p className="text-xs text-white/50 mt-2">
                {data.description.length} characters
              </p>
            </div>
          )}

          {/* Ticket Tiers */}
          {tiers && tiers.length > 0 && (
            <div className="pt-4 border-t border-white/10 mt-4">
              <h3 className="text-sm font-bold text-white mb-3">Ticket Options</h3>
              <div className="space-y-2">
                {/* Base Ticket */}
                {data.total_tickets && parseInt(data.total_tickets.toString()) > 0 && (
                  <div className="bg-[#0a0a0a]  rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-white">General Admission</p>
                        <p className="text-xs text-white/60">{data.total_tickets} available</p>
                      </div>
                      <p className="font-bold text-white">{formattedPrice()}</p>
                    </div>
                  </div>
                )}

                {/* Premium Tiers */}
                {tiers.filter(t => t.name && t.quantity).map((tier, index) => (
                  <div key={index} className="border border-brand-500/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-white">{tier.name}</p>
                      <p className="font-bold text-brand-300">
                        {tier.price === '0' || tier.price === 0 ? 'Free' : `${tier.price} ${data.currency || 'USD'}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-white/60">{tier.quantity} available</p>
                      {tier.description && (
                        <p className="text-brand-300 font-medium truncate ml-2">{tier.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {data.tags && data.tags.length > 0 && (
            <div className="pt-4 border-t border-white/10 mt-4">
              <h3 className="text-sm font-bold text-white mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {data.tags.slice(0, 6).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2.5 py-1 text-brand-300 text-xs font-medium rounded-md"
                  >
                    {tag}
                  </span>
                ))}
                {data.tags.length > 6 && (
                  <span className="inline-block px-2.5 py-1 bg-[#0a0a0a] text-white/60 text-xs font-medium rounded-md">
                    +{data.tags.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
