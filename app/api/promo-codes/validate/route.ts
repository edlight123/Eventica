import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findPromoDoc } from '@/lib/promo-codes'
import { getPromoExpiresAt, getPromoStartAt, getPromoUsesCount, isPromoActive } from '@/lib/promo-code-shared'

// Validate a promo code against Firestore `promo_codes`. Accepts either the raw
// code or the Firestore doc id (findPromoDoc handles both).
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, eventId } = await request.json()

    console.log('Validating promo code:', { code, eventId })

    if (!code) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
    }
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const promoCode = await findPromoDoc(String(eventId), String(code))

    if (!promoCode) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 })
    }

    console.log('Found promo code:', { id: promoCode.id, code: promoCode.code, event_id: promoCode.event_id })

    const now = new Date()

    if (!isPromoActive(promoCode)) {
      return NextResponse.json({ error: 'This promo code is inactive' }, { status: 400 })
    }

    const startAt = getPromoStartAt(promoCode)
    if (startAt && startAt > now) {
      return NextResponse.json({ error: 'This promo code is not yet valid' }, { status: 400 })
    }

    const expiresAt = getPromoExpiresAt(promoCode)
    if (expiresAt && expiresAt < now) {
      return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
    }

    // Global usage cap. NOTE: the Firestore promo shape has no per-user cap field
    // (max_uses_per_user), so the previous per-user check is intentionally dropped;
    // the authoritative global cap is enforced atomically at redemption time.
    const usesCount = getPromoUsesCount(promoCode)
    if (promoCode.max_uses && usesCount >= promoCode.max_uses) {
      return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        description: promoCode.description,
        discountType: promoCode.discount_type,
        discountValue: promoCode.discount_value,
      },
    })
  } catch (error: any) {
    console.error('Promo code validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
