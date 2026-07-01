'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Sparkles, MapPin, Clock, User, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import Badge from '@/components/ui/Badge'

interface AccordionSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function AccordionSection({ title, icon, defaultOpen = false, children }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className=" rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="font-bold text-white text-base">{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}

interface MobileAccordionsProps {
  description: string
  tags?: string[]
  venueName: string
  address: string
  commune: string
  city: string
  startDatetime: string
  endDatetime: string
  organizerName: string
  organizerId: string
  isVerified: boolean
  shareButton: React.ReactNode
}

export default function MobileAccordions({
  description,
  tags,
  venueName,
  address,
  commune,
  city,
  startDatetime,
  endDatetime,
  organizerName,
  organizerId,
  isVerified,
  shareButton
}: MobileAccordionsProps) {
  const { t } = useTranslation('common')
  
  return (
    <div className="md:hidden space-y-3">
      {/* About */}
      <AccordionSection
        title={t('events.about_event')}
        icon={<Sparkles className="w-5 h-5 text-brand-400" />}
        defaultOpen={true}
      >
        {description && description.trim() ? (
          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed mb-3">
            {description}
          </p>
        ) : (
          <p className="text-sm italic text-white/40 leading-relaxed mb-3">
            {t('events.no_description', { defaultValue: 'The organizer hasn’t added a description yet.' })}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="label-mono text-[10px] uppercase text-white/50 mb-2">{t('events.tags').toUpperCase()}</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string) => (
                <Badge key={tag} variant="neutral" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </AccordionSection>

      {/* Venue */}
      <AccordionSection
        title={t('events.venue_directions')}
        icon={<MapPin className="w-5 h-5 text-brand-400" />}
      >
        <div className="space-y-3">
          <div>
            <p className="label-mono text-[10px] uppercase text-white/50 mb-1.5">{t('events.venue_name').toUpperCase()}</p>
            <p className="text-sm font-semibold text-white">{venueName}</p>
          </div>
          <div>
            <p className="label-mono text-[10px] uppercase text-white/50 mb-1.5">{t('events.address').toUpperCase()}</p>
            <p className="text-sm text-white/70 break-words">{address}</p>
            <p className="text-sm text-white/70">{commune}, {city}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(address || `${venueName}, ${commune}, ${city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              {t('events.apple_maps')}
            </a>
            <span className="text-white/20">|</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${venueName}, ${commune}, ${city}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              {t('events.google_maps')}
            </a>
          </div>
        </div>
      </AccordionSection>

      {/* Date & Time */}
      <AccordionSection
        title={t('events.date_time')}
        icon={<Clock className="w-5 h-5 text-brand-400" />}
      >
        <div className="space-y-3">
          <div>
            <p className="label-mono text-[10px] uppercase text-white/50 mb-1.5">{t('events.start').toUpperCase()}</p>
            <p className="label-mono text-[13px] text-white">
              {format(new Date(startDatetime), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="label-mono text-[13px] text-white/55">
              {format(new Date(startDatetime), 'h:mm a')} HTT
            </p>
          </div>
          <div>
            <p className="label-mono text-[10px] uppercase text-white/50 mb-1.5">{t('events.end').toUpperCase()}</p>
            <p className="label-mono text-[13px] text-white">
              {format(new Date(endDatetime), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="label-mono text-[13px] text-white/55">
              {format(new Date(endDatetime), 'h:mm a')} HTT
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* Organizer */}
      <AccordionSection
        title={t('events.organizer')}
        icon={<User className="w-5 h-5 text-brand-400" />}
      >
        <a 
          href={`/profile/organizer/${organizerId}`}
          className="flex items-start gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {organizerName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-base truncate">
              {organizerName}
            </p>
            {isVerified && (
              <div className="flex items-center gap-1 text-brand-400 text-sm mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{t('events.verified_organizer')}</span>
              </div>
            )}
          </div>
        </a>
      </AccordionSection>

      {/* Share */}
      <AccordionSection
        title={t('events.share_event')}
        icon={<Share2 className="w-5 h-5 text-brand-400" />}
      >
        {shareButton}
      </AccordionSection>
    </div>
  )
}
