'use client'

import { useState } from 'react'
import Image from 'next/image'
import { EventHeader } from '@/components/organizer/event-detail/EventHeader'
import { EventKpis } from '@/components/organizer/event-detail/EventKpis'
import { EventChecklist } from '@/components/organizer/event-detail/EventChecklist'
import { EventTabs } from '@/components/organizer/event-detail/EventTabs'
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
  const [activeTab, setActiveTab] = useState<'overview'>('overview')
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublishToggle = async () => {
    setIsPublishing(true)
    try {
      const response = await fetch(`/api/events/${event.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !event.is_published })
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to toggle publish status:', error)
    } finally {
      setIsPublishing(false)
    }
  }

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
    <>
      <EventHeader 
        event={event}
        onPublishToggle={handlePublishToggle}
        isPublishing={isPublishing}
      />

      <EventTabs
        activeTab={activeTab}
        onTabChange={setActiveTab as any}
        eventId={event.id}
        ticketCount={stats.ticketsSold}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {/* Timing Badge */}
        <div className="mb-6">
          <EventTimingBadge startDateTime={event.start_datetime} />
        </div>

        {/* KPIs */}
        <div className="mb-6">
          <EventKpis stats={stats} />
        </div>

        {/* Needs Attention Checklist */}
        <div className="mb-6">
          <EventChecklist eventId={event.id} items={checklistItems} />
        </div>

        {/* Overview Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <TicketTiersCard eventId={event.id} tiers={tiers} currency={event?.currency} />
            <VenueCard 
              eventId={event.id} 
              venue={{
                name: event.venue_name,
                address: event.address,
                city: event.city,
                commune: event.commune,
                is_online: event.is_online,
                meeting_url: event.meeting_url
              }}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Event Banner */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Event Banner</h3>
              {event.banner_image_url ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image 
                    src={event.banner_image_url} 
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No banner image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Timeline */}
            <EventActivityTimeline activities={activities} />
          </div>
        </div>

        {/* Event Description */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {event.description || 'No description provided'}
          </p>
        </div>
      </div>
    </>
  )
}
