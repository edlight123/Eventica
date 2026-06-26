import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { headers } from 'next/headers'

/**
 * Settlement Status Cron Job
 * 
 * Updates earnings settlement status from 'pending' to 'ready'
 * when the 7-day hold period has passed.
 * 
 * This endpoint should be called by a cron scheduler (Vercel Cron, Cloud Scheduler, etc.)
 * 
 * Setup:
 * 1. Vercel Cron: Add to vercel.json
 * 2. Cloud Scheduler: Create job pointing to this endpoint
 * 3. Local testing: Call manually with cron secret header
 * 
 * Security: Requires CRON_SECRET environment variable
 */

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = (await headers()).get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Starting settlement status update cron job...')

    const now = new Date()
    const nowISO = now.toISOString()

    // Find all earnings with pending settlement that should now be ready
    const pendingEarningsSnapshot = await adminDb
      .collection('event_earnings')
      .where('settlementStatus', '==', 'pending')
      .where('settlementReadyDate', '<=', nowISO)
      .get()

    console.log(`📊 Found ${pendingEarningsSnapshot.size} earnings ready for settlement`)

    let updated = 0
    let failed = 0
    const batch = adminDb.batch()

    for (const doc of pendingEarningsSnapshot.docs) {
      try {
        const earnings = doc.data()
        
        // Double-check settlement date
        const readyDate = new Date(earnings.settlementReadyDate)
        if (now >= readyDate) {
          batch.update(doc.ref, {
            settlementStatus: 'ready',
            updatedAt: nowISO
          })
          updated++
          
          console.log(`✅ Updated earnings for event ${earnings.eventId}`)
        }
      } catch (error: any) {
        console.error(`❌ Failed to update earnings ${doc.id}:`, error.message)
        failed++
      }
    }

    // Commit batch update
    if (updated > 0) {
      await batch.commit()
      console.log(`✅ Successfully committed ${updated} updates`)
    }

    // Also update any locked earnings that now have available balance
    const lockedEarningsSnapshot = await adminDb
      .collection('event_earnings')
      .where('settlementStatus', '==', 'locked')
      .where('availableToWithdraw', '>', 0)
      .get()

    console.log(`📊 Found ${lockedEarningsSnapshot.size} locked earnings with available balance`)

    let unlockedCount = 0
    const unlockBatch = adminDb.batch()

    for (const doc of lockedEarningsSnapshot.docs) {
      const earnings = doc.data()
      const readyDate = new Date(earnings.settlementReadyDate)
      
      // Only unlock if settlement date has passed
      if (now >= readyDate && earnings.availableToWithdraw > 0) {
        unlockBatch.update(doc.ref, {
          settlementStatus: 'ready',
          updatedAt: nowISO
        })
        unlockedCount++
        
        console.log(`🔓 Unlocked earnings for event ${earnings.eventId}`)
      }
    }

    if (unlockedCount > 0) {
      await unlockBatch.commit()
      console.log(`✅ Successfully unlocked ${unlockedCount} earnings`)
    }

    const summary = {
      success: true,
      timestamp: nowISO,
      pendingUpdated: updated,
      lockedUnlocked: unlockedCount,
      failed,
      total: updated + unlockedCount
    }

    console.log('🎉 Cron job completed:', summary)

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(req: NextRequest) {
  return GET(req)
}
