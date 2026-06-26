'use client'

import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, DollarSign, Edit, Eye, MapPin, QrCode, Share2 } from 'lucide-react'
import { StatusChip } from '@/components/ui/kit'
import { formatMoneyFromCents, formatPrimaryMoneyFromCentsByCurrency } from '@/lib/money'
import { getPosterTheme } from '@/lib/posterGradient'

export interface EventPosterCardEvent {
  id: string
  title: string
  banner_image_url?: string
  start_datetime: string
  is_published: boolean
  tickets_sold: number
  total_tickets: number
  city?: string
  venue_name?: string
  location_name?: string
  currency?: string
  revenueByCurrencyCents: Record<string, number>
  category?: string
}

interface EventPosterCardProps {
  event: EventPosterCardEvent
}

/**
 * Poster-style card for the dashboard events grid.
 * Uses the unified Firestore field names (is_published, tickets_sold, total_tickets).
 * The list-row variant lives in OrganizerEventCard.tsx.
 */
export function EventPosterCard({ event }: EventPosterCardProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const manageHref = `/organizer/events/${event.id}`

  const safeTotal = Number.isFinite(event.total_tickets) ? event.total_tickets : Number(event.total_tickets || 0)
  const safeSold = Number.isFinite(event.tickets_sold) ? event.tickets_sold : Number(event.tickets_sold || 0)
  const progress = safeTotal > 0 ? (safeSold / safeTotal) * 100 : 0

  const startDate = new Date(event.start_datetime)

  const revenueText = (() => {
    const nonZero = Object.entries(event.revenueByCurrencyCents).filter(([, cents]) => (cents || 0) !== 0)
    if (nonZero.length >= 1) {
      return formatPrimaryMoneyFromCentsByCurrency(event.revenueByCurrencyCents, event.currency, 'en-US', { currencyDisplay: 'code' })
    }
    return '—'
  })()

  const hasImage = Boolean(event.banner_image_url)
  const theme = getPosterTheme(event.id || event.title, event.category)
  const venue = event.location_name || event.venue_name || event.city

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Manage ${event.title}`}
      onClick={() => router.push(manageHref)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(manageHref)
        }
      }}
      className="hover-lift group block cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-poster-sm transition-all duration-300 hover:border-brand-500/30 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {/* Poster */}
      <div
        className="poster-vignette relative flex aspect-[4/5] flex-col justify-between overflow-hidden p-3.5 text-white"
        style={hasImage ? undefined : { backgroundImage: theme.bg }}
      >
        {hasImage && (
          <>
            <Image
              src={event.banner_image_url as string}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-[1.1s] ease-out group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/30" />
          </>
        )}

        {/* Status chip */}
        <div className="relative z-10 flex justify-end">
          <StatusChip tone={event.is_published ? 'success' : 'neutral'} className="shadow-sm">
            {event.is_published ? t('event_card.published') : t('event_card.draft')}
          </StatusChip>
        </div>

        {/* Centered title when no image */}
        {!hasImage && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-5 text-center">
            <h3 className="font-display text-[26px] leading-[0.98] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.45)] line-clamp-4">
              {event.title}
            </h3>
          </div>
        )}

        {/* Bottom overlay */}
        <div className="relative z-10 space-y-1.5">
          {hasImage && (
            <h3 className="font-display text-[22px] leading-[1.02] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)] line-clamp-2">
              {event.title}
            </h3>
          )}
          <div className="eyebrow flex items-center gap-1.5 text-[10px] tracking-[0.06em] text-white/85">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {venue && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-white/80">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{venue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Management footer */}
      <div className="p-4">
        {/* Progress */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/60">{t('event_card.tickets_sold')}</span>
            <span className="font-semibold text-white">
              {safeSold} / {safeTotal}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-white/50">
            {progress.toFixed(0)}% {t('event_card.capacity')}
          </p>
        </div>

        {/* Revenue */}
        <div className="mb-4 flex items-center gap-2 text-sm text-white/70">
          <DollarSign className="h-4 w-4 text-white/40" />
          <span className="text-white/60">Revenue:</span>
          <span className="truncate font-semibold text-white">{revenueText}</span>
        </div>

        {/* Quick actions */}
        <div
          className="grid grid-cols-5 gap-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {[
            { href: `/organizer/events/${event.id}/edit`, icon: Edit, label: t('event_card.manage') },
            { href: `/organizer/events/${event.id}/earnings`, icon: DollarSign, label: 'Earnings' },
            { href: `/events/${event.id}`, icon: Share2, label: t('event_card.promote'), external: true },
            { href: `/organizer/events/${event.id}/attendees`, icon: Eye, label: t('event_card.attendees') },
            { href: `/organizer/scan/${event.id}`, icon: QrCode, label: t('event_card.checkin') },
          ].map(({ href, icon: Icon, label, external }) => (
            <Link
              key={href}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              aria-label={label}
              className="group/btn flex flex-col items-center justify-center gap-1 rounded-lg p-2 transition-colors hover:bg-brand-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <Icon className="h-4 w-4 text-white/60 group-hover/btn:text-brand-300" />
              <span className="text-xs font-medium text-white/60 group-hover/btn:text-brand-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
