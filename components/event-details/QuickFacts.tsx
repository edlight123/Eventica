'use client'

import { useTranslation } from 'react-i18next'
import { Calendar, MapPin, DollarSign, Users } from 'lucide-react'
import { format } from 'date-fns'

interface QuickFactsProps {
  startDate: string
  location: string
  venueName: string
  city: string
  isFree: boolean
  price: number
  currency: string
  remainingTickets: number
  totalTickets: number
  showAvailability: boolean
}

export function QuickFacts({
  startDate,
  location,
  venueName,
  city,
  isFree,
  price,
  currency,
  remainingTickets,
  totalTickets,
  showAvailability,
}: QuickFactsProps) {
  const { t } = useTranslation('common')
  const lowInventory = remainingTickets < 20 && remainingTickets > 0

  return (
    <div className="bg-white border-y border-gray-200 -mx-4 sm:mx-0 sm:rounded-2xl sm:border">
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Date
              </p>
              <p className="text-sm font-bold text-gray-900">
                {format(new Date(startDate), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-gray-600">
                {format(new Date(startDate), 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Location
              </p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {venueName}
              </p>
              <p className="text-xs text-gray-600 truncate">{city}</p>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Price
              </p>
              {isFree ? (
                <p className="text-sm font-bold text-success-600">{t('common.free')}</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-900">
                    {t('common.from')} {price} {currency}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Availability - Only show if low inventory */}
          {showAvailability && lowInventory && (
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-warning-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Availability
                </p>
                <p className="text-sm font-bold text-warning-600">
                  {t('ticket.only_x_left', { count: remainingTickets })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
