'use client'

// The mobile detail sections: a hairline-divided list, no boxes, no row icons
// (owner call, 2026-08-29). The chevron is the only chrome; content inside is
// plain language set in the sans — mono stays reserved for identifiers.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import Badge from '@/components/ui/Badge'
import { dateLocaleFor } from '@/lib/dateLocale'

interface AccordionSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function AccordionSection({ title, defaultOpen = false, children }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-medium text-white">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="pb-5">{children}</div>}
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
  /**
   * The venue map tile, passed in already-built — the same `shareButton`
   * convention this component already uses for composed children. Kept as a
   * node (rather than widening the props with the raw event doc) so this
   * component stays a list of flat scalars, and so the tile's link is
   * constructed once, next to the desktop one it must match.
   */
  venueMap?: React.ReactNode
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
  shareButton,
  venueMap
}: MobileAccordionsProps) {
  const { t, i18n } = useTranslation('common')
  const dfLocale = dateLocaleFor(i18n.language)

  const mapsQuery = encodeURIComponent(address || `${venueName}, ${commune}, ${city}`)

  return (
    <div className="md:hidden divide-y divide-white/10 border-b border-white/10 px-4">
      {/* About */}
      <AccordionSection title={t('events.about_event')} defaultOpen>
        {description && description.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{description}</p>
        ) : (
          <p className="text-sm italic leading-relaxed text-white/40">
            {t('events.no_description', { defaultValue: 'The organizer hasn’t added a description yet.' })}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag: string) => (
              <Badge key={tag} variant="neutral" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </AccordionSection>

      {/* Venue */}
      <AccordionSection title={t('events.venue_directions')}>
        <p className="text-sm font-medium text-white">{venueName}</p>
        {address && <p className="mt-1 break-words text-sm text-white/60">{address}</p>}
        <p className="text-sm text-white/60">
          {[commune, city].filter(Boolean).join(', ')}
        </p>
        {/* Same placement idea as desktop: address, then the tile, then the two
            map links. Rendered bare (no wrapper div) because the tile returns
            null with no provider key configured, a wrapper would leave its
            margin behind as unexplained blank space inside the accordion. */}
        {venueMap}
        <p className="mt-3 text-sm">
          <a
            href={`https://maps.apple.com/?q=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            {t('events.apple_maps')}
          </a>
          <span className="text-white/25"> · </span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            {t('events.google_maps')}
          </a>
        </p>
      </AccordionSection>

      {/* Date & Time */}
      <AccordionSection title={t('events.date_time')}>
        {/* The server renders in UTC and the browser in the reader's zone, so
            a formatted time legitimately differs between the two passes. */}
        <p className="text-sm text-white" suppressHydrationWarning>
          <span className="text-white/50">{t('events.start', { defaultValue: 'Starts' })}</span>{' '}
          {format(new Date(startDatetime), 'EEEE, MMMM d, yyyy · h:mm a', { locale: dfLocale })}
        </p>
        <p className="mt-1.5 text-sm text-white" suppressHydrationWarning>
          <span className="text-white/50">{t('events.end', { defaultValue: 'Ends' })}</span>{' '}
          {format(new Date(endDatetime), 'EEEE, MMMM d, yyyy · h:mm a', { locale: dfLocale })}
        </p>
      </AccordionSection>

      {/* Organizer */}
      <AccordionSection title={t('events.organizer')}>
        <a
          href={`/profile/organizer/${organizerId}`}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-white">
            {organizerName[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">{organizerName}</p>
            {isVerified && (
              <p className="mt-0.5 text-sm text-brand-400">{t('events.verified_organizer')}</p>
            )}
          </div>
        </a>
      </AccordionSection>

      {/* Share */}
      <AccordionSection title={t('events.share_event')}>{shareButton}</AccordionSection>
    </div>
  )
}
