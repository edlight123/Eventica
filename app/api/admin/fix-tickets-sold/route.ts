/**
 * Admin API to fix tickets_sold counts
 * POST /api/admin/fix-tickets-sold
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/auth'
import { adminError } from '@/lib/api/admin-response'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const { eventId } = await request.json()
    
    console.log('🔄 Fixing tickets_sold counts...')
    
    let results = []
    
    if (eventId) {
      // Fix single event
      const eventDoc = await adminDb.collection('events').doc(eventId).get()
      if (!eventDoc.exists) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      
      const event = eventDoc.data()
      const ticketsSnapshot = await adminDb
        .collection('tickets')
        .where('event_id', '==', eventId)
        .where('status', 'in', ['valid', 'confirmed'])
        .get()
      
      const actualCount = ticketsSnapshot.size
      const currentCount = event?.tickets_sold || 0
      
      if (actualCount !== currentCount) {
        await adminDb.collection('events').doc(eventId).update({
          tickets_sold: actualCount
        })
        results.push({
          eventId,
          title: event?.title,
          fixed: true,
          old: currentCount,
          new: actualCount
        })
      } else {
        results.push({
          eventId,
          title: event?.title,
          fixed: false,
          count: actualCount,
          message: 'Already correct'
        })
      }
    } else {
      // Fix all events
      const eventsSnapshot = await adminDb.collection('events').get()
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id
        const event = eventDoc.data()
        
        try {
          const ticketsSnapshot = await adminDb
            .collection('tickets')
            .where('event_id', '==', eventId)
            .where('status', 'in', ['valid', 'confirmed'])
            .get()
          
          const actualCount = ticketsSnapshot.size
          const currentCount = event.tickets_sold || 0
          
          if (actualCount !== currentCount) {
            await adminDb.collection('events').doc(eventId).update({
              tickets_sold: actualCount
            })
            results.push({
              eventId,
              title: event.title,
              fixed: true,
              old: currentCount,
              new: actualCount
            })
          }
        } catch (error: any) {
          console.error(`Error processing event ${eventId}:`, error)
          results.push({
            eventId,
            title: event.title,
            error: error.message
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      fixed: results.filter((r: any) => r.fixed).length,
      total: results.length
    })
  } catch (error: any) {
    console.error('Fix tickets_sold error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
