import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import {
  adminSearchIndexDocId,
  buildAdminSearchIndexDoc,
  tokenizeForAdminSearch,
} from '@/lib/admin/search-index'

interface SearchResult {
  id: string
  type: 'event' | 'user' | 'order'
  title: string
  subtitle?: string
  href: string
  metadata?: {
    status?: string
    price?: number
    currency?: string
    city?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.toLowerCase().trim()
    const results: SearchResult[] = []

    const indexRef = adminDb.collection('admin_search_index')

    const upsertIndexDoc = async (doc: ReturnType<typeof buildAdminSearchIndexDoc>) => {
      await indexRef.doc(adminSearchIndexDocId(doc.type, doc.refId)).set(doc, { merge: true })
    }

    // 1) Indexed search first (no collection scans)
    const queryTokens = tokenizeForAdminSearch(searchTerm)
    const tokensToQuery = queryTokens.slice(0, 3)

    if (tokensToQuery.length) {
      try {
        const indexSnaps = await Promise.all(
          tokensToQuery.map(async (t) => {
            try {
              return await indexRef.where('tokens', 'array-contains', t).limit(20).get()
            } catch (err) {
              console.error('Index query error:', err)
              return null
            }
          })
        )

        const deduped = new Map<string, any>()
        for (const snap of indexSnaps) {
          if (!snap) continue
          for (const doc of snap.docs) {
            deduped.set(doc.id, doc.data())
          }
        }

        const indexedResults = Array.from(deduped.values())
          .map((d: any) => {
            const type = d?.type as SearchResult['type']
            if (type !== 'event' && type !== 'user' && type !== 'order') return null
            return {
              id: String(d?.refId || ''),
              type,
              title: String(d?.title || ''),
              subtitle: d?.subtitle ? String(d.subtitle) : undefined,
              href: String(d?.href || ''),
              metadata: (d?.metadata || undefined) as any,
              _updatedAt: d?.updatedAt ? String(d.updatedAt) : '',
            }
          })
          .filter(Boolean) as Array<SearchResult & { _updatedAt?: string }>

        indexedResults.sort((a, b) => String(b._updatedAt || '').localeCompare(String(a._updatedAt || '')))
        for (const r of indexedResults.slice(0, 20)) {
          const { _updatedAt, ...clean } = r as any
          results.push(clean)
        }
      } catch (err) {
        console.error('Admin search index failed:', err)
      }
    }

    // 2) Fallback (bounded) + warm the index if needed
    if (results.length < 20) {
      const [eventsSnapshot, usersSnapshot, ticketsSnapshot] = await Promise.all([
        adminDb
          .collection('events')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get()
          .catch((err: any) => {
            console.error('Events query error:', err)
            return null
          }),
        adminDb
          .collection('users')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get()
          .catch((err: any) => {
            console.error('Users query error:', err)
            return null
          }),
        adminDb
          .collection('tickets')
          .orderBy('purchased_at', 'desc')
          .limit(50)
          .get()
          .catch((err: any) => {
            console.error('Tickets query error:', err)
            return null
          }),
      ])

      // Build user cache for efficient lookups
      const userCache = new Map<string, { name: string; email: string }>()
      if (usersSnapshot) {
        for (const doc of usersSnapshot.docs) {
          const data = doc.data()
          userCache.set(doc.id, {
            name: data.full_name || data.name || '',
            email: data.email || '',
          })
        }
      }

      // Build event cache for efficient lookups
      const eventCache = new Map<string, string>()
      if (eventsSnapshot) {
        for (const doc of eventsSnapshot.docs) {
          const data = doc.data()
          eventCache.set(doc.id, data.title || 'Untitled Event')
        }
      }

      const already = new Set(results.map((r) => `${r.type}_${r.id}`))

      // Search events (title, venue_name, city, category)
      if (eventsSnapshot) {
        for (const doc of eventsSnapshot.docs) {
          if (results.length >= 20) break

          const data = doc.data()

          // Get organizer info from cache
          const organizer = data.organizer_id ? userCache.get(data.organizer_id) : null
          const organizerName = organizer?.name || organizer?.email || ''

          const searchableText = [
            data.title || '',
            data.description || '',
            data.venue_name || '',
            data.city || '',
            data.category || '',
            organizerName,
          ]
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchTerm)) {
            const r: SearchResult = {
              id: doc.id,
              type: 'event',
              title: data.title || 'Untitled Event',
              subtitle: organizerName ? `by ${organizerName}` : data.city ? `in ${data.city}` : undefined,
              href: `/admin/events?selected=${doc.id}`,
              metadata: {
                status: data.is_published ? 'published' : 'draft',
                city: data.city,
                price: data.ticket_price,
                currency: data.currency || 'HTG',
              },
            }

            const key = `${r.type}_${r.id}`
            if (!already.has(key)) {
              already.add(key)
              results.push(r)
            }

            // Warm index
            upsertIndexDoc(
              buildAdminSearchIndexDoc({
                type: r.type,
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                href: r.href,
                metadata: r.metadata,
                tokenSource: [r.title, r.subtitle || '', data.city || '', data.category || '', organizerName].join(' '),
              })
            ).catch(() => {})
          }
        }
      }

      // Search users (name, email, business name)
      if (results.length < 20 && usersSnapshot) {
        for (const doc of usersSnapshot.docs) {
          if (results.length >= 20) break

          const data = doc.data()
          const searchableText = [
            data.full_name || data.name || '',
            data.email || '',
            data.phone_number || '',
            data.business_name || '',
          ]
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchTerm)) {
            const r: SearchResult = {
              id: doc.id,
              type: 'user',
              title: data.full_name || data.name || data.email || 'Unknown User',
              subtitle:
                data.email && (data.full_name || data.name)
                  ? data.email
                  : data.business_name || undefined,
              href: `/admin/people/${doc.id}`,
              metadata: {
                status: data.is_verified ? 'verified' : 'unverified',
              },
            }

            const key = `${r.type}_${r.id}`
            if (!already.has(key)) {
              already.add(key)
              results.push(r)
            }

            upsertIndexDoc(
              buildAdminSearchIndexDoc({
                type: r.type,
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                href: r.href,
                metadata: r.metadata,
                tokenSource: [
                  r.title,
                  r.subtitle || '',
                  data.phone_number || '',
                  data.business_name || '',
                  doc.id,
                ].join(' '),
              })
            ).catch(() => {})
          }
        }
      }

      // Search tickets (order ID, attendee name, attendee email)
      if (results.length < 20 && ticketsSnapshot) {
        for (const doc of ticketsSnapshot.docs) {
          if (results.length >= 20) break

          const data = doc.data()
          const searchableText = [doc.id, data.attendee_name || '', data.attendee_email || '', data.order_id || '']
            .join(' ')
            .toLowerCase()

          if (searchableText.includes(searchTerm)) {
            // Get event name from cache
            const eventName = data.event_id
              ? eventCache.get(data.event_id) || 'Unknown Event'
              : 'Unknown Event'

            const r: SearchResult = {
              id: doc.id,
              type: 'order',
              title: `Order ${doc.id.substring(0, 8)}...`,
              subtitle: `${eventName} • ${data.attendee_name || data.attendee_email || 'Unknown'}`,
              href: `/admin/orders?selected=${doc.id}`,
              metadata: {
                status: data.status,
                price: data.price,
                currency: data.currency || 'HTG',
              },
            }

            const key = `${r.type}_${r.id}`
            if (!already.has(key)) {
              already.add(key)
              results.push(r)
            }

            upsertIndexDoc(
              buildAdminSearchIndexDoc({
                type: r.type,
                id: r.id,
                title: r.title,
                subtitle: r.subtitle,
                href: r.href,
                metadata: r.metadata,
                tokenSource: [doc.id, data.order_id || '', eventName, data.attendee_name || '', data.attendee_email || ''].join(' '),
              })
            ).catch(() => {})
          }
        }
      }
    }

    console.log(`Admin search: "${query}" returned ${results.length} results`)
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Admin search error:', error)
    return NextResponse.json(
      { error: 'Failed to search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
