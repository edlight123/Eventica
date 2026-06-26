'use client'

import Image from 'next/image'
import { EventKpis } from '@/components/organizer/event-detail/EventKpis'
import { EventChecklist } from '@/components/organizer/event-detail/EventChecklist'
import { EventTimingBadge } from '@/components/organizer/event-detail/EventTimingBadge'
import { TicketTiersCard } from '@/components/organizer/event-detail/TicketTiersCard'
import { VenueCard } from '@/components/organizer/event-detail/VenueCard'
import { EventActivityTimeline } from '@/components/organizer/event-detail/EventActivityTimeline'
import { Image as ImageIcon } from 'lucide-react'
import { formatMoneyFromCents, normalizeCurrency } from '@/lib/money'

interface EventCommandCenterProps {
  event: any
  stats: any
  tickets: any[]
  tiers: any[]
}

export function EventCommandCenter({ event, stats, tickets, tiers }: EventCommandCenterProps) {
  // Build checklist
  const checklistItems = [
    {
      id: 'banner',
      label: 'Add cover image',
      completed: !!event.banner_image_url,
      href: `/organizer/events/${event.id}/edit#banner`,
      ctaText: 'Upload',
      priority: 'high' as const
    },
    {
      id: 'tiers',
      label: 'Configure ticket tiers',
      completed: tiers.length > 0,
      href: `/organizer/events/${event.id}/edit#tickets`,
      ctaText: 'Setup',
      priority: 'high' as const
    },
    {
      id: 'venue',
      label: 'Add venue details',
      completed: !!(event.venue_name || event.is_online),
      href: `/organizer/events/${event.id}/edit#venue`,
      ctaText: 'Add',
      priority: 'medium' as const
    },
    {
      id: 'description',
      label: 'Complete event description',
      completed: event.description && event.description.length > 100,
      href: `/organizer/events/${event.id}/edit#description`,
      ctaText: 'Edit',
      priority: 'medium' as const
    },
  ]

  // Generate activity timeline (mock for now)
  const activities = tickets.slice(0, 5).map((ticket: any, index: number) => ({
    id: `ticket-${ticket.id}`,
    type: 'ticket_sold' as const,
    description: (() => {
      const currency = normalizeCurrency(ticket?.currency, event?.currency || 'HTG')
      const cents = Math.round((Number(ticket?.price_paid || 0) || 0) * 100)
      return `Ticket sold for ${formatMoneyFromCents(cents, currency)}`
    })(),
    timestamp: ticket.purchased_at || new Date().toISOString()
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
        {/* Left rail — the vertical flyer (matches the 4:5 poster the event page uses) */}
        <aside className="space-y-4 lg:sticky lg:top-[104px] lg:self-start">
          {event.banner_image_url ? (
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/10">
              <Image src={event.banner_image_url} alt={event.title} fill sizes="300px" className="object-cover" />
            </div>
          ) : (
            <a
              href={`/organizer/events/${event.id}/edit#banner`}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#141414] text-center text-white/50 transition-colors hover:border-brand-400/40 hover:text-white/70"
            >
              <ImageIcon className="mb-2 h-10 w-10" />
              <span className="text-sm font-medium">Add a flyer</span>
              <span className="mt-1 text-xs text-white/40">Portrait 4:5 looks best</span>
            </a>
          )}
          <EventTimingBadge startDateTime={event.start_datetime} />
        </aside>

        {/* Main column — overview */}
        <div className="min-w-0 space-y-6">
          <EventKpis stats={stats} />

          <EventChecklist eventId={event.id} items={checklistItems} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TicketTiersCard eventId={event.id} tiers={tiers} currency={event?.currency} />
            <VenueCard
              eventId={event.id}
              venue={{
                name: event.venue_name,
                address: event.address,
                city: event.city,
                commune: event.commune,
                is_online: event.is_online,
                meeting_url: event.meeting_url,
              }}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-[#141414] p-5 shadow-sm">
            <h3 className="mb-3 text-lg font-bold text-white">Description</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {event.description || 'No description provided'}
            </p>
          </div>

          <EventActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  )
}
