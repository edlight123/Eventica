import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { sendEmail, getTicketConfirmationEmail } from '@/lib/email'
import { generateTicketQRCode } from '@/lib/qrcode'
import { sendWhatsAppMessage, getTicketConfirmationWhatsApp } from '@/lib/whatsapp'
import { trackPromoCodeUsage, calculateDiscount } from '@/lib/promo-codes'
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

      // Fetch event and attendee details separately (no joins with Firebase)
      const eventQuery = await supabase.from('events').select('*')
      const eventDetails = eventQuery.data?.find((e: any) => e.id === session.metadata.eventId)
      
      const attendeeQuery = await supabase.from('users').select('*')
      const attendee = attendeeQuery.data?.find((u: any) => u.id === session.client_reference_id)
      
      // Create ticket object with joined data for email
      const ticket = createdTickets[0] ? {
        ...createdTickets[0],
        event: eventDetails,
        attendee
      } : null

      // Track promo code usage if applicable
      if (session.metadata.promoCodeId && session.metadata.originalPrice) {
        const { data: promoCode } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('id', session.metadata.promoCodeId)
          .single()

        if (promoCode) {
          const originalPrice = parseFloat(session.metadata.originalPrice)
          const { discountAmount } = calculateDiscount(originalPrice, promoCode)
          
          await trackPromoCodeUsage(
            session.metadata.promoCodeId,
            session.client_reference_id,
            ticket.id,
            discountAmount,
            supabase
          )
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

      // Generate QR code
      const qrCodeDataURL = await generateTicketQRCode(ticket.id)

      // Send confirmation email
      if (ticket.attendee && ticket.event) {
        const ticketWord = quantity > 1 ? `${quantity} tickets` : 'ticket'
        await sendEmail({
          to: ticket.attendee.email,
          subject: `Your ${ticketWord} for ${ticket.event.title}`,
          html: getTicketConfirmationEmail({
            attendeeName: ticket.attendee.full_name || 'Guest',
            eventTitle: ticket.event.title,
            eventDate: new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            eventVenue: `${ticket.event.venue_name}, ${ticket.event.city}`,
            ticketId: ticket.id,
            qrCodeDataURL,
          }),
        })

        // Send WhatsApp notification if phone number available
        if (ticket.attendee.phone) {
          await sendWhatsAppMessage({
            to: ticket.attendee.phone,
            message: getTicketConfirmationWhatsApp(
              ticket.attendee.full_name || 'Guest',
              ticket.event.title,
              new Date(ticket.event.start_datetime).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              `${ticket.event.venue_name}, ${ticket.event.city}`,
              ticket.id
            ),
          })
        }

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
        await markWebhookEventCompleted({
          provider: 'stripe',
          eventId: event.id,
          metadata: { type: event.type, refunded: 'capacity_exceeded' },
        })
        return NextResponse.json({ received: true, refunded: 'capacity_exceeded' })
      }

      // Create tickets
      const createdTickets = []
      for (let i = 0; i < quantity; i++) {
        const qrCodeData = `ticket-${paymentIntent.metadata.eventId}-${paymentIntent.metadata.userId}-${Date.now()}-${i}`
        const ticketData = {
          event_id: paymentIntent.metadata.eventId,
          attendee_id: paymentIntent.metadata.userId,
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

      // Track promo code usage (embedded payments)
      if (createdTickets.length > 0 && paymentIntent.metadata.promoCodeId && paymentIntent.metadata.originalPrice) {
        const { data: promoCode } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('id', paymentIntent.metadata.promoCodeId)
          .single()

        if (promoCode) {
          const originalPrice = parseFloat(paymentIntent.metadata.originalPrice)
          const { discountAmount } = calculateDiscount(originalPrice, promoCode)
          const firstTicket = createdTickets[0]
          if (firstTicket?.id) {
            await trackPromoCodeUsage(
              paymentIntent.metadata.promoCodeId,
              paymentIntent.metadata.userId,
              firstTicket.id,
              discountAmount,
              supabase
            )
          }
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
        const eventQuery = await supabase.from('events').select('*')
        const eventDetails = eventQuery.data?.find((e: any) => e.id === paymentIntent.metadata.eventId)
        
        const attendeeQuery = await supabase.from('users').select('*')
        const attendee = attendeeQuery.data?.find((u: any) => u.id === paymentIntent.metadata.userId)
        
        console.log('👤 Attendee found:', attendee?.email || 'No attendee')
        console.log('🎫 Event found:', eventDetails?.title || 'No event')
        
        try {
          await notifyTicketPurchase(
            paymentIntent.metadata.userId,
            paymentIntent.metadata.eventId,
            eventDetails?.title || 'Event',
            quantity
          )
          
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

    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
