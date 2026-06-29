'use client'

import { useTranslation } from 'react-i18next'
import BuyTicketButton from './BuyTicketButton'
import FavoriteButton from '@/components/FavoriteButton'
import FollowButton from '@/components/FollowButton'
import EventCard from '@/components/EventCard'
import ShareIconButton from './ShareIconButton'
import ShareButtonInline from './ShareButtonInline'
import MobileHero from './MobileHero'
import MobileKeyFacts from './MobileKeyFacts'
import MobileAccordions from './MobileAccordions'
import WhosGoing from '@/components/events/WhosGoing'
import { Shield, Calendar, MapPin, Clock, Users, TrendingUp, Star, Info } from 'lucide-react'
import { format } from 'date-fns'
import Image from 'next/image'
import Badge from '@/components/ui/Badge'
import { getPosterTheme } from '@/lib/posterGradient'

interface EventDetailsClientProps {
  event: any
  user: any
  isFavorite: boolean
  isFollowing: boolean
  relatedEvents: any[]
}

export default function EventDetailsClient({ event, user, isFavorite, isFollowing, relatedEvents }: EventDetailsClientProps) {
  const { t } = useTranslation('common')
  const startDate = new Date(event.start_datetime)
  const isSoldOut = (event.total_tickets && event.tickets_sold >= event.total_tickets) || false
  const ticketsRemaining = event.total_tickets ? event.total_tickets - (event.tickets_sold || 0) : null
  const isFree = !event.ticket_price || event.ticket_price === 0
  const isPastEvent = event.end_datetime ? new Date(event.end_datetime) < new Date() : new Date(event.start_datetime) < new Date()
  
  // Premium badge logic
  const isVIP = (event.ticket_price || 0) > 100
  const isTrending = (event.tickets_sold || 0) > 10
  const selloutSoon = !isSoldOut && ticketsRemaining !== null && ticketsRemaining < 10
  const posterTheme = getPosterTheme(event.id || event.title, event.category)

  return (
    <div className="min-h-screen pb-mobile-nav md:pb-8">
      {/* MOBILE HERO */}
      <MobileHero
        title={event.title}
        category={event.category}
        bannerUrl={event.banner_image_url}
        organizerName={event.users?.full_name || 'Event Organizer'}
        isVerified={event.users?.is_verified || false}
        organizerId={event.organizer_id}
        isVIP={isVIP}
        isTrending={isTrending}
        isSoldOut={isSoldOut}
        selloutSoon={selloutSoon}
      />

      {/* DESKTOP HERO - Poster-shaped (portrait), editorial layout */}
      <div className="hidden md:block relative overflow-hidden bg-gray-950">
        {/* Ambient blurred backdrop from the poster */}
        {event.banner_image_url ? (
          <div className="absolute inset-0">
            <Image
              src={event.banner_image_url}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover scale-125 blur-3xl opacity-70"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-950/45 via-gray-950/65 to-gray-950/90" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: posterTheme.bg }}>
            <div className="absolute inset-0 bg-gray-950/45 backdrop-blur-2xl" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">

            {/* Poster image — portrait poster shape */}
            <div className="mx-auto w-full max-w-[320px] lg:mx-0 lg:max-w-none">
              <div
                className="poster-vignette relative aspect-[4/5] overflow-hidden rounded-2xl shadow-poster ring-1 ring-white/10"
                style={event.banner_image_url ? undefined : { backgroundImage: posterTheme.bg }}
              >
                {event.banner_image_url ? (
                  <Image
                    src={event.banner_image_url}
                    alt={event.title}
                    fill
                    sizes="(max-width: 1024px) 320px, 340px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <span className="font-display text-[clamp(24px,3vw,38px)] leading-[1.0] text-white/90">
                      {event.title}
                    </span>
                  </div>
                )}
                {/* Status chip overlaid on poster */}
                {(isSoldOut || selloutSoon) && (
                  <div className="absolute left-3 top-3">
                    {isSoldOut ? (
                      <Badge variant="error" size="md">{t('ticket.sold_out_caps')}</Badge>
                    ) : (
                      <Badge variant="warning" size="md">{t('ticket.almost_sold_out')}</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Details column */}
            <div className="min-w-0 text-white">
              {/* Premium Badges + subtle share */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow rounded-lg bg-white/15 px-3 py-1.5 text-[11px] text-white backdrop-blur-md">
                    {event.category}
                  </span>
                  {isVIP && (
                    <Badge variant="vip" size="md" icon={<Star className="w-4 h-4" />}>
                      {t('events.vip_event')}
                    </Badge>
                  )}
                  {isTrending && (
                    <Badge variant="trending" size="md" icon={<TrendingUp className="w-4 h-4" />}>
                      {t('events.trending')}
                    </Badge>
                  )}
                </div>
                <ShareIconButton eventId={event.id} eventTitle={event.title} tone="light" className="shrink-0" />
              </div>

              {/* Title */}
              <h1 className="font-display text-[clamp(30px,4vw,52px)] leading-[1.03] text-white mb-4">
                {event.title}
              </h1>

              {/* Organizer */}
              <a href={`/profile/organizer/${event.organizer_id}`} className="inline-flex items-center gap-3 mb-7 hover:opacity-80 transition-opacity">
                <div className="w-11 h-11 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-base">
                  {(event.users?.full_name || 'E')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm md:text-base">
                    {event.users?.full_name || 'Event Organizer'}
                  </p>
                  {event.users?.is_verified && (
                    <div className="flex items-center gap-1 text-brand-300 text-xs md:text-sm">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{t('events.verified')}</span>
                    </div>
                  )}
                </div>
              </a>

              {/* Key Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                {/* Date & Time */}
                <div className="flex items-start gap-2.5 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] md:text-xs text-white/40 mb-0.5">{t('events.date_time')}</p>
                    <p className="text-white font-semibold text-[13px] md:text-sm">
                      {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                    </p>
                    <p className="text-white/40 text-[11px] md:text-xs">
                      {format(new Date(event.start_datetime), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-2.5 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] md:text-xs text-white/40 mb-0.5">{t('events.venue_name')}</p>
                    <p className="text-white font-semibold text-[13px] md:text-sm line-clamp-1">
                      {event.venue_name}
                    </p>
                    <p className="text-white/40 text-[11px] md:text-xs line-clamp-1">
                      {event.city}
                    </p>
                  </div>
                </div>

                {/* Tickets */}
                <div className="flex items-start gap-2.5 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/20">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] md:text-xs text-white/40 mb-0.5">{t('events.availability')}</p>
                    <p className="text-white font-semibold text-[13px] md:text-sm">
                      {isSoldOut ? t('ticket.sold_out') : isFree ? t('common.free') : t('ticket.available')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {user ? (
              <BuyTicketButton 
                eventId={event.id} 
                userId={user.id} 
                isFree={isFree}
                ticketPrice={event.ticket_price || 0}
                eventTitle={event.title}
                currency={event.currency || 'HTG'}
                country={event.country}
              />
            ) : (
              <a
                href={`/auth/login?redirect=${encodeURIComponent(`/events/${event.id}`)}`}
                className="block w-full bg-brand-600 text-white text-center font-semibold py-3 rounded-xl"
              >
                {t('common.sign_in_to_get_tickets')}
              </a>
            )}
          </div>
          <div className="flex-shrink-0">
            <ShareIconButton eventId={event.id} eventTitle={event.title} tone="dark" />
          </div>
        </div>
        {user && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <FavoriteButton eventId={event.id} userId={user.id} initialIsFavorite={isFavorite} />
          </div>
        )}
      </div>

      <MobileKeyFacts
        startDate={event.start_datetime}
        venueName={event.venue_name}
        city={event.city}
        address={event.address || ''}
        commune={event.commune || ''}
        isFree={Boolean(event.is_free || !event.ticket_price || event.ticket_price === 0)}
        ticketPrice={event.ticket_price || 0}
        currency={event.currency || 'HTG'}
        remainingTickets={ticketsRemaining || 0}
        isSoldOut={isSoldOut}
      />

      <MobileAccordions
        description={event.description}
        tags={event.tags}
        venueName={event.venue_name}
        address={event.address || ''}
        commune={event.commune || ''}
        city={event.city}
        startDatetime={event.start_datetime}
        endDatetime={event.end_datetime || event.start_datetime}
        organizerName={event.users?.full_name || 'Event Organizer'}
        organizerId={event.organizer_id}
        isVerified={event.users?.is_verified || false}
        shareButton={
          <ShareButtonInline
            eventId={event.id}
            eventTitle={event.title}
            eventDate={format(new Date(event.start_datetime), 'MMM d, yyyy')}
            eventVenue={`${event.venue_name}, ${event.city}`}
          />
        }
      />

      {/* MAIN CONTENT - Desktop */}
      <div className="max-w-7xl mx-auto px-0 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-4 md:px-0">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Desktop About Section */}
            <div className="hidden md:block rounded-2xl  p-3 sm:p-4 md:p-6">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400" />
                {t('events.about_event')}
              </h2>
              {event.description && event.description.trim() ? (
                <p className="text-sm sm:text-[15px] text-white/70 whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              ) : (
                <p className="text-sm sm:text-[15px] italic text-white/40 leading-relaxed">
                  {t('events.no_description', { defaultValue: 'The organizer hasn’t added a description yet.' })}
                </p>
              )}
            </div>

            {/* Venue Details - Desktop */}
            <div className="hidden md:block rounded-2xl  p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-white mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-400" />
                {t('events.venue_information')}
              </h2>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-1">{t('events.venue_name')}</p>
                  <p className="text-base font-semibold text-white">{event.venue_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-1">{t('events.address')}</p>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[15px] text-white/70">{event.address || t('events.address_not_specified')}</p>
                      <p className="text-[15px] text-white/70">{event.commune}, {event.city}</p>
                    </div>
                    <div className="flex gap-3 pt-0.5">
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(event.address || `${event.venue_name}, ${event.commune}, ${event.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {t('events.apple_maps')}
                      </a>
                      <span className="text-white/20">|</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || `${event.venue_name}, ${event.commune}, ${event.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1"
                      >
                        <MapPin className="w-4 h-4" />
                        {t('events.google_maps')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time Details - Desktop */}
            <div className="hidden md:block rounded-2xl  p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" />
                {t('events.date_and_time')}
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-white/50 mb-1">{t('events.start')}</p>
                  <p className="text-base font-semibold text-white">
                    {format(new Date(event.start_datetime), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-white/55">
                    {format(new Date(event.start_datetime), 'h:mm a')}
                  </p>
                </div>
                {event.end_datetime && (
                  <div>
                    <p className="text-xs font-semibold text-white/50 mb-1">{t('events.end')}</p>
                    <p className="text-base font-semibold text-white">
                      {format(new Date(event.end_datetime), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-white/55">
                      {format(new Date(event.end_datetime), 'h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Organizer Info - Desktop */}
            <div className="hidden md:block rounded-2xl  p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-400" />
                {t('events.organizer')}
              </h2>
              <a href={`/profile/organizer/${event.organizer_id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {(event.users?.full_name || 'E')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white text-base">
                    {event.users?.full_name || 'Event Organizer'}
                  </p>
                  {event.users?.is_verified && (
                    <div className="flex items-center gap-1 text-brand-400 text-sm mt-1">
                      <Shield className="w-4 h-4" />
                      <span>{t('events.verified_organizer')}</span>
                    </div>
                  )}
                </div>
              </a>
            </div>
          </div>

          {/* Right Column - Ticket Purchase Sidebar */}
          <div className="lg:col-span-1">
            <div className="hidden md:block sticky top-8 rounded-2xl shadow-lg  p-6">
              <div className="mb-6">
                {isFree ? (
                  <div>
                    <p className="text-3xl font-bold text-brand-400">{t('common.free')}</p>
                    <p className="text-sm text-white/55 mt-1">{t('events.no_ticket_required')}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-bold text-white">
                      {event.currency || 'HTG'} {(event.ticket_price || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-white/55 mt-1">{t('events.per_ticket')}</p>
                  </div>
                )}
              </div>

              {isPastEvent ? (
                <div className="text-center py-4">
                  <Badge variant="neutral" size="lg">Event Ended</Badge>
                  <p className="text-sm text-white/55 mt-2">This event has ended. Tickets are no longer available.</p>
                </div>
              ) : isSoldOut ? (
                <div className="text-center py-4">
                  <Badge variant="error" size="lg">{t('ticket.sold_out_caps')}</Badge>
                  <p className="text-sm text-white/55 mt-2">{t('events.event_reached_capacity')}</p>
                </div>
              ) : (
                <>
                  {user ? (
                    <>
                      <BuyTicketButton 
                        eventId={event.id} 
                        userId={user.id} 
                        isFree={isFree}
                        ticketPrice={event.ticket_price || 0}
                        eventTitle={event.title}
                        currency={event.currency || 'HTG'}
                        country={event.country}
                      />
                      <div className="mt-4">
                        <FavoriteButton eventId={event.id} userId={user.id} initialIsFavorite={isFavorite} />
                      </div>
                    </>
                  ) : (
                    <>
                      <a
                        href={`/auth/login?redirect=${encodeURIComponent(`/events/${event.id}`)}`}
                        className="block w-full bg-brand-600 text-white text-center font-semibold py-4 rounded-xl hover:bg-brand-700 transition-colors"
                      >
                        {t('events.sign_in_to_get_tickets')}
                      </a>
                      <p className="text-xs text-white/50 text-center mt-3">{t('events.create_account_to_purchase')}</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Who's Going - social attendance */}
        <div className="mt-8 px-4 md:px-0">
          <WhosGoing eventId={event.id} currentUserId={user?.id || null} />
        </div>

        {/* Related Events Section */}
        {relatedEvents?.length > 0 && (
          <div className="mt-12 px-4 md:px-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">{t('events.similar_events')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedEvents.map((e: any) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
