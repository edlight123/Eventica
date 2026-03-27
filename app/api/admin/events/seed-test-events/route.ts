import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

export const runtime = 'nodejs'

type SeedRequest = {
  // Optional label so you can search/filter seeded events later.
  batchTag?: string
  // When true, newly created events are published.
  publish?: boolean
}

function isoInDays(days: number, hourLocal = 18): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hourLocal, 0, 0, 0)
  return d.toISOString()
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

async function ensureOrganizerUser(options: {
  email: string
  fullName: string
  default_country: string
}): Promise<string> {
  // Look for an existing user by email.
  const snapshot = await adminDb
    .collection('users')
    .where('email', '==', options.email)
    .limit(1)
    .get()

  if (!snapshot.empty) {
    const doc = snapshot.docs[0]
    await doc.ref.set(
      {
        full_name: options.fullName,
        role: 'organizer',
        is_organizer: true,
        is_verified: true,
        verification_status: 'approved',
        default_country: options.default_country,
        updated_at: new Date(),
      },
      { merge: true }
    )
    return doc.id
  }

  // Create a new user doc.
  const ref = adminDb.collection('users').doc()
  await ref.set({
    email: options.email,
    full_name: options.fullName,
    role: 'organizer',
    is_organizer: true,
    is_verified: true,
    verification_status: 'approved',
    default_country: options.default_country,
    created_at: new Date(),
    updated_at: new Date(),
  })

  return ref.id
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const body = (await request.json().catch(() => ({}))) as SeedRequest
    const publish = body?.publish !== false
    const batchTag = String(body?.batchTag || `seed_${new Date().toISOString()}`).slice(0, 80)

    // Create 3 organizer accounts (HT/US/CA) to mimic real routing.
    const [htOrganizerId, usOrganizerId, caOrganizerId] = await Promise.all([
      ensureOrganizerUser({
        email: 'test-organizer-ht@eventica.local',
        fullName: 'Test Organizer (Haiti)',
        default_country: 'HT',
      }),
      ensureOrganizerUser({
        email: 'test-organizer-us@eventica.local',
        fullName: 'Test Organizer (USA)',
        default_country: 'US',
      }),
      ensureOrganizerUser({
        email: 'test-organizer-ca@eventica.local',
        fullName: 'Test Organizer (Canada)',
        default_country: 'CA',
      }),
    ])

    const eventsToCreate: Array<any> = [
      // Haiti (Cap-Haitien) - HTG priced
      {
        organizer_id: htOrganizerId,
        organizer_name: 'Test Organizer (Haiti)',
        title: `[${batchTag}] Cap-Haïtien Kompa Night (HTG)` ,
        description: 'Test event in Cap-Haïtien priced in HTG to validate MonCash/NatCash routing and currency display.',
        category: 'Music',
        country: 'HT',
        city: 'Cap-Haitien',
        commune: 'Cap-Haitien',
        venue_name: 'Place d’Armes',
        address: 'Centre-ville, Cap-Haïtien',
        start_datetime: isoInDays(3, 20),
        end_datetime: addHours(isoInDays(3, 20), 4),
        currency: 'HTG',
        ticket_price: 1500,
        total_tickets: 250,
        banner_image_url:
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'HT', 'Cap-Haitien', 'HTG'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Haiti (Petion-Ville) - USD priced (important edge case)
      {
        organizer_id: htOrganizerId,
        organizer_name: 'Test Organizer (Haiti)',
        title: `[${batchTag}] Pétion-Ville Food Festival (USD)` ,
        description: 'Test Haiti event priced in USD to verify Haiti routing does not rely on currency.',
        category: 'Food & Drink',
        country: 'HT',
        city: 'Petion-Ville',
        commune: 'Petion-Ville',
        venue_name: 'Hotel Montana',
        address: 'Rue Frank Cardozo, Pétion-Ville',
        start_datetime: isoInDays(5, 12),
        end_datetime: addHours(isoInDays(5, 12), 6),
        currency: 'USD',
        ticket_price: 25,
        total_tickets: 400,
        banner_image_url:
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'HT', 'Petion-Ville', 'USD'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Haiti (Port-au-Prince) - free
      {
        organizer_id: htOrganizerId,
        organizer_name: 'Test Organizer (Haiti)',
        title: `[${batchTag}] Port-au-Prince Community Meetup (FREE)` ,
        description: 'Free Haiti event to verify free-ticket flow and publish gating.',
        category: 'Community',
        country: 'HT',
        city: 'Port-au-Prince',
        commune: 'Port-au-Prince',
        venue_name: 'Champ de Mars',
        address: 'Place des Héros, Port-au-Prince',
        start_datetime: isoInDays(2, 18),
        end_datetime: addHours(isoInDays(2, 18), 2),
        currency: 'HTG',
        ticket_price: 0,
        total_tickets: 999,
        banner_image_url:
          'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'HT', 'Port-au-Prince', 'FREE'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // USA (Miami)
      {
        organizer_id: usOrganizerId,
        organizer_name: 'Test Organizer (USA)',
        title: `[${batchTag}] Miami Afro-Caribbean Night (USD)` ,
        description: 'US event (Miami) to validate Stripe Connect routing for US.',
        category: 'Music',
        country: 'US',
        city: 'Miami',
        commune: 'Miami',
        venue_name: 'Wynwood Warehouse',
        address: 'Wynwood, Miami, FL',
        start_datetime: isoInDays(4, 21),
        end_datetime: addHours(isoInDays(4, 21), 4),
        currency: 'USD',
        ticket_price: 35,
        total_tickets: 300,
        banner_image_url:
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'US', 'Miami', 'USD'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // USA (New York)
      {
        organizer_id: usOrganizerId,
        organizer_name: 'Test Organizer (USA)',
        title: `[${batchTag}] New York Networking Mixer (USD)` ,
        description: 'US event (New York) to validate Stripe Connect routing and attendee purchase flow.',
        category: 'Business',
        country: 'US',
        city: 'New York',
        commune: 'Manhattan',
        venue_name: 'Midtown Loft',
        address: 'Midtown, New York, NY',
        start_datetime: isoInDays(6, 19),
        end_datetime: addHours(isoInDays(6, 19), 3),
        currency: 'USD',
        ticket_price: 45,
        total_tickets: 200,
        banner_image_url:
          'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'US', 'New York', 'USD'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Canada (Montreal)
      {
        organizer_id: caOrganizerId,
        organizer_name: 'Test Organizer (Canada)',
        title: `[${batchTag}] Montréal Culture & Arts Expo (USD)` ,
        description: 'Canada event (Montréal) to validate Stripe Connect routing for CA.',
        category: 'Arts & Culture',
        country: 'CA',
        city: 'Montreal',
        commune: 'Montreal',
        venue_name: 'Old Port Pavilion',
        address: 'Vieux-Port, Montréal, QC',
        start_datetime: isoInDays(7, 13),
        end_datetime: addHours(isoInDays(7, 13), 5),
        currency: 'USD',
        ticket_price: 20,
        total_tickets: 500,
        banner_image_url:
          'https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'CA', 'Montreal', 'USD'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Canada (Toronto)
      {
        organizer_id: caOrganizerId,
        organizer_name: 'Test Organizer (Canada)',
        title: `[${batchTag}] Toronto Tech Meetup (FREE)` ,
        description: 'Free Canada event to validate free-ticket behavior in CA market.',
        category: 'Technology',
        country: 'CA',
        city: 'Toronto',
        commune: 'Toronto',
        venue_name: 'Downtown Hub',
        address: 'Downtown, Toronto, ON',
        start_datetime: isoInDays(8, 18),
        end_datetime: addHours(isoInDays(8, 18), 2),
        currency: 'USD',
        ticket_price: 0,
        total_tickets: 800,
        banner_image_url:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'CA', 'Toronto', 'FREE'],
        created_at: new Date(),
        updated_at: new Date(),
      },

      // Online (Zoom) - Haiti organizer, but still explicit country
      {
        organizer_id: htOrganizerId,
        organizer_name: 'Test Organizer (Haiti)',
        title: `[${batchTag}] Online Zoom Workshop (HT, USD)` ,
        description: 'Online event (Zoom) with explicit country=HT to validate deterministic routing for online events.',
        category: 'Education',
        country: 'HT',
        city: 'Online',
        commune: 'Online',
        venue_name: 'Zoom',
        address: 'Online',
        start_datetime: isoInDays(9, 17),
        end_datetime: addHours(isoInDays(9, 17), 2),
        currency: 'USD',
        ticket_price: 10,
        total_tickets: 1000,
        is_online: true,
        join_url: 'https://zoom.us/j/0000000000',
        banner_image_url:
          'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=600&fit=crop',
        is_published: publish,
        status: publish ? 'published' : 'draft',
        tags: ['seed', batchTag, 'HT', 'ONLINE', 'USD'],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    const batch = adminDb.batch()
    const created: Array<{ id: string; title: string; country: string; city: string; currency: string; ticket_price: number }> = []

    for (const e of eventsToCreate) {
      const ref = adminDb.collection('events').doc()
      batch.set(ref, { ...e, id: ref.id })

      // Create a default tier so tier-based purchase flows work out of the box.
      // Use a deterministic ID so reruns won't create duplicate tiers.
      const tierId = `seed_${ref.id}_ga`
      const tierRef = adminDb.collection('ticket_tiers').doc(tierId)
      batch.set(tierRef, {
        id: tierId,
        event_id: ref.id,
        name: 'General Admission',
        description: null,
        price: typeof e.ticket_price === 'number' ? e.ticket_price : Number(e.ticket_price || 0),
        total_quantity: typeof e.total_tickets === 'number' ? e.total_tickets : Number(e.total_tickets || 0),
        sold_quantity: 0,
        sales_start: null,
        sales_end: null,
        sort_order: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      created.push({
        id: ref.id,
        title: e.title,
        country: e.country,
        city: e.city,
        currency: e.currency,
        ticket_price: e.ticket_price,
      })
    }

    await batch.commit()

    await logAdminAction({
      action: 'admin.backfill',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'events',
      details: { name: 'events.seed-test-events', batchTag, publish, createdCount: created.length },
    })

    return adminOk({
      batchTag,
      publish,
      createdCount: created.length,
      created,
      tips: {
        discover: 'Visit /discover and filter by city/category. Seeded events have titles prefixed with the batchTag.',
        payments: 'HT -> Sogepay + MonCash/NatCash; US/CA -> Stripe Connect. Currency should not affect country routing.',
      },
    })
  } catch (err: any) {
    console.error('Seed test events error:', err)
    return adminError('Internal server error', 500, err?.message || String(err))
  }
}
