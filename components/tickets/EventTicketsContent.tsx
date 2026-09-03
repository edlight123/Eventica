'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, isValid } from 'date-fns'
import Image from 'next/image'
import QRCodeDisplay from '@/app/tickets/[id]/QRCodeDisplay'
import AddToWalletButton from '@/components/AddToWalletButton'
import { isDemoMode } from '@/lib/demo'
import {
  Calendar,
  MapPin,
  Ticket as TicketIcon,
  CheckCircle2,
  Share2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Sparkles,
  CalendarPlus,
  Navigation,
  User as UserIcon,
} from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface EventTicketsContentProps {
  event: any
  tickets: any[]
}

const FALLBACK = ', '

/** date-fns `format` throws on invalid dates; always guard through this. */
function safeFormat(value: any, fmt: string, fallback: string = FALLBACK): string {
  if (!value) return fallback
  const d = new Date(value)
  return isValid(d) ? format(d, fmt) : fallback
}

/** Compact UTC stamp for Google Calendar, e.g. 20260815T210000Z. Null if invalid. */
function toCalendarStamp(value: any): string | null {
  if (!value) return null
  const d = new Date(value)
  if (!isValid(d)) return null
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/** Short human reference derived from the ticket doc id (not the raw id). */
function shortReference(id: any): string {
  const raw = String(id || '')
  if (!raw) return FALLBACK
  return raw.slice(-6).toUpperCase()
}

export default function EventTicketsContent({ event, tickets }: EventTicketsContentProps) {
  const { t } = useTranslation('tickets')
  const [showUsed, setShowUsed] = useState(false)

  const cleanTitle = String(event.title || 'Event').replace(/^\[[^\]]*\]\s*/, '')

  const validTickets = tickets.filter((t) => t && !t.checked_in_at && t.status === 'valid')
  const usedTickets = tickets.filter((t) => t && t.checked_in_at)

  const locationParts = [event.venue_name, event.commune, event.city].filter(Boolean)
  const locationQuery = String(event.address || locationParts.join(', ') || '').trim()
  const directionsUrl = locationQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
    : null

  // Build a Google Calendar link from the event date/title/venue (guarded).
  const calendarStart = toCalendarStamp(event.start_datetime)
  let calendarUrl: string | null = null
  if (calendarStart) {
    const startDate = new Date(event.start_datetime)
    // Fall back to a 2h duration when no end time is available.
    const calendarEnd =
      toCalendarStamp(event.end_datetime) ||
      toCalendarStamp(new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString())
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: cleanTitle,
      dates: `${calendarStart}/${calendarEnd}`,
      details: t('event_tickets.ready'),
    })
    if (locationQuery) params.set('location', locationQuery)
    calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Event Hero Card */}
      <div className="relative bg-white/[0.03] rounded-none border border-white/10 overflow-hidden mb-6">
        {/* Banner Image */}
        {event.banner_image_url ? (
          <div className="relative h-32 sm:h-48 md:h-56 bg-gradient-to-br from-brand-700 to-[#0C5E57]">
            <Image
              src={event.banner_image_url}
              alt={cleanTitle}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="h-32 sm:h-48 md:h-56 bg-gradient-to-br from-brand-700 to-[#0C5E57] relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-10 right-20 w-64 h-64 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-20 w-80 h-80 rounded-full blur-3xl" />
            <span className="relative font-display text-5xl md:text-6xl text-[#F8F5EE]">T</span>
          </div>
        )}

        {/* Event Info */}
        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success" size="md" icon={<Sparkles className="w-3.5 h-3.5" />}>
                  {tickets.length > 1
                    ? t('event_tickets.tickets_count_plural', { count: tickets.length })
                    : t('event_tickets.tickets_count', { count: tickets.length })}
                </Badge>
                {validTickets.length > 0 && (
                  <Badge variant="primary" size="sm">
                    {t('event_tickets.active_badge', { count: validTickets.length })}
                  </Badge>
                )}
              </div>
              <h1 className="font-display italic text-2xl md:text-3xl lg:text-4xl text-white mb-1 line-clamp-2">
                {cleanTitle}
              </h1>
              <p className="text-[13px] md:text-sm text-white/65">{t('event_tickets.ready')}</p>
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 md:p-4 rounded-lg border border-white/10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-mono text-[10px] md:text-[11px] text-brand-300 uppercase mb-1.5">
                  {t('event_tickets.date_time')}
                </p>
                {event.start_datetime ? (
                  <>
                    <p className="label-mono text-[13px] md:text-[14px] text-white truncate">
                      {safeFormat(event.start_datetime, 'EEE, MMM d, yyyy', t('event_tickets.date_tba'))}
                    </p>
                    <p className="label-mono text-[12px] text-white/65 truncate">
                      {event.end_datetime
                        ? `${safeFormat(event.start_datetime, 'h:mm a')} - ${safeFormat(event.end_datetime, 'h:mm a')}`
                        : safeFormat(event.start_datetime, 'h:mm a')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="label-mono text-[13px] md:text-[14px] text-white uppercase">
                      {t('event_tickets.date_tba')}
                    </p>
                    <p className="label-mono text-[12px] text-white/65 uppercase">
                      {t('event_tickets.time_tba')}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 md:p-4 rounded-lg border border-white/10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-mono text-[10px] md:text-[11px] text-brand-300 uppercase mb-1.5">
                  {t('event_tickets.venue')}
                </p>
                <p className="label-mono text-[13px] md:text-[14px] text-white truncate">
                  {String(event.venue_name || t('event_tickets.venue_tba'))}
                </p>
                <p className="label-mono text-[12px] text-white/65 truncate">
                  {String(event.commune || t('event_tickets.location_tba'))},{' '}
                  {String(event.city || t('event_tickets.location_tba'))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tickets — the hero: inverted white stubs */}
      {validTickets.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <TicketIcon className="w-5 h-5 md:w-6 md:h-6 text-brand-400" />
              {t('event_tickets.active_tickets')}
            </h2>
            <Badge variant="success" size="sm">
              {t('event_tickets.ready_badge', { count: validTickets.length })}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {validTickets.map((ticket, index) => {
              const qrValue = ticket.qr_code_data || ticket.id
              const qrId = `ticket-qr-${ticket.id || index}`
              const tierName = ticket.tier_name || t('event_tickets.ticket')
              const holderName = ticket.attendee_name
              return (
                <div
                  key={ticket.id || index}
                  className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] shadow-xl"
                >
                  {/* Inverted white physical stub */}
                  <div className="bg-white text-black p-5 md:p-6">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <p className="label-mono text-[10px] uppercase tracking-wide text-black/50">
                          {t('event_tickets.ticket_number', { number: index + 1 })}
                        </p>
                        <h3 className="font-display italic text-xl md:text-2xl leading-tight text-black line-clamp-2">
                          {cleanTitle}
                        </h3>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {tierName}
                      </span>
                    </div>

                    {/* Holder */}
                    {holderName && (
                      <div className="flex items-center gap-2 mb-4 text-black/70">
                        <UserIcon className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] uppercase tracking-wide text-black/50">
                          {t('event_tickets.holder')}
                        </span>
                        <span className="text-sm font-semibold text-black truncate">{holderName}</span>
                      </div>
                    )}

                    {/* QR — dominant, on white for reliable scanning */}
                    <div className="flex flex-col items-center">
                      {qrValue ? (
                        <div className="w-[240px] max-w-full">
                          <QRCodeDisplay value={qrValue} size={240} id={qrId} />
                        </div>
                      ) : (
                        <div className="w-[240px] max-w-full aspect-square flex items-center justify-center rounded-lg bg-black/5">
                          <p className="text-sm text-black/50">{t('event_tickets.qr_unavailable')}</p>
                        </div>
                      )}
                      <p className="mt-3 text-[11px] uppercase tracking-wide text-black/50">
                        {t('event_tickets.scan_at_entrance')}
                      </p>
                    </div>

                    {/* Reference */}
                    <div className="mt-4 pt-4 border-t border-dashed border-black/15 flex items-center justify-between">
                      <span className="label-mono text-[10px] uppercase tracking-wide text-black/50">
                        {t('event_tickets.reference')}
                      </span>
                      <span className="font-mono text-sm font-semibold tracking-wider text-black">
                        {shortReference(ticket.id)}
                      </span>
                    </div>
                  </div>

                  {/* Dark action stack (post-purchase utilities) */}
                  <div className="p-3 md:p-4 space-y-2">
                    {calendarUrl && (
                      <a
                        href={calendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        {t('event_tickets.add_to_calendar')}
                      </a>
                    )}
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
                      >
                        <Navigation className="w-4 h-4" />
                        {t('event_tickets.get_directions')}
                      </a>
                    )}
                    {!isDemoMode() && (
                      <>
                        <AddToWalletButton ticket={ticket} event={event} qrElementId={qrId} />
                        <a
                          href={`/tickets/${ticket.id}`}
                          className="group/btn flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          {t('event_tickets.transfer_ticket')}
                          <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </a>
                      </>
                    )}
                    <p className="label-mono text-[10px] uppercase text-white/40 text-center pt-1">
                      {ticket.purchased_at
                        ? t('event_tickets.purchased_at', {
                            date: safeFormat(ticket.purchased_at, 'MMM d, yyyy'),
                          })
                        : t('event_tickets.ticket')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Used Tickets — demoted, compact, collapsible, no large QR */}
      {usedTickets.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowUsed((v) => !v)}
            aria-expanded={showUsed}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:border-white/20 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm md:text-base font-bold text-white">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {t('event_tickets.used_tickets')}
              <span className="text-white/50 font-normal">
                {t('event_tickets.used_count', { count: usedTickets.length })}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-[12px] uppercase tracking-wide text-white/60">
              {showUsed ? t('event_tickets.hide') : t('event_tickets.show')}
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showUsed ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {showUsed && (
            <ul className="mt-2 divide-y divide-white/5 rounded-xl border border-white/10 overflow-hidden">
              {usedTickets.map((ticket, index) => (
                <li
                  key={ticket.id || index}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/80 truncate">
                        {ticket.tier_name || t('event_tickets.ticket')}
                      </p>
                      <p className="label-mono text-[11px] text-white/45">
                        {ticket.checked_in_at
                          ? safeFormat(ticket.checked_in_at, 'MMM d, yyyy • h:mm a')
                          : t('event_tickets.used')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                    {t('event_tickets.used')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <a
          href={`/events/${event.id}`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.04] text-white/70 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
        >
          {t('event_tickets.view_event_details')}
          <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href="/tickets"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {t('event_tickets.all_my_tickets')}
          <TicketIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
