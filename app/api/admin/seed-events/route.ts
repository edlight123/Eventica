import { NextRequest, NextResponse } from 'next/server'
import { requireDevTools } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

type TemplateEvent = {
  name: string
  country: 'HT' | 'US' | 'CA'
  category: string
  price: number
  currency: 'USD' | 'HTG'
  city: string
  commune: string
  venue_name: string
  address: string
}

const templateEvents: TemplateEvent[] = [
  // Haiti Events (15 events - 50%)
  { name: 'Carnaval de Port-au-Prince', country: 'HT', category: 'Festival', price: 50, currency: 'USD', city: 'Port-au-Prince', commune: 'Port-au-Prince', venue_name: 'Champ de Mars', address: 'Champ de Mars, Port-au-Prince' },
  { name: 'Festival de Jazz de Port-au-Prince', country: 'HT', category: 'Music', price: 4500, currency: 'HTG', city: 'Port-au-Prince', commune: 'Turgeau', venue_name: 'Parc de Martissant', address: 'Parc de Martissant, Port-au-Prince' },
  { name: 'Fête Gede Celebration', country: 'HT', category: 'Cultural', price: 25, currency: 'USD', city: 'Port-au-Prince', commune: 'Port-au-Prince', venue_name: 'Centre Culturel', address: 'Centre-Ville, Port-au-Prince' },
  { name: 'Haitian Art Exhibition', country: 'HT', category: 'Arts & Culture', price: 2000, currency: 'HTG', city: 'Pétion-Ville', commune: 'Pétion-Ville', venue_name: 'Musée d\'Art Haïtien', address: 'Pétion-Ville, Ouest' },
  { name: 'Compas Music Festival', country: 'HT', category: 'Music', price: 60, currency: 'USD', city: 'Cap-Haïtien', commune: 'Cap-Haïtien', venue_name: 'Place d\'Armes', address: 'Centre-ville, Cap-Haïtien' },
  { name: 'Haitian Food Festival', country: 'HT', category: 'Food & Drink', price: 3000, currency: 'HTG', city: 'Jacmel', commune: 'Jacmel', venue_name: 'Jacmel Waterfront', address: 'Waterfront, Jacmel' },
  { name: 'Rara Street Festival', country: 'HT', category: 'Festival', price: 1500, currency: 'HTG', city: 'Gonaïves', commune: 'Gonaïves', venue_name: 'Main Street', address: 'Centre-ville, Gonaïves' },
  { name: 'Haitian Independence Day Celebration', country: 'HT', category: 'Cultural', price: 35, currency: 'USD', city: 'Port-au-Prince', commune: 'Port-au-Prince', venue_name: 'Place des Héros', address: 'Place des Héros, Port-au-Prince' },
  { name: 'Caribbean Literature Conference', country: 'HT', category: 'Conference', price: 100, currency: 'USD', city: 'Port-au-Prince', commune: 'Pétion-Ville', venue_name: 'Convention Hall', address: 'Pétion-Ville, Port-au-Prince' },
  { name: 'Haitian Film Festival', country: 'HT', category: 'Entertainment', price: 3500, currency: 'HTG', city: 'Port-au-Prince', commune: 'Port-au-Prince', venue_name: 'Cinéma Rex', address: 'Centre-ville, Port-au-Prince' },
  { name: 'Vodou Cultural Experience', country: 'HT', category: 'Cultural', price: 2500, currency: 'HTG', city: 'Jacmel', commune: 'Jacmel', venue_name: 'Cultural Center', address: 'Jacmel, Sud-Est' },
  { name: 'Port-au-Prince Tech Summit', country: 'HT', category: 'Conference', price: 85, currency: 'USD', city: 'Port-au-Prince', commune: 'Pétion-Ville', venue_name: 'Innovation Hub', address: 'Pétion-Ville, Port-au-Prince' },
  { name: 'Haitian Fashion Show', country: 'HT', category: 'Entertainment', price: 55, currency: 'USD', city: 'Pétion-Ville', commune: 'Pétion-Ville', venue_name: 'Hotel Venue', address: 'Pétion-Ville, Ouest' },
  { name: 'Traditional Dance Workshop', country: 'HT', category: 'Workshop', price: 1800, currency: 'HTG', city: 'Cap-Haïtien', commune: 'Cap-Haïtien', venue_name: 'Dance Studio', address: 'Cap-Haïtien, Nord' },
  { name: 'Haitian Artisan Market', country: 'HT', category: 'Arts & Culture', price: 1000, currency: 'HTG', city: 'Jacmel', commune: 'Jacmel', venue_name: 'Market Square', address: 'Place publique, Jacmel' },

  // US Events (8 events)
  { name: 'Little Haiti Cultural Festival', country: 'US', category: 'Festival', price: 55, currency: 'USD', city: 'Miami', commune: 'FL', venue_name: 'Little Haiti Cultural Complex', address: '212 NE 59th Terrace, Miami, FL' },
  { name: 'Haitian Flag Day Celebration', country: 'US', category: 'Cultural', price: 40, currency: 'USD', city: 'Brooklyn', commune: 'NY', venue_name: 'Community Center', address: 'Brooklyn, NY' },
  { name: 'Kompa Music Night', country: 'US', category: 'Music', price: 80, currency: 'USD', city: 'New York', commune: 'NY', venue_name: 'Live Music Venue', address: 'Manhattan, New York, NY' },
  { name: 'Haitian-American Heritage Month Gala', country: 'US', category: 'Gala', price: 120, currency: 'USD', city: 'Boston', commune: 'MA', venue_name: 'Downtown Ballroom', address: 'Boston, MA' },
  { name: 'Haitian Art & Craft Fair', country: 'US', category: 'Arts & Culture', price: 25, currency: 'USD', city: 'Orlando', commune: 'FL', venue_name: 'Arts Pavilion', address: 'Orlando, FL' },
  { name: 'Konpa Dance Workshop', country: 'US', category: 'Workshop', price: 50, currency: 'USD', city: 'Atlanta', commune: 'GA', venue_name: 'Dance Studio', address: 'Atlanta, GA' },
  { name: 'Haitian Business Expo', country: 'US', category: 'Conference', price: 75, currency: 'USD', city: 'Miami', commune: 'FL', venue_name: 'Convention Center', address: 'Miami, FL' },
  { name: 'Caribbean Food Festival', country: 'US', category: 'Food & Drink', price: 45, currency: 'USD', city: 'Fort Lauderdale', commune: 'FL', venue_name: 'Festival Grounds', address: 'Fort Lauderdale, FL' },

  // Canada Events (7 events)
  { name: 'Festival Haïtien de Montréal', country: 'CA', category: 'Festival', price: 65, currency: 'USD', city: 'Montreal', commune: 'QC', venue_name: 'Parc Jean-Drapeau', address: 'Montreal, QC' },
  { name: 'Haitian Heritage Celebration', country: 'CA', category: 'Cultural', price: 50, currency: 'USD', city: 'Toronto', commune: 'ON', venue_name: 'Community Hall', address: 'Toronto, ON' },
  { name: 'Kompa Festival Canada', country: 'CA', category: 'Music', price: 85, currency: 'USD', city: 'Montreal', commune: 'QC', venue_name: 'Outdoor Stage', address: 'Montreal, QC' },
  { name: 'Haitian Film Screening Series', country: 'CA', category: 'Entertainment', price: 35, currency: 'USD', city: 'Ottawa', commune: 'ON', venue_name: 'Cinema Hall', address: 'Ottawa, ON' },
  { name: 'Haitian Independence Gala', country: 'CA', category: 'Gala', price: 110, currency: 'USD', city: 'Montreal', commune: 'QC', venue_name: 'Ballroom', address: 'Montreal, QC' },
  { name: 'Haitian Business Summit', country: 'CA', category: 'Conference', price: 95, currency: 'USD', city: 'Toronto', commune: 'ON', venue_name: 'Conference Center', address: 'Toronto, ON' },
  { name: 'Haitian Cuisine Workshop', country: 'CA', category: 'Workshop', price: 55, currency: 'USD', city: 'Montreal', commune: 'QC', venue_name: 'Culinary Studio', address: 'Montreal, QC' },
]

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireDevTools()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    // Find the organizer with email info@edlight.org (Firestore user doc id is treated as canonical user id).
    const organizersSnap = await adminDb
      .collection('users')
      .where('email', '==', 'info@edlight.org')
      .limit(1)
      .get()

    if (organizersSnap.empty) {
      return adminError('Organizer account info@edlight.org not found', 404)
    }

    const organizerId = organizersSnap.docs[0].id
    const organizerData = organizersSnap.docs[0].data()

    // Create events
    const now = Timestamp.now()
    const createdEvents = []

    const bannerByCategory: Record<string, string> = {
      Festival: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      Music: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200',
      Cultural: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200',
      'Arts & Culture': 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=1200',
      'Food & Drink': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
      Conference: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      Workshop: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
      Entertainment: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200',
      Gala: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200',
    }

    for (let i = 0; i < templateEvents.length; i++) {
      const template = templateEvents[i]

      // Generate event date 30-90 days in the future
      const daysInFuture = 30 + Math.floor(Math.random() * 60)
      const start = new Date()
      start.setDate(start.getDate() + daysInFuture)
      start.setHours(19, 0, 0, 0) // 7 PM
      const end = new Date(start)
      end.setHours(end.getHours() + 4)

      const totalTickets = 250
      const sold = Math.max(0, Math.min(totalTickets, Math.floor(Math.random() * 80)))

      const currency = template.currency
      const basePrice = template.price

      // Early bird tier (expires 14 days before event)
      const earlyBirdEnd = new Date(start)
      earlyBirdEnd.setDate(earlyBirdEnd.getDate() - 14)
      const earlyBirdPrice = Math.round(basePrice * 0.7) // 30% discount

      // Use the lowest tier price as the event's display price.
      const displayPrice = earlyBirdPrice

      const eventId = randomUUID()

      // Write to Firestore (Discover/Home reads from Firestore)
      const firestoreEventData = {
        organizer_id: organizerId,
        title: template.name,
        description: `Join us for ${template.name}! This community event celebrates Haitian culture and heritage with music, food, and connection.`,
        category: template.category,
        venue_name: template.venue_name,
        country: template.country,
        city: template.city,
        commune: template.commune,
        address: template.address,
        start_datetime: Timestamp.fromDate(start),
        end_datetime: Timestamp.fromDate(end),
        banner_image_url: bannerByCategory[template.category] || bannerByCategory.Festival,
        ticket_price: displayPrice,
        currency,
        total_tickets: totalTickets,
        tickets_sold: sold,
        is_published: true,
        status: 'published',
        tags: [template.category, 'haitian', 'community'],
        created_at: now,
        updated_at: now,
      }

      await adminDb.collection('events').doc(eventId).set(firestoreEventData)

      // Ticket tiers (Firestore)
      const hasVIP = ['Music', 'Festival', 'Gala', 'Conference'].includes(template.category)

      const tiers = [
        {
          id: randomUUID(),
          event_id: eventId,
          name: 'Early Bird',
          description: 'Limited early bird discount - Save 30%!',
          price: earlyBirdPrice,
          total_quantity: 80,
          sold_quantity: Math.min(20, Math.floor(Math.random() * 10)),
          sales_start: now.toDate().toISOString(),
          sales_end: earlyBirdEnd.toISOString(),
          sort_order: 0,
          is_active: true,
        },
        {
          id: randomUUID(),
          event_id: eventId,
          name: 'General Admission',
          description: 'Standard admission ticket',
          price: basePrice,
          total_quantity: 120,
          sold_quantity: Math.min(30, Math.floor(Math.random() * 15)),
          sales_start: now.toDate().toISOString(),
          sales_end: end.toISOString(),
          sort_order: 1,
          is_active: true,
        },
      ]

      if (hasVIP) {
        tiers.push({
          id: randomUUID(),
          event_id: eventId,
          name: 'VIP',
          description: 'VIP access with premium seating and exclusive perks',
          price: Math.round(basePrice * 1.8),
          total_quantity: 50,
          sold_quantity: Math.min(10, Math.floor(Math.random() * 5)),
          sales_start: now.toDate().toISOString(),
          sales_end: end.toISOString(),
          sort_order: 2,
          is_active: true,
        })
      }

      for (const tier of tiers) {
        await adminDb.collection('ticket_tiers').doc(tier.id).set({
          ...tier,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      createdEvents.push({
        id: eventId,
        title: template.name,
        location: `${template.venue_name}, ${template.city}`,
        date: start.toISOString(),
        price: `${earlyBirdPrice} - ${hasVIP ? Math.round(basePrice * 1.8) : basePrice} ${currency}`,
        currency,
      })
    }

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'events',
      details: { name: 'seed-events', created: createdEvents.length },
    })

    return adminOk({
      message: `Successfully created ${createdEvents.length} events for ${organizerData.full_name || 'info@edlight.org'}`,
      events: createdEvents,
    })
  } catch (error) {
    console.error('Error seeding events:', error)
    return adminError(
      'Failed to seed events',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}
