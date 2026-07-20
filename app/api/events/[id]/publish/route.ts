import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAuth } from '@/lib/auth'
import { createNotification } from '@/lib/notifications/helpers'
import { sendPushNotification } from '@/lib/notification-triggers'
import { resolveEventCountry } from '@/lib/event-country'
import { normalizeCountryCode } from '@/lib/payment-provider'
import { getPayoutProfile, getRequiredPayoutProfileIdForEventCountry } from '@/lib/firestore/payout-profiles'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

async function isOrganizerVerified(userId: string): Promise<boolean> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const userData = userDoc.exists ? userDoc.data() : null

  const userVerified = userData?.is_verified === true || userData?.verification_status === 'approved'
  if (userVerified) return true

  const requestDoc = await adminDb.collection('verification_requests').doc(userId).get()
  const requestData = requestDoc.exists ? requestDoc.data() : null
  return requestData?.status === 'approved'
}

async function isPaidEvent(eventId: string, eventData: any): Promise<boolean> {
  if ((eventData?.ticket_price || 0) > 0) return true

  const tiersSnapshot = await adminDb
    .collection('ticket_tiers')
    .where('event_id', '==', eventId)
    .limit(25)
    .get()

  return tiersSnapshot.docs.some((d: any) => (d.data()?.price || 0) > 0)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireAuth()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { is_published } = body

    // Verify event ownership
    const eventDoc = await adminDb.collection('events').doc(id).get()
    
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data()!
    
    if (eventData.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Launch policy — "verify at the money, not at the door":
    // Haiti (HT) organizers may publish PAID events WITHOUT identity verification
    // and without an active payout profile. Identity/KYC is instead enforced at
    // disbursement time by the withdrawal/payout routes, so funds can only ever be
    // paid out to a verified organizer with a valid payout profile. This lets HT
    // organizers list and sell first, then complete KYC before cashing out.
    //
    // US/Canada keep the full pre-publish gate: Stripe destination charges require
    // completed Connect onboarding (identity + charges/payouts enabled) before any
    // money can be collected, so those checks must pass before publishing.
    if (is_published === true) {
      const paid = await isPaidEvent(id, eventData)
      if (paid) {
        const resolvedCountry = await resolveEventCountry(eventData)
        const requiredProfileId = getRequiredPayoutProfileIdForEventCountry(resolvedCountry || eventData?.country)

        // Haiti (and other non-US/CA) events: no publish-time gate — KYC is enforced
        // at disbursement instead. Free/RSVP events remain unrestricted as before.

        if (requiredProfileId === 'stripe_connect') {
          const verified = await isOrganizerVerified(user.id)
          if (!verified) {
            return NextResponse.json(
              { error: 'Verification required to publish paid events' },
              { status: 403 }
            )
          }

          const stripeProfile = await getPayoutProfile(user.id, 'stripe_connect')
          const stripeAccountId = stripeProfile?.stripeAccountId
          if (!stripeAccountId) {
            return NextResponse.json(
              { error: 'Stripe Connect required to publish paid events in the US/Canada.' },
              { status: 403 }
            )
          }

          const stripe = getStripe()
          const account = await stripe.accounts.retrieve(stripeAccountId)
          const verifiedStripe = Boolean(account?.details_submitted && account?.charges_enabled && account?.payouts_enabled)
          if (!verifiedStripe) {
            return NextResponse.json(
              { error: 'Stripe Connect onboarding required before publishing paid events in the US/Canada.' },
              { status: 403 }
            )
          }
        }
      }
    }

    // Update publish status
    const resolvedCountry = await resolveEventCountry(eventData)
    const existingCountry = normalizeCountryCode(eventData?.country)
    const updatePayload: Record<string, any> = {
      is_published,
      status: is_published ? 'published' : 'draft',
      updated_at: new Date(),
    }

    // Persist a normalized country code when we can determine it.
    if (resolvedCountry && resolvedCountry !== existingCountry) {
      updatePayload.country = resolvedCountry
    }

    await adminDb.collection('events').doc(id).update(updatePayload)

    // If publishing for the first time, notify followers
    if (is_published && !eventData.is_published) {
      try {
        // Get organizer followers from Firestore
        const followersSnapshot = await adminDb
          .collection('organizer_follows')
          .where('organizer_id', '==', user.id)
          .get()

        const followerIds = followersSnapshot.docs.map((doc: any) => doc.data().follower_id)

        if (followerIds.length > 0) {
          // Notify each follower
          const notifications = followerIds.map(async (followerId: string) => {
            // Create in-app notification
            await createNotification(
              followerId,
              'event_updated',
              `New Event: ${eventData.title}`,
              `${eventData.organizer_name || 'An organizer you follow'} just published a new event!`,
              `/events/${id}`,
              { eventId: id, organizerId: user.id }
            )

            // Send push notification
            await sendPushNotification(
              followerId,
              `📅 New Event from ${eventData.organizer_name || 'Organizer'}`,
              eventData.title,
              `/events/${id}`,
              {
                type: 'new_event',
                eventId: id,
                organizerId: user.id
              }
            )
          })

          await Promise.all(notifications)
          console.log(`Notified ${followerIds.length} followers about new event: ${eventData.title}`)
        }
      } catch (notifyError) {
        console.error('Error notifying followers:', notifyError)
        // Don't fail the publish operation if notifications fail
      }
    }

    return NextResponse.json({ success: true, is_published })
  } catch (error) {
    console.error('Error toggling publish status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
