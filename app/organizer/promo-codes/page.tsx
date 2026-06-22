import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import PromoCodeManager from './PromoCodeManager'
import { adminDb } from '@/lib/firebase/admin'

export const revalidate = 0

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/organizer/promo-codes')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/promo-codes')
  }

  const supabase = await createClient()
  const params = await searchParams

  // Fetch organizer's events from Firebase
  let events: any[] = []
  try {
    const eventsSnapshot = await adminDb
      .collection('events')
      .where('organizer_id', '==', user.id)
      .orderBy('created_at', 'desc')
      .get()
    
    events = eventsSnapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
      }
    })
  } catch (error) {
    console.error('Failed to fetch events:', error)
  }

  // Fetch promo codes (no joins with Firebase)
  let promoCodesData: any[] = []
  
  try {
    const eventIds = events.map((e: any) => e.id).filter(Boolean)
    console.log('Fetching promo codes for event IDs:', eventIds.length, eventIds.slice(0, 5))
    
    if (eventIds.length > 0) {
      // Firebase `in()` supports max 30 values; chunk into groups of 30
      const chunks: string[][] = []
      for (let i = 0; i < eventIds.length; i += 30) {
        chunks.push(eventIds.slice(i, i + 30))
      }

      const results = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from('promo_codes')
            .select('id,code,discount_type,discount_value,max_uses,uses_count,event_id,is_active,expires_at,created_at')
            .in('event_id', chunk)
            .order('created_at', { ascending: false })
        )
      )

      console.log('Query results from chunks:', results.map((r, i) => ({ chunk: i, dataLength: r.data?.length || 0, error: r.error })))

      const userPromoCodes = results.flatMap((r) => r.data || [])
      console.log('Fetched promo codes:', userPromoCodes.length, userPromoCodes)

      // Get event titles separately
      const eventsMap = new Map()
      events.forEach((event: any) => {
        eventsMap.set(event.id, event.title)
      })

      // Attach event data manually
      promoCodesData = userPromoCodes.map((pc: any) => ({
        ...pc,
        event: pc.event_id ? { title: eventsMap.get(pc.event_id) } : null,
      }))
    }
  } catch (error) {
    console.error('Failed to load promo codes:', error)
  }

  const eventsData = events || []

  // Metrics summary
  const totalCodes = promoCodesData.length
  const activeCodes = promoCodesData.filter((p: any) => p.is_active).length
  const totalUses = promoCodesData.reduce((sum: number, p: any) => sum + (p.uses_count || 0), 0)
  const percentActive = totalCodes > 0 ? Math.round((activeCodes / totalCodes) * 100) : 0

  return (
    <div className="bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <Link
              href="/organizer/events"
              className="text-orange-600 hover:text-orange-700 text-[13px] md:text-sm font-medium mb-2 inline-block"
            >
              ← Back to Events
            </Link>
            <h1 className="font-display text-[clamp(28px,4vw,40px)] leading-[1.04] text-gray-900">Promo Codes</h1>
            <p className="text-[13px] md:text-sm text-gray-600 mt-1">Create and manage discounts for your events</p>
          </div>

          {/* Metrics - horizontal scroll on mobile */}
          <div className="flex md:grid md:grid-cols-4 gap-3 md:gap-6 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory md:overflow-visible mb-6 md:mb-8">
            <div className="min-w-[220px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-[10px] md:text-sm font-medium text-gray-600 uppercase tracking-wide whitespace-nowrap">Total Codes</h3>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2m-2 7v5a2 2 0 01-2 2H8a2 2 0 01-2-2v-5m10 0H8" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalCodes}</p>
            </div>
            <div className="min-w-[220px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-[10px] md:text-sm font-medium text-gray-600 uppercase tracking-wide whitespace-nowrap">Active Codes</h3>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-green-700">{activeCodes}</p>
              <p className="text-[11px] md:text-sm text-gray-500 mt-1">{percentActive}% active</p>
            </div>
            <div className="min-w-[220px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-[10px] md:text-sm font-medium text-gray-600 uppercase tracking-wide whitespace-nowrap">Total Uses</h3>
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-orange-700">{totalUses}</p>
            </div>
            <div className="min-w-[220px] md:min-w-0 snap-start bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-[10px] md:text-sm font-medium text-gray-600 uppercase tracking-wide whitespace-nowrap">Inactive</h3>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-red-700">{totalCodes - activeCodes}</p>
            </div>
          </div>

          <PromoCodeManager
            events={eventsData}
            promoCodes={promoCodesData}
            organizerId={user.id}
          />
        </div>
      
    </div>
  )
}
