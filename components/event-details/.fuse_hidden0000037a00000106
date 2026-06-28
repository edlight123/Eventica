'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, MapPin, Clock, Ticket } from 'lucide-react'
import { format } from 'date-fns'
import Badge from '@/components/ui/Badge'

interface EventAccordionsProps {
  description: string
  tags: string[]
  venueName: string
  address: string
  commune: string
  city: string
  startDate: string
  endDate: string
  children?: React.ReactNode // For ticket tiers section
}

export function EventAccordions({
  description,
  tags,
  venueName,
  address,
  commune,
  city,
  startDate,
  endDate,
  children,
}: EventAccordionsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['about']))

  const toggleSection = (section: string) => {
    const newOpen = new Set(openSections)
    if (newOpen.has(section)) {
      newOpen.delete(section)
    } else {
      newOpen.add(section)
    }
    setOpenSections(newOpen)
  }

  return (
    <div className="space-y-3">
      {/* About */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('about')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">About This Event</h3>
          </div>
          {openSections.has('about') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {openSections.has('about') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-4">
              {description}
            </p>
            {tags && tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-2">TAGS</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Venue & Directions */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('venue')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Venue & Directions</h3>
          </div>
          {openSections.has('venue') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {openSections.has('venue') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="space-y-3 mt-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">VENUE</p>
                <p className="text-sm font-semibold text-gray-900">{venueName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">ADDRESS</p>
                <p className="text-sm text-gray-700">{address}</p>
                <p className="text-sm text-gray-700">{commune}, {city}</p>
              </div>
              <button
                onClick={() => {
                  // Detect platform and open appropriate maps app
                  const query = encodeURIComponent(`${address}, ${commune}, ${city}`)
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                  const url = isIOS
                    ? `maps://maps.apple.com/?q=${query}`
                    : `https://www.google.com/maps/search/?api=1&query=${query}`
                  window.open(url, '_blank')
                }}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                Get Directions
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('schedule')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Schedule</h3>
          </div>
          {openSections.has('schedule') ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {openSections.has('schedule') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="space-y-3 mt-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">START</p>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(startDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(startDate), 'h:mm a')} (Haiti Time)
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">END</p>
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(endDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(endDate), 'h:mm a')} (Haiti Time)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tickets Section (if children provided) */}
      {children && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('tickets')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-gray-900">Tickets</h3>
            </div>
            {openSections.has('tickets') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {openSections.has('tickets') && (
            <div className="border-t border-gray-100">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
