'use client'

import { MapPin, Edit2, Globe } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

interface VenueCardProps {
  eventId: string
  venue: {
    name?: string
    address?: string
    city?: string
    commune?: string
    is_online?: boolean
    meeting_url?: string
  }
}

export function VenueCard({ eventId, venue }: VenueCardProps) {
  const { t } = useTranslation('common')
  const hasVenue = venue.name || venue.address || venue.city || venue.is_online

  return (
    <div className="bg-[#0a0a0a] rounded-xl  p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg ">
            {venue.is_online ? (
              <Globe className="w-5 h-5 text-brand-300" />
            ) : (
              <MapPin className="w-5 h-5 text-brand-300" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white">
            {venue.is_online ? t('organizer.online_event') : t('organizer.venue')}
          </h3>
        </div>
        <Link
          href={`/organizer/events/${eventId}/edit#venue`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-300 hover:bg-brand-500/10 rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          {t('organizer.edit')}
        </Link>
      </div>

      {!hasVenue ? (
        <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-lg">
          <MapPin className="w-12 h-12 text-white/50 mx-auto mb-3" />
          <p className="text-sm text-white/60 mb-3">{t('organizer.no_venue_info')}</p>
          <Link
            href={`/organizer/events/${eventId}/edit#venue`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {t('organizer.add_venue_details')}
          </Link>
        </div>
      ) : venue.is_online ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg">
            <Globe className="w-5 h-5 text-brand-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white mb-1">{t('organizer.virtual_event')}</p>
              {venue.meeting_url ? (
                <a 
                  href={venue.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand-300 hover:underline break-all"
                >
                  {venue.meeting_url}
                </a>
              ) : (
                <p className="text-sm text-white/60">{t('organizer.meeting_link_shared')}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {venue.name && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{venue.name}</p>
              </div>
            </div>
          )}
          {venue.address && (
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm text-white/60">{venue.address}</p>
            </div>
          )}
          {(venue.commune || venue.city) && (
            <div className="flex items-start gap-3">
              <div className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm text-white/60">
                {venue.commune && venue.city ? `${venue.commune}, ${venue.city}` : venue.commune || venue.city}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
