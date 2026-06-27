import { getNearbyEvents } from '@/lib/recommendations'
import EventCard from '@/components/EventCard'
import EventCardHorizontal from '@/components/EventCardHorizontal'

export default async function NearbySection() {
  // For now, using Port-au-Prince as default
  const nearbyEvents = await getNearbyEvents('Port-au-Prince', 12)

  if (!nearbyEvents || nearbyEvents.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-soft">
        <div className="text-7xl mb-4">📍</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Nearby Events</h3>
        <p className="text-gray-600">Try searching for events in other cities</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile: Horizontal Cards */}
      <div className="md:hidden space-y-4">
        {nearbyEvents.map((event: any) => (
          <EventCardHorizontal key={event.id} event={event} />
        ))}
      </div>

      {/* Desktop: Grid Cards */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nearbyEvents.map((event: any) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </>
  )
}
