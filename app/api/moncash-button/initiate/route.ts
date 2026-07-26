import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { calculateDiscount } from '@/lib/promo-codes'
import { convertUsdToHtgAmount, getUsdToHtgRateWithSpread } from '@/lib/fx/usd-htg'
import { inferCountryFromEventText } from '@/lib/event-country'
import { checkEventCapacity } from '@/lib/capacity'
import { hasEventAccess } from '@/lib/events/access-guard'
import { isPaidAllowed, countrySupport } from '@/lib/country-support'
import {
  createMonCashButtonCheckoutToken,
  getMonCashButtonRedirectUrl,
  isMonCashButtonConfigured,
} from '@/lib/moncash-button'

import crypto from 'crypto'

export const runtime = 'nodejs'

function buildTokenVariants(token: string): string[] {
  const raw = String(token || '').trim()
  if (!raw) return []

  const decoded = (() => {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  })()

  const stripPadding = (v: string) => v.replace(/=+$/g, '')
  const toBase64 = (v: string) => v.replace(/-/g, '+').replace(/_/g, '/')
  const toBase64Url = (v: string) => v.replace(/\+/g, '-').replace(/\//g, '_')

  const candidates = [
    raw,
    decoded,
    stripPadding(raw),
    stripPadding(decoded),
    toBase64(raw),
    toBase64(decoded),
    stripPadding(toBase64(raw)),
    stripPadding(toBase64(decoded)),
    toBase64Url(raw),
    toBase64Url(decoded),
    stripPadding(toBase64Url(raw)),
    stripPadding(toBase64Url(decoded)),
  ]

  return Array.from(new Set(candidates.map((c) => c.trim()).filter(Boolean)))
}

type TierSelection = { tierId: string; quantity: number }

function tierIsOnSale(tier: any, now: Date): { ok: true } | { ok: false; reason: string } {
  if (tier?.is_active === false) return { ok: false, reason: 'This ticket tier is not available.' }

  const salesStart = tier?.sales_start ? new Date(tier.sales_start) : null
  const salesEnd = tier?.sales_end ? new Date(tier.sales_end) : null

  if (salesStart && !Number.isNaN(salesStart.getTime()) && salesStart > now) {
    return { ok: false, reason: 'Ticket sales for this tier have not started yet.' }
  }
  if (salesEnd && !Number.isNaN(salesEnd.getTime()) && salesEnd < now) {
    return { ok: false, reason: 'Ticket sales for this tier have ended.' }
  }

  const sold = Number(tier?.sold_quantity || 0)
  const total = Number(tier?.total_quantity || 0)
  const remaining = Math.max(0, total - sold)
  if (remaining <= 0) return { ok: false, reason: 'This ticket tier is sold out.' }

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isMonCashButtonConfigured()) {
      return NextResponse.json({ error: 'MonCash Button is not configured' }, { status: 500 })
    }

    const {
      eventId,
      quantity = 1,
      tierId,
      promoCode,
      tiers,
      mobileMoneyProvider,
      forceFormPost,
    }: {
      eventId: string
      quantity?: number
      tierId?: string | null
      promoCode?: string | null
      tiers?: TierSelection[]
      mobileMoneyProvider?: string | null
      forceFormPost?: boolean
    } = await request.json()

    const provider = String(mobileMoneyProvider || 'moncash').toLowerCase()
    const normalizedProvider = provider === 'natcash' ? 'natcash' : 'moncash'

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Password-protected events: require a valid access grant before payment.
    if (!(await hasEventAccess(event, eventId, user.id))) {
      return NextResponse.json({ error: 'access_code_required' }, { status: 403 })
    }

    // Defense in depth: never take money for a country whose payout rail isn't
    // ready (coming-soon markets like the Dominican Republic). MonCash is Haiti-only
    // so this is belt-and-suspenders, but keep the guard so no paid entry is exempt.
    if (!isPaidAllowed(event.country)) {
      const name = countrySupport(event.country)?.name || 'this country'
      return NextResponse.json(
        { error: `Payouts are not yet available in ${name}.` },
        { status: 400 }
      )
    }

    // MonCash is Haiti-only. Do not fall back to organizer location here, otherwise
    // a US/CA event created by a Haiti organizer could be incorrectly routed to MonCash.
    const eventCountry = inferCountryFromEventText(event)
    if (eventCountry !== 'HT') {
      return NextResponse.json(
        { error: 'MonCash is only available for events in Haiti.' },
        { status: 400 }
      )
    }

    // Promo code (optional)
    let promo = null
    if (promoCode) {
      const { data } = await supabase.from('promo_codes').select('*').eq('id', promoCode).single()
      if (data) promo = data
    }

    // Normalize tier selections
    let normalizedSelections: { tierId: string | null; tierName: string; quantity: number; unitPrice: number }[] = []
    const now = new Date()

    if (Array.isArray(tiers) && tiers.length > 0) {
      // Multi-tier selection
      for (const selection of tiers) {
        if (!selection?.tierId || !selection.quantity || selection.quantity <= 0) continue

        const { data: tier } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('id', selection.tierId)
          .single()

        if (!tier) continue

        const onSale = tierIsOnSale(tier, now)
        if (!onSale.ok) {
          return NextResponse.json({ error: onSale.reason }, { status: 400 })
        }

        const sold = Number(tier.sold_quantity || 0)
        const total = Number(tier.total_quantity || 0)
        const remaining = Math.max(0, total - sold)
        if (selection.quantity > remaining) {
          return NextResponse.json({ error: `Only ${remaining} ticket(s) remaining for ${tier.name || 'this tier'}.` }, { status: 400 })
        }

        let unitPrice = tier.price
        if (promo) {
          const { discountedPrice } = calculateDiscount(unitPrice, promo)
          unitPrice = discountedPrice
        }

        normalizedSelections.push({
          tierId: selection.tierId,
          tierName: tier.name || 'Ticket',
          quantity: selection.quantity,
          unitPrice,
        })
      }

      if (normalizedSelections.length === 0) {
        return NextResponse.json({ error: 'No valid ticket tiers selected' }, { status: 400 })
      }
    } else {
      // Single-tier (or event base price)
      let unitPrice = event.ticket_price
      let tierName = 'General Admission'
      let resolvedTierId: string | null = null

      if (tierId) {
        const { data: tier } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('id', tierId)
          .single()

        if (tier) {
          const onSale = tierIsOnSale(tier, now)
          if (!onSale.ok) {
            return NextResponse.json({ error: onSale.reason }, { status: 400 })
          }

          const sold = Number(tier.sold_quantity || 0)
          const total = Number(tier.total_quantity || 0)
          const remaining = Math.max(0, total - sold)
          if (quantity > remaining) {
            return NextResponse.json({ error: `Only ${remaining} ticket(s) remaining for this tier.` }, { status: 400 })
          }

          unitPrice = tier.price
          tierName = tier.name
          resolvedTierId = tier.id
        }
      }

      if (promo) {
        const { discountedPrice } = calculateDiscount(unitPrice, promo)
        unitPrice = discountedPrice
      }

      normalizedSelections = [
        {
          tierId: resolvedTierId,
          tierName,
          quantity,
          unitPrice,
        },
      ]
    }

    const totalQuantity = normalizedSelections.reduce((sum, s) => sum + s.quantity, 0)
    const originalCurrency = String(event.currency || 'HTG').toUpperCase()
    const originalAmount = normalizedSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)

    // Fast-fail UX gate: reject obviously sold-out events before sending the buyer to MonCash.
    // Best-effort only (never blocks on its own errors); the atomic reserve at fulfillment is the
    // authoritative oversell guard.
    try {
      const capacity = await checkEventCapacity(String(eventId), totalQuantity)
      if (!capacity.available) {
        return NextResponse.json(
          { error: capacity.isSoldOut ? 'This event is sold out.' : `Only ${capacity.remaining} ticket(s) remaining.` },
          { status: 400 }
        )
      }
    } catch (e) {
      console.warn('[moncash_button] capacity pre-check failed (continuing)', { message: (e as any)?.message })
    }

    // MonCash settles in HTG. If the event is priced in USD, convert to HTG using a live rate + spread.
    // We do NOT scrape Google; we use a proper JSON rate endpoint.
    let chargeCurrency = originalCurrency
    let chargeSelections = normalizedSelections
    let chargeAmount = originalAmount
    let exchangeRateUsed: number | null = null
    let exchangeRateProvider: string | null = null
    let exchangeRateFetchedAt: string | null = null
    let exchangeRateBase: number | null = null
    let exchangeRateSpreadPercent: number | null = null

    if (originalCurrency === 'USD') {
      const { baseRate, effectiveRate, spreadPercent, provider, fetchedAtIso } = await getUsdToHtgRateWithSpread({
        spreadPercent: 0.05,
      })

      exchangeRateBase = baseRate
      exchangeRateUsed = effectiveRate
      exchangeRateSpreadPercent = spreadPercent
      exchangeRateProvider = provider
      exchangeRateFetchedAt = fetchedAtIso
      chargeCurrency = 'HTG'

      chargeSelections = normalizedSelections.map((s) => ({
        ...s,
        originalUnitPrice: s.unitPrice,
        unitPrice: convertUsdToHtgAmount(s.unitPrice, effectiveRate),
      }))
      chargeAmount = chargeSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)
    } else if (originalCurrency !== 'HTG') {
      return NextResponse.json(
        { error: `MonCash only supports HTG. Event currency ${originalCurrency} is not supported for MonCash.` },
        { status: 400 }
      )
    }

    // Create a gateway order ID.
    // Keep it short to fit sandbox RSA encryption limits (Digicel sandbox keys can be tiny).
    // IMPORTANT: Digicel appears to expect a numeric orderId (parsing errors can happen otherwise).
    const orderId = `${Date.now() % 1_000_000_000}${String(crypto.randomInt(0, 1000)).padStart(3, '0')}`
    const internalOrderId = `mcbtn_${eventId}_${user.id}_${Date.now()}`

    // Store pending transaction first so we can fall back to an HTML form POST flow.
    const { error: pendingInsertError } = await supabase.from('pending_transactions').insert({
      transaction_id: null,
      order_id: orderId,
      internal_order_id: internalOrderId,
      user_id: user.id,
      event_id: eventId,
      quantity: totalQuantity,
      amount: chargeAmount,
      payment_method: normalizedProvider,
      status: 'pending',
      currency: chargeCurrency,
      original_currency: originalCurrency,
      original_amount: originalAmount,
      exchange_rate_used: exchangeRateUsed,
      exchange_rate_base: exchangeRateBase,
      exchange_rate_spread_percent: exchangeRateSpreadPercent,
      exchange_rate_provider: exchangeRateProvider,
      exchange_rate_fetched_at: exchangeRateFetchedAt,
      tier_selections: chargeSelections,
      promo_code_id: promoCode || null,
      moncash_button_token: null,
      mobile_money_provider: normalizedProvider,
    })

    if (pendingInsertError) {
      console.error('Error creating pending transaction:', pendingInsertError)
      return NextResponse.json({ error: 'Failed to create pending transaction' }, { status: 500 })
    }

    const orderHash = crypto.createHash('sha256').update(orderId).digest('hex').slice(0, 10)
    const restTokenEnabled =
      !forceFormPost && String(process.env.MONCASH_BUTTON_REST_TOKEN_ENABLED || '').toLowerCase() === 'true'

    let redirectUrl: string
    if (!restTokenEnabled) {
      console.info('[moncash_button] initiate: using FORM POST (forced or REST token disabled)', { orderHash })
      const origin = new URL(request.url).origin
      redirectUrl = `${origin}/api/moncash-button/checkout?orderId=${encodeURIComponent(orderId)}`
    } else {
      try {
        const { token } = await createMonCashButtonCheckoutToken({
          amount: chargeAmount,
          orderId,
        })

        console.info('[moncash_button] initiate: using REST token redirect', {
          orderHash,
          hasToken: Boolean(token),
        })

        const { error: pendingUpdateError } = await supabase
          .from('pending_transactions')
          .update({
            moncash_button_token: token,
            moncash_button_token_variants: buildTokenVariants(token),
          })
          .eq('order_id', orderId)

        if (pendingUpdateError) {
          console.error('Error updating pending transaction token:', pendingUpdateError)
        }

        redirectUrl = getMonCashButtonRedirectUrl(token)
      } catch (err: any) {
        console.warn('MonCash Button REST token failed; falling back to form POST:', {
          orderHash,
          message: err?.message,
        })
        console.info('[moncash_button] initiate: using FORM POST fallback', { orderHash })
        const origin = new URL(request.url).origin
        redirectUrl = `${origin}/api/moncash-button/checkout?orderId=${encodeURIComponent(orderId)}`
      }
    }
    const response = NextResponse.json({ redirectUrl })
    // Correlate browser redirect back from MonCash to our pending transaction.
    // This prevents false "missing_order" failures when the gateway doesn't include orderId
    // (or includes a token-like transactionId that can't be looked up).
    response.cookies.set('moncash_button_order_id', orderId, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 60 * 60, // 1 hour
    })

    // Domain cookie helps when ReturnUrl host differs (www vs apex).
    const host = new URL(request.url).hostname
    const apex = host.startsWith('www.') ? host.slice(4) : host
    if (apex && apex.includes('.') && !/localhost/i.test(apex) && !/vercel\.app$/i.test(apex)) {
      response.cookies.set('moncash_button_order_id_domain', orderId, {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/',
        domain: `.${apex}`,
        maxAge: 60 * 60,
      })
    }
    return response
  } catch (error: any) {
    console.error('MonCash Button initiate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate MonCash Button payment' },
      { status: 500 }
    )
  }
}
