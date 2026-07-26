import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { calculateDiscount } from '@/lib/promo-codes'
import { 
  isBlacklisted, 
  shouldRateLimit, 
  checkTicketLimit, 
  logPurchaseAttempt,
  detectBotBehavior,
  logSuspiciousActivity 
} from '@/lib/security'
import { adminDb } from '@/lib/firebase/admin'
import { getPaymentProviderForEventCountry } from '@/lib/payment-provider'
import { calculateFees } from '@/lib/fees'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { hasEventAccess } from '@/lib/events/access-guard'
import { isPaidAllowed, countrySupport, defaultCurrencyForCountry } from '@/lib/country-support'

// Lazy load Stripe
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, quantity = 1, tierId, promoCodeId, fingerprint } = await request.json()

    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Security checks (same as checkout session)
    const userBlacklist = await isBlacklisted(user.id, 'user')
    if (userBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: `Account suspended: ${userBlacklist.reason}` 
      }, { status: 403 })
    }

    const emailBlacklist = await isBlacklisted(user.email, 'email')
    if (emailBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase. Please contact support.' 
      }, { status: 403 })
    }

    const ipBlacklist = await isBlacklisted(ipAddress, 'ip')
    if (ipBlacklist.blacklisted) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Unable to process purchase from this network.' 
      }, { status: 403 })
    }

    const rateLimit = await shouldRateLimit(user.id, ipAddress, eventId)
    if (rateLimit.limited) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: rateLimit.reason 
      }, { status: 429 })
    }

    const isBot = await detectBotBehavior(user.id, ipAddress, fingerprint)
    if (isBot) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: 'Automated purchase attempts are not allowed.' 
      }, { status: 403 })
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Password-protected events: require a valid access grant before payment.
    if (!(await hasEventAccess(event, eventId, user.id))) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ error: 'access_code_required' }, { status: 403 })
    }

    // Defense in depth: never take money for a country whose payout rail isn't
    // ready (coming-soon markets like the Dominican Republic). Publish is already
    // gated, but block at the payment entry too in case a paid event slipped through.
    if (!isPaidAllowed(event.country)) {
      const name = countrySupport(event.country)?.name || 'this country'
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json(
        { error: `Payouts are not yet available in ${name}.` },
        { status: 400 }
      )
    }

    const provider = getPaymentProviderForEventCountry(event.country)
    if (provider === 'sogepay') {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json(
        { error: 'Card payments for Haiti events use Sogepay. Please use the Sogepay checkout flow.' },
        { status: 400 }
      )
    }

    // Check ticket limit
    const ticketLimit = await checkTicketLimit(user.id, eventId)
    if (ticketLimit.exceeded) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      return NextResponse.json({ 
        error: `You already have ${ticketLimit.currentCount} ticket(s) for this event. Maximum allowed: ${ticketLimit.maxAllowed}` 
      }, { status: 400 })
    }

    if (ticketLimit.currentCount! + quantity > ticketLimit.maxAllowed!) {
      await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
      const remaining = ticketLimit.maxAllowed! - ticketLimit.currentCount!
      return NextResponse.json({ 
        error: `You can only purchase ${remaining} more ticket(s) for this event (limit: ${ticketLimit.maxAllowed})` 
      }, { status: 400 })
    }

    // Get tier price if specified
    let finalPrice = event.ticket_price
    let tierName = 'General Admission'
    // Track the pre-discount price so metadata/originalPrice is accurate.
    let basePriceBeforePromo = finalPrice

    if (tierId) {
      const { data: tier } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('id', tierId)
        .single()

      if (tier) {
        const now = new Date()
        const salesStart = tier.sales_start ? new Date(tier.sales_start) : null
        const salesEnd = tier.sales_end ? new Date(tier.sales_end) : null

        if (tier.is_active === false) {
          await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
          return NextResponse.json({ error: 'This ticket tier is not available.' }, { status: 400 })
        }
        if (salesStart && !Number.isNaN(salesStart.getTime()) && salesStart > now) {
          await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
          return NextResponse.json({ error: 'Ticket sales for this tier have not started yet.' }, { status: 400 })
        }
        if (salesEnd && !Number.isNaN(salesEnd.getTime()) && salesEnd < now) {
          await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
          return NextResponse.json({ error: 'Ticket sales for this tier have ended.' }, { status: 400 })
        }

        const sold = Number(tier.sold_quantity || 0)
        const total = Number(tier.total_quantity || 0)
        const remaining = Math.max(0, total - sold)
        if (remaining <= 0) {
          await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
          return NextResponse.json({ error: 'This ticket tier is sold out.' }, { status: 400 })
        }
        if (quantity > remaining) {
          await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
          return NextResponse.json({ error: `Only ${remaining} ticket(s) remaining for this tier.` }, { status: 400 })
        }

        finalPrice = tier.price
        basePriceBeforePromo = finalPrice
        tierName = tier.name
      }
    }

    // Apply promo code if provided
    let promoCode = null
    if (promoCodeId) {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .single()

      if (!error && data) {
        promoCode = data
        const { discountedPrice } = calculateDiscount(finalPrice, promoCode)
        finalPrice = discountedPrice
      }
    }

    // Handle currency conversion for Stripe.
    // Charge currency follows the event's stored currency; when absent, fall back
    // to the country default (USD/CAD/EUR/HTG) — never hardcode USD, so FR (EUR)
    // settles in EUR.
    const eventCurrency = (event.currency?.toUpperCase() || defaultCurrencyForCountry(event.country).toUpperCase()) as string
    let stripeAmount = finalPrice
    let stripeCurrency = eventCurrency.toLowerCase()
    let exchangeRateUsed: number | null = null
    let originalCurrency = eventCurrency
    
    // Convert HTG to USD for Stripe if needed (Stripe doesn't support HTG directly)
    if (eventCurrency === 'HTG') {
      const { fetchStripeHTGRate } = await import('@/lib/currency')
      // Fetch live exchange rate from Stripe
      exchangeRateUsed = await fetchStripeHTGRate()
      stripeAmount = finalPrice * exchangeRateUsed
      stripeCurrency = 'usd'
      console.log(`💱 Converting ${finalPrice} HTG to ${stripeAmount.toFixed(2)} USD (Stripe rate: ${exchangeRateUsed})`)
    }

    // Create PaymentIntent
    const amountCents = Math.round(stripeAmount * quantity * 100)
    let stripeConnectAccountId: string | null = null
    let applicationFeeAmount: number | null = null

    if (provider === 'stripe_connect') {
      const organizerId = String(event.organizer_id || '')
      if (!organizerId) {
        await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
        return NextResponse.json({ error: 'Event organizer is missing.' }, { status: 400 })
      }

      const stripeProfile = await getPayoutProfile(organizerId, 'stripe_connect')
      const stripeAccountId = stripeProfile?.stripeAccountId
      if (!stripeAccountId) {
        await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, false)
        return NextResponse.json(
          { error: 'Organizer has not connected Stripe Connect yet.' },
          { status: 400 }
        )
      }

      stripeConnectAccountId = stripeAccountId

      // Keep the organizer net consistent with our fee model by collecting
      // platform fee + processing fee as the Connect application fee.
      const feeBreakdown = calculateFees(amountCents)
      applicationFeeAmount = Math.max(0, Math.min(amountCents, feeBreakdown.platformFee + feeBreakdown.processingFee))
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents, // Convert to cents
      currency: stripeCurrency,
      ...(stripeConnectAccountId
        ? {
            transfer_data: {
              destination: stripeConnectAccountId,
            },
            application_fee_amount: applicationFeeAmount || undefined,
          }
        : {}),
      metadata: {
        eventId,
        userId: user.id,
        eventTitle: event.title,
        quantity: quantity.toString(),
        tierId: tierId || '',
        tierName,
        promoCodeId: promoCodeId || '',
        originalPrice: basePriceBeforePromo.toString(),
        finalPrice: finalPrice.toString(),
        currency: stripeCurrency,
        originalCurrency: originalCurrency,
        exchangeRate: exchangeRateUsed?.toString() || '',
        priceInOriginalCurrency: finalPrice.toString(),
        payoutProvider: provider,
        stripeConnectAccountId: stripeConnectAccountId || '',
      },
      description: `${quantity}x ${event.title} - ${tierName}`,
      receipt_email: user.email,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Log successful attempt
    await logPurchaseAttempt({ userId: user.id, eventId, ipAddress, quantity, fingerprint }, true)

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error: any) {
    console.error('Payment Intent creation error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
