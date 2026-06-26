'use client'

import { useState } from 'react'
import { Calendar, MapPin, Globe, Edit, Share2, Eye, MoreVertical, Copy, XCircle, Trash2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

interface EventHeaderProps {
  event: {
    id: string
    title: string
    start_datetime: string
    end_datetime: string
    venue_name?: string
    city?: string
    is_online?: boolean
    is_published: boolean
    updated_at: string
  }
  onPublishToggle?: () => void
  isPublishing?: boolean
}

export function EventHeader({ event, onPublishToggle, isPublishing }: EventHeaderProps) {
  const { t } = useTranslation('common')
  const [showMenu, setShowMenu] = useState(false)
  const startDate = new Date(event.start_datetime)
  const updatedDate = new Date(event.updated_at)

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Header */}
        <div className="hidden md:block py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  event.is_published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {event.is_published ? t('organizer.published') : t('organizer.draft')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{format(startDate, 'EEE, MMM d, yyyy • h:mm a')}</span>
                </div>
                {event.is_online ? (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    <span>{t('organizer.online_event')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{event.venue_name || event.city || 'Location TBD'}</span>
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {t('organizer.updated')} {formatDistanceToNow(updatedDate, { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex items-center gap-2 ml-4">
              <Link
                href={`/organizer/events/${event.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                {t('organizer.edit')}
              </Link>
              <Link
                href={`/events/${event.id}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {t('organizer.preview')}
              </Link>
              <button
                onClick={() => {
                  if (window.navigator.share) {
                    window.navigator.share({
                      title: event.title,
                      url: `${window.location.origin}/events/${event.id}`
                    })
                  } else {
                    navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`)
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                {t('organizer.share')}
              </button>
              <button
                onClick={onPublishToggle}
                disabled={isPublishing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  event.is_published
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-brand-700 hover:bg-brand-800 text-white'
                }`}
              >
                {isPublishing ? t('organizer.processing') : event.is_published ? t('organizer.unpublish') : t('organizer.publish')}
              </button>
              
              {/* Overflow Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-700" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      {t('organizer.duplicate')}
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {t('organizer.cancel_event')}
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      {t('organizer.delete')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden py-3">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{event.title}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              event.is_published 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {event.is_published ? t('organizer.published') : t('organizer.draft')}
            </span>
          </div>
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(startDate, 'MMM d, yyyy • h:mm a')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {event.is_online ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
              <span>{event.is_online ? t('organizer.online_event') : (event.venue_name || event.city || 'Location TBD')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 safe-bottom">
        <div className="grid grid-cols-4 gap-2">
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50"
          >
            <Edit className="w-5 h-5 text-gray-700" />
            <span className="text-xs text-gray-700">{t('organizer.edit')}</span>
          </Link>
          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50"
          >
            <Eye className="w-5 h-5 text-gray-700" />
            <span className="text-xs text-gray-700">{t('organizer.preview')}</span>
          </Link>
          <button
            onClick={() => {
              if (window.navigator.share) {
                window.navigator.share({
                  title: event.title,
                  url: `${window.location.origin}/events/${event.id}`
                })
              }
            }}
            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50"
          >
            <Share2 className="w-5 h-5 text-gray-700" />
            <span className="text-xs text-gray-700">{t('organizer.share')}</span>
          </button>
          <button
            onClick={onPublishToggle}
            disabled={isPublishing}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg ${
              event.is_published ? 'bg-gray-100' : 'bg-brand-50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full ${event.is_published ? 'bg-gray-600' : 'bg-brand-700'}`} />
            <span className={`text-xs font-medium ${event.is_published ? 'text-gray-700' : 'text-brand-700'}`}>
              {event.is_published ? t('organizer.live') : t('organizer.publish')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
