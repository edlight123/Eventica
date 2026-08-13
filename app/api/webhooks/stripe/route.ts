import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { sendTicketConfirmation } from '@/lib/tickets/confirmation'
import { guestRecipientFromOrder } from '@/lib/guest/checkout'
import { attachTicketsToGuestOrder, isGuestId } from '@/lib/guest/identity'
import { redeemPromoInTransaction } from '@/lib/promo-codes'
import { notifyTicketPurchase, notifyOrganizerTicketSale } from '@/lib/notifications/helpers'
import { addTicketToEarnings } from '@/lib/earnings'
import { adminDb } from '@/lib/firebase/admin'
import {
  buildTierSoldIncrements,
  reserveInventoryAtomic,
  releaseInventoryReservation,
} from '@/lib/tickets/inventory'
import {
  claimWebhookEvent,
  markWebhookEventCompleted,
  releaseWebhookEvent,
} from '@/lib/webhooks/idempotency'

// Event types this webhook actually fulfills. Only these are deduped/claimed.
const HANDLED_EVENT_TYPES = new Set(['checkout.session.completed', 'payment_intent.succeeded'])

// Lazy load Stripe to avoid build-time initialization
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  let stripeEvent: any = null
  // Shared payment_intent-scoped claim id — set when handling payment_intent.succeeded so the
  // outer catch can release it (the client-confirm route create-from-payment claims the same key).
  let piFulfillId: string | null = null
  try {
    const stripe = getStripe()
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
    stripeEvent = event

    // Idempotency: Stripe delivers events at least once. Dedupe on the stable event id so a
    // redelivery (or a concurrent delivery) never creates a second set of tickets, double-counts
    // earnings, or double-increments inventory.
    if (HANDLED_EVENT_TYPES.has(event.type)) {
      const claim = await claimWebhookEvent({
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
      })
      if (claim.outcome !== 'claimed') {
        console.log('[stripe] skipping duplicate webhook delivery', {
          eventId: event.id,
          type: event.type,
          outcome: claim.outcome,
        })
        return NextResponse.json({ received: true, idempotent: true, outcome: claim.outcome })
      }
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Create tickets in database
      const supabase = await createClient()
      const quantity = parseInt(session.metadata.quantity || '1', 10)
      const pricePerTicket = session.amount_total / 100 / quantity // Total price divided by quantity
      const originalCurrency = String(session.metadata.originalCurrency || '').toUpperCase() || 'USD'
      const normalizedOriginalCurrency = (() => {
        if (originalCurrency === 'HTG') return 'HTG'
        if (originalCurrency === 'CAD') return 'CAD'
        return 'USD'
      })()
      const priceInOriginalCurrency = Number(session.metadata.priceInOriginalCurrency || session.metadata.finalPrice || 0)
      const exchangeRateUsed = session.metadata.exchangeRate ? parseFloat(session.metadata.exchangeRate) : null
      const payoutProvider = String(session.metadata.payoutProvider || '').toLowerCase()
      const paymentMethod = payoutProvider === 'stripe_connect' ? 'stripe_connect' : 'stripe'

      // Authoritative oversell gate: atomically reserve inventory BEFORE creating tickets. If the
      // event/tier is now full, the customer has paid but we can't honor it — auto-refund and stop.
      const checkoutTierIncrements = buildTierSoldIncrements(
        session.metadata.tierId ? [{ tierId: session.metadata.tierId, quantity }] : []
      )
      const checkoutReservation = await reserveInventoryAtomic({
        eventId: session.metadata.eventId,
        quantity,
        tierIncrements: checkoutTierIncrements,
        logPrefix: '[stripe]',
      })
      if (!checkoutReservation.ok) {
        console.error('[stripe] capacity exceeded after payment — auto-refunding checkout session', {
          sessionId: session.id,
          paymentIntent: session.payment_intent,
          reason: checkoutReservation.reason,
        })
        try {
          if (session.payment_intent) {
            await stripe.refunds.create({ payment_intent: session.payment_intent })
          }
        } catch (refundErr) {
          console.error('[stripe] failed to auto-refund oversold checkout session', refundErr)
        }
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: event.id,
          metadata: { type: event.type, refunded: 'capacity_exceeded' },
        })
        return NextResponse.json({ received: true, refunded: 'capacity_exceeded' })
      }

      // Create tickets one at a time to ensure each gets unique ID
      const createdTickets = []
      for (let i = 0; i < quantity; i++) {
        const qrCodeData = `ticket-${session.metadata.eventId}-${session.client_reference_id}-${Date.now()}-${i}`
        const ticketData = {
          event_id: session.metadata.eventId,
          attendee_id: session.client_reference_id,
          // Organizer-facing/event-currency amount.
          price_paid: Number.isFinite(priceInOriginalCurrency) && priceInOriginalCurrency > 0 ? priceInOriginalCurrency : pricePerTicket,
          currency: normalizedOriginalCurrency,
          original_currency: normalizedOriginalCurrency,
          // settlement-per-event rate (USD per HTG for Stripe when event is HTG)
          exchange_rate_used: exchangeRateUsed,
          payment_method: paymentMethod,
          payment_id: session.payment_intent,
          status: 'valid',
          qr_code_data: qrCodeData,
          purchased_at: new Date().toISOString(),
          // Stamp the exact tier id at issuance so scan-time validity can look up the tier by
          // id instead of by fragile name. '' when the checkout had no tier metadata.
          tier_id: session.metadata.tierId || '',
        }

        const insertResult = await supabase
          .from('tickets')
          .insert([ticketData])
          .select()

        if (insertResult.error) {
          console.error('Failed to create ticket:', insertResult.error)
          await releaseInventoryReservation({
            eventId: session.metadata.eventId,
            quantity,
            tierIncrements: checkoutTierIncrements,
            logPrefix: '[stripe]',
          })
          return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 })
        }
        
        const createdTicket = insertResult.data?.[0]
        if (createdTicket) {
          createdTickets.push(createdTicket)
          console.log('Created ticket:', createdTicket.id, 'with QR:', qrCodeData)

          // Mirror into Firestore for organizer earnings/admin analytics.
          try {
            await adminDb.collection('tickets').doc(String(createdTicket.id)).set(
              {
                event_id: session.metadata.eventId,
                attendee_id: session.client_reference_id,
                status: 'confirmed',
                ticket_type: createdTicket.tier_name || createdTicket.tierName || 'General Admission',
                tier_id: session.metadata.tierId || '',
                price_paid: ticketData.price_paid,
                currency: ticketData.currency,
                exchange_rate_used: ticketData.exchange_rate_used ?? null,
                charged_amount: pricePerTicket,
                charged_currency: String(session.currency || 'usd').toUpperCase(),
                payment_method: paymentMethod,
                payment_id: session.payment_intent,
                purchased_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )
          } catch (e) {
            console.warn('[stripe] failed to mirror ticket to Firestore', {
              ticketId: createdTicket.id,
              message: (e as any)?.message,
            })
          }
        }
      }

      // Fetch event and attendee by document id (direct get — no full-collection scan).
      const eventDoc = await adminDb.collection('events').doc(String(session.metadata.eventId)).get()
      const eventDetails = eventDoc.exists ? { id: eventDoc.id, ...(eventDoc.data() as any) } : null

      const attendeeDoc = await adminDb.collection('users').doc(String(session.client_reference_id)).get()
      const attendee = attendeeDoc.exists ? { id: attendeeDoc.id, ...(attendeeDoc.data() as any) } : null
      
      // Create ticket object with joined data for email
      const ticket = createdTickets[0] ? {
        ...createdTickets[0],
        event: eventDetails,
        attendee
      } : null

      // Redeem the promo code atomically (Firestore) — the SINGLE redemption point
      // for hosted-checkout orders. create-checkout-session already resolved the promo
      // and stamped its Firestore doc id into metadata.promoCodeId ONLY when a discount
      // was actually applied. The whole checkout.session.completed handler runs at most
      // once per order (idempotency claim on event.id above), so redeeming the full
      // order quantity here in one transaction never double-counts. If the "first N
      // buyers" cap filled between pricing and confirmation, we KEEP the already-issued
      // tickets (buyer paid the discounted price) and simply log the over-cap; we never
      // throw, so promo bookkeeping can never fail ticket issuance.
      if (session.metadata.promoCodeId) {
        try {
          const originalPrice = parseFloat(session.metadata.originalPrice || '0')
          const finalPrice = parseFloat(session.metadata.finalPrice || '0')
          const perTicketDiscount =
            Number.isFinite(originalPrice) && Number.isFinite(finalPrice)
              ? Math.max(0, originalPrice - finalPrice)
              : 0
          const redeem = await redeemPromoInTransaction({
            promoId: session.metadata.promoCodeId,
            qty: quantity,
            userId: session.client_reference_id,
            eventId: session.metadata.eventId,
            discountApplied: perTicketDiscount * quantity,
          })
          if (redeem.capReached) {
            console.warn('[stripe] promo cap reached at confirm (checkout.session); tickets kept, not over-counted', {
              promoId: session.metadata.promoCodeId,
              eventId: session.metadata.eventId,
            })
          }
        } catch (promoErr) {
          console.error('[stripe] promo redemption failed (checkout.session)', (promoErr as any)?.message)
        }
      }

      // NOTE: inventory was already reserved/incremented up front by reserveInventoryAtomic (the
      // oversell gate), so we intentionally do NOT increment again here.

      // Update event earnings (NEW: automatic earnings tracking)
      try {
        const eventGrossCents = Math.round(
          (Number.isFinite(priceInOriginalCurrency) && priceInOriginalCurrency > 0 ? priceInOriginalCurrency : pricePerTicket) *
            quantity *
            100
        )
        await addTicketToEarnings(session.metadata.eventId, eventGrossCents, quantity, {
          currency: originalCurrency,
          paymentMethod,
          chargedAmountCents: session.amount_total,
          fxRate: exchangeRateUsed,
          chargedCurrency: String(session.currency || 'usd').toUpperCase(),
        })
        console.log(`✅ Updated earnings for event ${session.metadata.eventId}: ${session.amount_total} cents (${quantity} tickets)`)
      } catch (earningsError) {
        console.error('❌ Failed to update earnings:', earningsError)
        // Don't fail the webhook - log for manual reconciliation
      }

      // Deliver the ticket.
      //
      // `ticket` is null when every insert above failed — reading `ticket.id` here used
      // to throw, and a throw in this handler is reported to Stripe as a FAILED webhook,
      // which it then retries against an order it can no longer fix. Delivery is
      // best-effort by design: the tickets (if any) already exist and are already paid for.
      if (ticket?.id && ticket.attendee && ticket.event) {
        await sendTicketConfirmation({
          ticketId: String(ticket.id),
          qrPayload: ticket.qr_code_data || ticket.id,
          event: ticket.event,
          recipient: {
            email: ticket.attendee.email,
            name: ticket.attendee.full_name,
            phone: ticket.attendee.phone,
            isGuest: false,
          },
          quantity,
          logPrefix: '[stripe]',
        })

        // Send in-app notification for ticket purchase
        try {
          await notifyTicketPurchase(
            session.client_reference_id,
            session.metadata.eventId,
            ticket.event.title,
            quantity
          )
          
          // Notify organizer
          await notifyOrganizerTicketSale(
            ticket.event.organizer_id,
            session.metadata.eventId,
            ticket.event.title,
            quantity,
            session.amount_total ? session.amount_total / 100 : 0,
            ticket.user?.full_name
          )
        } catch (error) {
          console.error('Failed to send notification:', error)
          // Don't fail the webhook if notification fails
        }
      }
    }
    
    // Handle payment_intent.succeeded for embedded payments
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      
      console.log('💳 Payment Intent Succeeded:', {
        id: paymentIntent.id,
        metadata: paymentIntent.metadata,
        amount: paymentIntent.amount,
      })

      // Hosted Checkout ALSO emits payment_intent.succeeded, but those PaymentIntents carry no
      // metadata (we set metadata on the Checkout Session, not the PI). Skip when there's no
      // eventId so we don't create broken/duplicate tickets — checkout.session.completed handles
      // those purchases. Embedded payments (create-payment-intent) always include eventId.
      if (!paymentIntent.metadata?.eventId) {
        console.log('[stripe] payment_intent.succeeded without eventId metadata; skipping (handled via checkout.session.completed)', {
          paymentIntentId: paymentIntent.id,
        })
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: event.id,
          metadata: { type: event.type, skipped: 'no_event_metadata' },
        })
        return NextResponse.json({ received: true, skipped: 'no_event_metadata' })
      }

      // Cross-path idempotency: the client "confirm payment" route (create-from-payment) may also
      // fulfill this exact PaymentIntent. Both claim the SAME payment_intent-scoped key so only one
      // path ever issues tickets / reserves inventory. If the other path already owns it, no-op.
      piFulfillId = `pi_fulfill_${paymentIntent.id}`
      const piFulfillClaim = await claimWebhookEvent({
        provider: 'stripe',
        eventId: piFulfillId,
        eventType: 'payment_intent.fulfill',
      })
      if (piFulfillClaim.outcome !== 'claimed') {
        console.log('[stripe] payment_intent already fulfilled by client-confirm path; skipping', {
          paymentIntentId: paymentIntent.id,
          outcome: piFulfillClaim.outcome,
        })
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: event.id,
          metadata: { type: event.type, skipped: 'already_fulfilled' },
        })
        return NextResponse.json({ received: true, skipped: 'already_fulfilled' })
      }

      // Create tickets in database
      const supabase = await createClient()
      const quantity = parseInt(paymentIntent.metadata.quantity || '1', 10)
      const pricePerTicket = paymentIntent.amount / 100 / quantity
      const originalCurrency = String(paymentIntent.metadata.originalCurrency || '').toUpperCase() || 'USD'
      const normalizedOriginalCurrency = (() => {
        if (originalCurrency === 'HTG') return 'HTG'
        if (originalCurrency === 'CAD') return 'CAD'
        return 'USD'
      })()
      const priceInOriginalCurrency = Number(paymentIntent.metadata.priceInOriginalCurrency || paymentIntent.metadata.finalPrice || 0)
      const exchangeRateUsed = paymentIntent.metadata.exchangeRate ? parseFloat(paymentIntent.metadata.exchangeRate) : null
      const payoutProvider = String(paymentIntent.metadata.payoutProvider || '').toLowerCase()
      const paymentMethod = payoutProvider === 'stripe_connect' ? 'stripe_connect' : 'stripe'

      // Authoritative oversell gate: atomically reserve inventory BEFORE creating tickets. If the
      // event/tier is now full, the customer has paid but we can't honor it — auto-refund and stop.
      const piTierIncrements = buildTierSoldIncrements(
        paymentIntent.metadata.tierId ? [{ tierId: paymentIntent.metadata.tierId, quantity }] : []
      )
      const piReservation = await reserveInventoryAtomic({
        eventId: paymentIntent.metadata.eventId,
        quantity,
        tierIncrements: piTierIncrements,
        logPrefix: '[stripe]',
      })
      if (!piReservation.ok) {
        console.error('[stripe] capacity exceeded after payment — auto-refunding payment intent', {
          paymentIntentId: paymentIntent.id,
          reason: piReservation.reason,
        })
        try {
          await stripe.refunds.create({ payment_intent: paymentIntent.id })
        } catch (refundErr) {
          console.error('[stripe] failed to auto-refund oversold payment intent', refundErr)
        }
        // Mark BOTH the webhook-event claim and the shared payment_intent claim completed so the
        // client-confirm path also no-ops (the payment was refunded — no tickets should be issued).
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: piFulfillId,
          metadata: { type: event.type, refunded: 'capacity_exceeded' },
        })
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: event.id,
          metadata: { type: event.type, refunded: 'capacity_exceeded' },
        })
        return NextResponse.json({ received: true, refunded: 'capacity_exceeded' })
      }

      // WHO this order belongs to. `metadata.userId` is a uid for an account purchase
      // and a `guest_…` id for a guest one; the guest's contact details were stamped
      // into metadata at create-payment-intent time, BEFORE payment, so the recipient is
      // read from the order rather than from anything this request could carry.
      const piGuestRecipient = guestRecipientFromOrder({
        is_guest: paymentIntent.metadata.isGuest === 'true',
        user_id: paymentIntent.metadata.userId,
        guest_name: paymentIntent.metadata.guestName,
        guest_email: paymentIntent.metadata.guestEmail,
        guest_phone: paymentIntent.metadata.guestPhone,
        guest_order_key: paymentIntent.metadata.guestOrderKey,
      })

      // Create tickets
      const createdTickets = []
      for (let i = 0; i < quantity; i++) {
        const qrCodeData = `ticket-${paymentIntent.metadata.eventId}-${paymentIntent.metadata.userId}-${Date.now()}-${i}`
        const ticketData = {
          event_id: paymentIntent.metadata.eventId,
          attendee_id: paymentIntent.metadata.userId,
          ...(piGuestRecipient
            ? {
                attendee_name: piGuestRecipient.name,
                is_guest: true,
                guest_email: piGuestRecipient.email,
                guest_phone: piGuestRecipient.phone || null,
              }
            : {}),
          price_paid: Number.isFinite(priceInOriginalCurrency) && priceInOriginalCurrency > 0 ? priceInOriginalCurrency : pricePerTicket,
          currency: normalizedOriginalCurrency,
          original_currency: normalizedOriginalCurrency,
          exchange_rate_used: exchangeRateUsed,
          payment_method: paymentMethod,
          payment_id: paymentIntent.id,
          status: 'valid',
          qr_code_data: qrCodeData,
          purchased_at: new Date().toISOString(),
          tier_id: paymentIntent.metadata.tierId || '',
          tier_name: paymentIntent.metadata.tierName || 'General Admission',
        }
        
        const insertResult = await supabase
          .from('tickets')
          .insert([ticketData])
          .select()
        
        if (insertResult.error) {
          console.error('Failed to create ticket:', insertResult.error)
          continue
        }
        
        const createdTicket = insertResult.data?.[0]
        if (createdTicket) {
          createdTickets.push(createdTicket)
          console.log('✅ Created ticket from PaymentIntent:', {
            ticketId: createdTicket.id,
            attendeeId: createdTicket.attendee_id,
            eventId: createdTicket.event_id,
            qrCode: createdTicket.qr_code_data
          })

          // Mirror into Firestore for organizer earnings/admin analytics.
          try {
            await adminDb.collection('tickets').doc(String(createdTicket.id)).set(
              {
                event_id: paymentIntent.metadata.eventId,
                attendee_id: paymentIntent.metadata.userId,
                status: 'confirmed',
                ticket_type: paymentIntent.metadata.tierName || 'General Admission',
                tier_id: paymentIntent.metadata.tierId || '',
                ...(piGuestRecipient
                  ? {
                      is_guest: true,
                      attendee_name: piGuestRecipient.name,
                      guest_email: piGuestRecipient.email,
                      guest_phone: piGuestRecipient.phone || null,
                    }
                  : {}),
                price_paid: ticketData.price_paid,
                currency: ticketData.currency,
                exchange_rate_used: ticketData.exchange_rate_used ?? null,
                charged_amount: pricePerTicket,
                charged_currency: String(paymentIntent.currency || 'usd').toUpperCase(),
                payment_method: paymentMethod,
                payment_id: paymentIntent.id,
                purchased_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { merge: true }
            )
          } catch (e) {
            console.warn('[stripe] failed to mirror ticket to Firestore', {
              ticketId: createdTicket.id,
              message: (e as any)?.message,
            })
          }
        }
      }
      
      console.log(`📊 Total tickets created: ${createdTickets.length} for user ${paymentIntent.metadata.userId}`)

      // Redeem the promo code atomically (Firestore) — the SINGLE redemption point for
      // embedded (create-payment-intent) orders. create-payment-intent resolved the promo
      // and stamped its Firestore doc id into metadata.promoCodeId ONLY when a discount was
      // actually applied. The shared payment_intent-scoped claim above guarantees exactly one
      // path (this webhook OR the client-confirm route) fulfills this PaymentIntent, so
      // redeeming the full order quantity here once never double-counts. Cap-reached at
      // confirm keeps the issued tickets and only logs; never throws.
      if (createdTickets.length > 0 && paymentIntent.metadata.promoCodeId) {
        try {
          const originalPrice = parseFloat(paymentIntent.metadata.originalPrice || '0')
          const finalPrice = parseFloat(paymentIntent.metadata.finalPrice || '0')
          const perTicketDiscount =
            Number.isFinite(originalPrice) && Number.isFinite(finalPrice)
              ? Math.max(0, originalPrice - finalPrice)
              : 0
          const redeem = await redeemPromoInTransaction({
            promoId: paymentIntent.metadata.promoCodeId,
            qty: quantity,
            userId: paymentIntent.metadata.userId,
            eventId: paymentIntent.metadata.eventId,
            discountApplied: perTicketDiscount * quantity,
          })
          if (redeem.capReached) {
            console.warn('[stripe] promo cap reached at confirm (payment_intent); tickets kept, not over-counted', {
              promoId: paymentIntent.metadata.promoCodeId,
              eventId: paymentIntent.metadata.eventId,
            })
          }
        } catch (promoErr) {
          console.error('[stripe] promo redemption failed (payment_intent)', (promoErr as any)?.message)
        }
      }

      // Update event earnings for embedded payments as well.
      try {
        const eventGrossCents = Math.round(
          (Number.isFinite(priceInOriginalCurrency) && priceInOriginalCurrency > 0 ? priceInOriginalCurrency : pricePerTicket) *
            quantity *
            100
        )
        await addTicketToEarnings(paymentIntent.metadata.eventId, eventGrossCents, quantity, {
          currency: originalCurrency,
          paymentMethod,
          chargedAmountCents: paymentIntent.amount,
          fxRate: exchangeRateUsed,
          chargedCurrency: String(paymentIntent.currency || 'usd').toUpperCase(),
        })
        console.log(`✅ Updated earnings for event ${paymentIntent.metadata.eventId}: ${paymentIntent.amount} cents (${quantity} tickets)`)
      } catch (earningsError) {
        console.error('❌ Failed to update earnings:', earningsError)
        // Don't fail the webhook - log for manual reconciliation
      }

      // NOTE: inventory was already reserved/incremented up front by reserveInventoryAtomic (the
      // oversell gate), so we intentionally do NOT increment again here.
      
      // Send notifications (similar to checkout.session.completed)
      if (createdTickets.length > 0) {
        const eventDoc = await adminDb.collection('events').doc(String(paymentIntent.metadata.eventId)).get()
        const eventDetails = eventDoc.exists ? { id: eventDoc.id, ...(eventDoc.data() as any) } : null

        // A guest has no user document — their details come off the order instead.
        const attendee = piGuestRecipient
          ? {
              email: piGuestRecipient.email,
              full_name: piGuestRecipient.name,
              phone: piGuestRecipient.phone,
            }
          : await (async () => {
              const attendeeDoc = await adminDb
                .collection('users')
                .doc(String(paymentIntent.metadata.userId))
                .get()
              return attendeeDoc.exists ? { id: attendeeDoc.id, ...(attendeeDoc.data() as any) } : null
            })()

        console.log('👤 Attendee found:', attendee?.email || 'No attendee')
        console.log('🎫 Event found:', eventDetails?.title || 'No event')

        // Deliver the ticket + QR. Embedded card purchases previously fell through
        // here with no confirmation at all.
        try {
          if (piGuestRecipient && paymentIntent.metadata.guestOrderKey) {
            await attachTicketsToGuestOrder(
              String(paymentIntent.metadata.guestOrderKey),
              createdTickets.map((t: any) => String(t.id))
            )
          }

          await sendTicketConfirmation({
            ticketId: String(createdTickets[0].id),
            qrPayload: createdTickets[0].qr_code_data || createdTickets[0].id,
            event: eventDetails,
            recipient: {
              email: attendee?.email,
              name: attendee?.full_name,
              phone: attendee?.phone,
              isGuest: Boolean(piGuestRecipient),
            },
            quantity,
            guestToken: piGuestRecipient?.guestToken || null,
            logPrefix: '[stripe]',
          })
        } catch (error) {
          console.error('[stripe] failed to deliver ticket confirmation', error)
        }

        try {
          // In-app notifications need an account to land in; a guest has none.
          if (!isGuestId(paymentIntent.metadata.userId)) {
            await notifyTicketPurchase(
              paymentIntent.metadata.userId,
              paymentIntent.metadata.eventId,
              eventDetails?.title || 'Event',
              quantity
            )
          }

          // Notify organizer
          if (eventDetails) {
            await notifyOrganizerTicketSale(
              eventDetails.organizer_id,
              paymentIntent.metadata.eventId,
              eventDetails.title,
              quantity,
              paymentIntent.amount / 100,
              attendee?.full_name
            )
          }
        } catch (error) {
          console.error('Failed to send notification:', error)
        }
      }

      // Mark the shared payment_intent claim completed so the client-confirm path no-ops.
      await markWebhookEventCompleted({
        provider: 'stripe',
        eventId: piFulfillId,
        metadata: { type: event.type, tickets: createdTickets.length },
      })
    }

    // Mark the event fully processed so any future redelivery is a no-op.
    if (stripeEvent && HANDLED_EVENT_TYPES.has(stripeEvent.type)) {
      await markWebhookEventCompleted({
        provider: 'stripe',
        eventId: stripeEvent.id,
        metadata: { type: stripeEvent.type },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)

    // Release the idempotency claim so Stripe's automatic retry can reprocess this event
    // instead of being permanently blocked as "in progress".
    if (stripeEvent && HANDLED_EVENT_TYPES.has(stripeEvent.type)) {
      await releaseWebhookEvent({ provider: 'stripe', eventId: stripeEvent.id })
    }
    // Also release the shared payment_intent claim so the client-confirm path (or a retry) can
    // re-fulfill instead of being stuck as "in progress".
    if (piFulfillId) {
      await releaseWebhookEvent({ provider: 'stripe', eventId: piFulfillId })
    }

    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
