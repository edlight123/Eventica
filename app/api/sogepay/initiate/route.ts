import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { getPaymentProviderForEventCountry, normalizeCountryCode } from '@/lib/payment-provider'
import { checkEventCapacity } from '@/lib/capacity'
import { calculateDiscount } from '@/lib/promo-codes'
import { resolveEventCountry } from '@/lib/event-country'

export const runtime = 'nodejs'

function isSogepayConfigured(): boolean {
  // Placeholder: wire these to real Sogepay credentials once provided.
  return Boolean(process.env.SOGEPAY_ENABLED && String(process.env.SOGEPAY_ENABLED).toLowerCase() === 'true')
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { eventId, quantity = 1, tierId, promoCode, tiers } = body || {}

    if (!eventId) return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })

    const supabase = await createClient()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventCountry = (await resolveEventCountry(event)) || normalizeCountryCode(event.country)
    const provider = getPaymentProviderForEventCountry(eventCountry)
    if (provider !== 'sogepay') {
      return NextResponse.json(
        { error: 'This event does not use Sogepay. Please choose the appropriate payment method.' },
        { status: 400 }
      )
    }

    if (!isSogepayConfigured()) {
      return NextResponse.json(
        {
          error:
            'Sogepay is not configured on this deployment yet. Set SOGEPAY_ENABLED=true and the required Sogepay credentials/env vars.',
        },
        { status: 500 }
      )
    }

    // Compute the organizer-facing total (event currency).
    const originalCurrency = String(event.currency || 'HTG').toUpperCase()

    const now = new Date()
    const tierIsOnSale = (tier: any): { ok: true } | { ok: false; reason: string } => {
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

    let selections: { tierId: string | null; tierName: string; quantity: number; unitPrice: number }[] = []

    if (Array.isArray(tiers) && tiers.length > 0) {
      const tierIds = tiers.map((t: any) => String(t?.tierId || '')).filter(Boolean)
      const { data: tierRows } = await supabase
        .from('ticket_tiers')
        .select('*')
        .in('id', tierIds)

      const byId = new Map<string, any>()
      ;(tierRows || []).forEach((row: any) => byId.set(String(row.id), row))

      for (const selection of tiers) {
        const id = String(selection?.tierId || '')
        const qty = Math.max(0, Math.round(Number(selection?.quantity || 0)))
        if (!id || qty <= 0) continue
        const tierRow = byId.get(id)
        if (!tierRow) continue

        const onSale = tierIsOnSale(tierRow)
        if (!onSale.ok) return NextResponse.json({ error: onSale.reason }, { status: 400 })

        const sold = Number(tierRow.sold_quantity || 0)
        const total = Number(tierRow.total_quantity || 0)
        const remaining = Math.max(0, total - sold)
        if (qty > remaining) {
          return NextResponse.json(
            { error: `Only ${remaining} ticket(s) remaining for ${tierRow.name || 'this tier'}.` },
            { status: 400 }
          )
        }

        selections.push({
          tierId: id,
          tierName: String(tierRow.name || 'Ticket'),
          quantity: qty,
          unitPrice: Number(tierRow.price || 0),
        })
      }
    } else if (tierId) {
      const { data: tierRow } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('id', tierId)
        .single()

      if (tierRow) {
        const onSale = tierIsOnSale(tierRow)
        if (!onSale.ok) return NextResponse.json({ error: onSale.reason }, { status: 400 })

        const qty = Math.max(1, Math.round(Number(quantity || 1)))
        const sold = Number(tierRow.sold_quantity || 0)
        const total = Number(tierRow.total_quantity || 0)
        const remaining = Math.max(0, total - sold)
        if (qty > remaining) {
          return NextResponse.json(
            { error: `Only ${remaining} ticket(s) remaining for this tier.` },
            { status: 400 }
          )
        }

        selections = [
          {
            tierId: String(tierRow.id),
            tierName: String(tierRow.name || 'Ticket'),
            quantity: qty,
            unitPrice: Number(tierRow.price || 0),
          },
        ]
      }
    }

    if (selections.length === 0) {
      // Fallback to single base ticket price.
      const qty = Math.max(1, Math.round(Number(quantity || 1)))
      selections = [
        {
          tierId: null,
          tierName: 'General Admission',
          quantity: qty,
          unitPrice: Number(event.ticket_price || 0),
        },
      ]
    }

    // Apply promo code to the per-ticket unitPrice (simple/consistent with other flows).
    let promoCodeId: string | null = promoCode ? String(promoCode) : null
    let promo = null
    if (promoCodeId) {
      const { data: promoRow, error: promoErr } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('id', promoCodeId)
        .single()

      if (!promoErr && promoRow) {
        promo = promoRow
      } else {
        promoCodeId = null
      }
    }

    const discountedSelections = selections.map((s) => {
      let unitPrice = Number(s.unitPrice || 0)
      if (promo) {
        const { discountedPrice } = calculateDiscount(unitPrice, promo)
        unitPrice = discountedPrice
      }
      return { ...s, unitPrice }
    })

    const totalQuantity = discountedSelections.reduce((sum, s) => sum + s.quantity, 0)
    const originalAmount = discountedSelections.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)

    // Fast-fail UX gate: reject obviously sold-out events before redirecting to the gateway.
    // Best-effort only; the atomic reserve at fulfillment is the authoritative oversell guard.
    try {
      const capacity = await checkEventCapacity(String(eventId), totalQuantity)
      if (!capacity.available) {
        return NextResponse.json(
          { error: capacity.isSoldOut ? 'This event is sold out.' : `Only ${capacity.remaining} ticket(s) remaining.` },
          { status: 400 }
        )
      }
    } catch (e) {
      console.warn('[sogepay] capacity pre-check failed (continuing)', { message: (e as any)?.message })
    }

    // Store pending transaction so we can reconcile a future Sogepay callback/webhook.
    // Note: we intentionally do NOT invent a Sogepay signature/redirect format here.
    const orderId = `${Date.now() % 1_000_000_000}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
    const internalOrderId = `sogepay_${eventId}_${user.id}_${Date.now()}`

    const { data: pending, error: pendingError } = await supabase
      .from('pending_transactions')
      .insert({
        transaction_id: null,
        order_id: orderId,
        internal_order_id: internalOrderId,
        user_id: user.id,
        event_id: eventId,
        quantity: totalQuantity,
        amount: originalAmount,
        payment_method: 'sogepay',
        status: 'pending',
        currency: originalCurrency,
        original_currency: originalCurrency,
        original_amount: originalAmount,
        exchange_rate_used: null,
        tier_selections: discountedSelections,
        promo_code_id: promoCodeId,
      })
      .select('*')
      .single()

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message || 'Failed to create pending transaction' }, { status: 500 })
    }

    // For now, require an externally provided hosted checkout URL.
    const checkoutBase = String(process.env.SOGEPAY_CHECKOUT_URL || '').trim()
    if (!checkoutBase) {
      return NextResponse.json(
        {
          error:
            'SOGEPAY_CHECKOUT_URL is not set. Provide the Sogepay hosted checkout URL format for initiating payments.',
          pendingTransactionId: pending?.id,
        },
        { status: 500 }
      )
    }

    const redirectUrl = new URL(checkoutBase)
    redirectUrl.searchParams.set('orderId', String(orderId))
    redirectUrl.searchParams.set('eventId', String(eventId))

    // Tell Sogepay where to send the buyer back (browser) and where to POST the authoritative
    // server-to-server payment notification (webhook). Real Sogepay portals may instead read
    // these from merchant settings; passing them is harmless and makes self-serve setups work.
    const origin = new URL(request.url).origin
    const returnUrl = `${origin}/api/sogepay/callback?orderId=${encodeURIComponent(String(orderId))}`
    const callbackUrl = `${origin}/api/sogepay/callback`
    for (const key of ['returnUrl', 'return_url', 'redirectUrl', 'redirect_url']) {
      redirectUrl.searchParams.set(key, returnUrl)
    }
    for (const key of ['callbackUrl', 'callback_url', 'notifyUrl', 'notify_url']) {
      redirectUrl.searchParams.set(key, callbackUrl)
    }

    return NextResponse.json({ redirectUrl: redirectUrl.toString(), pendingTransactionId: pending?.id })
  } catch (error: any) {
    console.error('Sogepay initiate error:', error)
    return NextResponse.json({ error: error.message || 'Failed to initiate Sogepay payment' }, { status: 500 })
  }
}
