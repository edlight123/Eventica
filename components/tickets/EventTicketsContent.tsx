'use client'

import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
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
  Wallet,
  ChevronRight,
  ArrowRight,
  Sparkles,
  QrCode
} from 'lucide-react'
import Badge from '@/components/ui/Badge'

interface EventTicketsContentProps {
  event: any
  tickets: any[]
}

export default function EventTicketsContent({ event, tickets }: EventTicketsContentProps) {
  const { t } = useTranslation('tickets')

  const cleanTitle = String(event.title || 'Event').replace(/^\[[^\]]*\]\s*/, '')

  const validTickets = tickets.filter(t => t && !t.checked_in_at && t.status === 'valid')
  const usedTickets = tickets.filter(t => t && t.checked_in_at)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Event Hero Card */}
      <div className="relative bg-[#0a0a0a] rounded-none border border-white/10 overflow-hidden mb-6">
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
                    : t('event_tickets.tickets_count', { count: tickets.length })
                  }
                </Badge>
                {validTickets.length > 0 && (
                  <Badge variant="primary" size="sm">
                    {t('event_tickets.active_badge', { count: validTickets.length })}
                  </Badge>
                )}
              </div>
              <h1 className="font-display italic text-2xl md:text-3xl lg:text-4xl text-white mb-1 line-clamp-2">{cleanTitle}</h1>
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
                <p className="label-mono text-[10px] md:text-[11px] text-brand-300 uppercase mb-1.5">{t('event_tickets.date_time')}</p>
                {event.start_datetime ? (
                  <>
                    <p className="label-mono text-[13px] md:text-[14px] text-white truncate">
                      {format(new Date(event.start_datetime), 'EEE, MMM d, yyyy')}
                    </p>
                    <p className="label-mono text-[12px] text-white/65 truncate">
                      {event.end_datetime
                        ? `${format(new Date(event.start_datetime), 'h:mm a')} - ${format(new Date(event.end_datetime), 'h:mm a')}`
                        : format(new Date(event.start_datetime), 'h:mm a')
                      }
                    </p>
                  </>
                ) : (
                  <>
                    <p className="label-mono text-[13px] md:text-[14px] text-white uppercase">{t('event_tickets.date_tba')}</p>
                    <p className="label-mono text-[12px] text-white/65 uppercase">{t('event_tickets.time_tba')}</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 md:p-4 rounded-lg border border-white/10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="label-mono text-[10px] md:text-[11px] text-brand-300 uppercase mb-1.5">{t('event_tickets.venue')}</p>
                <p className="label-mono text-[13px] md:text-[14px] text-white truncate">{String(event.venue_name || t('event_tickets.venue_tba'))}</p>
                <p className="label-mono text-[12px] text-white/65 truncate">{String(event.commune || t('event_tickets.location_tba'))}, {String(event.city || t('event_tickets.location_tba'))}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tickets Section */}
      {validTickets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <TicketIcon className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
              {t('event_tickets.active_tickets')}
            </h2>
            <Badge variant="success" size="sm">
              {t('event_tickets.ready_badge', { count: validTickets.length })}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {validTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="group relative bg-[#0a0a0a] rounded-xl border border-white/10 hover:border-brand-400 transition-all overflow-visible"
              >
                {/* Ticket Number Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <div className="label-mono px-2.5 py-0.5 bg-brand-600 text-white text-[10px] uppercase rounded-full shadow-lg">
                    {t('event_tickets.ticket_number', { number: index + 1 })}
                  </div>
                </div>

                <div className="relative h-1.5 bg-gradient-to-r from-brand-500 to-brand-600" />

                {/* QR Code Section */}
                <div className="p-4 md:p-6 text-center">
                  <div className="inline-block p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-inner border border-white/10">
                    {ticket.qr_code_data ? (
                      <div className="w-[240px] h-[240px] sm:w-[200px] sm:h-[200px]">
                        <QRCodeDisplay value={ticket.qr_code_data} size={240} />
                      </div>
                    ) : (
                      <div className="w-[240px] h-[240px] sm:w-[200px] sm:h-[200px] flex items-center justify-center bg-white/[0.04] rounded-lg">
                        <p className="text-sm text-white/50">{t('event_tickets.qr_unavailable')}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-0.5">
                    <p className="label-mono text-[10px] md:text-[11px] text-white/50 uppercase">{t('event_tickets.ticket_id')}</p>
                    <p className="text-[11px] md:text-xs font-mono tracking-wide text-white">{ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 md:p-4 border-t border-dashed border-white/10 bg-[#0a0a0a] space-y-2">
                  {!isDemoMode() && (
                    <>
                      <AddToWalletButton
                        ticket={ticket}
                        event={event}
                      />
                      
                      <a
                        href={`/tickets/${ticket.id}`}
                        className="group/btn flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#0a0a0a] hover:bg-[#0a0a0a] text-white/70 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        {t('event_tickets.transfer_ticket')}
                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </a>
                    </>
                  )}
                </div>

                {/* Purchase Info */}
                <div className="px-3 pb-3">
                  <p className="label-mono text-[10px] uppercase text-white/50 text-center">
                    {ticket.purchased_at ? t('event_tickets.purchased_at', { date: format(new Date(ticket.purchased_at), 'MMM d, yyyy') }) : t('event_tickets.ticket')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Used Tickets Section */}
      {usedTickets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              {t('event_tickets.used_tickets')}
            </h2>
            <Badge variant="neutral" size="sm">
              {t('event_tickets.used_badge', { count: usedTickets.length })}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {usedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="relative bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden opacity-75"
              >
                <div className="absolute top-3 right-3 z-10">
                  <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
                    {t('event_tickets.used')}
                  </Badge>
                </div>

                <div className="relative h-1.5 bg-gradient-to-r from-gray-300 to-gray-400" />

                <div className="p-4 md:p-6 text-center">
                  <div className="inline-block p-4 md:p-6 bg-white/[0.04] rounded-xl border border-white/10">
                    {ticket.qr_code_data ? (
                      <div className="w-[200px] h-[200px] sm:w-[180px] sm:h-[180px]">
                        <QRCodeDisplay value={ticket.qr_code_data} size={200} />
                      </div>
                    ) : (
                      <div className="w-[200px] h-[200px] sm:w-[180px] sm:h-[180px] flex items-center justify-center bg-white/[0.06] rounded-lg">
                        <p className="text-sm text-white/50">{t('event_tickets.qr_used')}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      {t('event_tickets.checked_in')}
                    </Badge>
                    <p className="label-mono text-[12px] text-white/65">
                      {ticket.checked_in_at ? format(new Date(ticket.checked_in_at), 'MMM d, yyyy • h:mm a') : t('event_tickets.used')}
                    </p>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <p className="text-[11px] text-white/50 text-center font-mono tracking-wide">
                    {ticket.id ? ticket.id.slice(0, 16) + '...' : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-0.5">{t('event_tickets.how_to_use.title')}</h3>
              <p className="text-[13px] text-white/65">{t('event_tickets.how_to_use.subtitle')}</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-[13px] text-white/70">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.how_to_use.unique_qr')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.how_to_use.scan_once')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.how_to_use.digital_print')}</span>
            </li>
          </ul>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-0.5">{t('event_tickets.save_wallet.title')}</h3>
              <p className="text-[13px] text-white/65">{t('event_tickets.save_wallet.subtitle')}</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-[13px] text-white/70">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.save_wallet.add_wallet')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.save_wallet.access_offline')}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-brand-600" />
              <span>{t('event_tickets.save_wallet.auto_reminders')}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <a
          href={`/events/${event.id}`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0a0a0a] hover:bg-[#0a0a0a] text-white/70 border border-white/10 hover:border-brand-400 text-sm font-semibold rounded-lg transition-all"
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
