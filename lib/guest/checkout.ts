// Resolving WHO is checking out, for routes that must serve both an account holder
// and a guest.
//
// Every purchase entry point used to start with `if (!user) return 401`. That single
// line is what dead-ends an Instagram WebView buyer, because the sign-in it points at
// cannot complete there. These helpers replace it with: "a session if there is one,
// otherwise a validated guest contact record" — and nothing else changes. When a
// session exists the returned identity is byte-for-byte the old behavior.

import { NextResponse } from 'next/server'
import { normalizeCountryCode } from '@/lib/payment-provider'
import {
  createGuestOrder,
  guestTokenFor,
  isGuestId,
  validateGuestContact,
  type GuestContact,
} from '@/lib/guest/identity'

export interface CheckoutIdentity {
  /** false ⇒ a real Firebase uid; true ⇒ a `guest_…` id with no account. */
  isGuest: boolean
  /** Written to `pending_transactions.user_id` and to `tickets.attendee_id`. */
  id: string
  email: string
  name: string
  phone: string
  /** Raw retrieval token — ONLY present for a guest, and only in the request that mints it. */
  guestToken?: string
  /**
   * The guest order's key. Safe to persist on the order: fulfillment uses it to find
   * the record and to RE-DERIVE the buyer's link, so no bearer credential is stored.
   */
  guestOrderKey?: string
}

export function identityFromUser(user: {
  id: string
  email?: string | null
  full_name?: string | null
  phone_number?: string | null
}): CheckoutIdentity {
  return {
    isGuest: false,
    id: String(user.id),
    email: String(user.email || ''),
    name: String(user.full_name || ''),
    phone: String(user.phone_number || ''),
  }
}

/**
 * Fields to persist on an ORDER (pending transaction / claim) for a guest.
 *
 * These are the authority for who gets the confirmation. Fulfillment reads the
 * recipient from here — never from the body of the confirming request — so a
 * forged callback cannot redirect somebody else's ticket to a new address.
 * They also make the order findable by email or phone for refunds and support.
 */
export function guestOrderFields(identity: CheckoutIdentity): Record<string, any> {
  if (!identity.isGuest) return {}
  return {
    is_guest: true,
    guest_id: identity.id,
    guest_name: identity.name,
    guest_email: identity.email,
    guest_phone: identity.phone || null,
    guest_order_key: identity.guestOrderKey || null,
  }
}

/** The same details, stamped onto each issued ticket so support can search a ticket. */
export function guestTicketFields(identity: CheckoutIdentity): Record<string, any> {
  if (!identity.isGuest) return {}
  return {
    is_guest: true,
    guest_email: identity.email,
    guest_phone: identity.phone || null,
  }
}

/** The buyer of a guest order, as recorded when the order was created. */
export interface GuestOrderRecipient {
  email: string
  name: string
  phone: string
  isGuest: true
  /** Re-derived from the stored order key — the buyer's own retrieval link. */
  guestToken: string | null
}

/**
 * Read the buyer off an ORDER (a pending transaction, or Stripe PaymentIntent
 * metadata mapped to the same field names). Returns null for account purchases, whose
 * recipient still comes from `users/{uid}` exactly as before.
 *
 * This is the ONLY thing fulfillment consults for a guest. The details were captured
 * and stored when checkout began; the confirming request — a gateway redirect, a
 * webhook — contributes nothing but the fact of payment. That is what stops a crafted
 * callback from re-pointing somebody's ticket at a new address.
 */
export function guestRecipientFromOrder(order: any): GuestOrderRecipient | null {
  if (!order) return null
  const isGuest = Boolean(order.is_guest) || isGuestId(order.user_id) || isGuestId(order.guest_id)
  if (!isGuest) return null

  const orderKey = String(order.guest_order_key || '')
  return {
    email: String(order.guest_email || ''),
    name: String(order.guest_name || 'Guest'),
    phone: String(order.guest_phone || ''),
    isGuest: true,
    guestToken: /^[a-f0-9]{48}$/.test(orderKey) ? guestTokenFor(orderKey) : null,
  }
}

export type GuestCheckoutOutcome =
  | { ok: true; identity: CheckoutIdentity }
  | { ok: false; response: NextResponse }

/**
 * Turn the `guest: { name, email, phone }` block of a checkout request into a
 * usable identity, or explain precisely why it can't be used.
 *
 * Refuses guest checkout for password-protected events: the access grant is keyed
 * by uid (`events/{id}/access_grants/{uid}`), so there is nothing to prove a guest
 * knows the code. Those buyers are told to sign in rather than being silently let
 * through — the gate stays exactly as strong as it was.
 */
export async function beginGuestCheckout(params: {
  guestInput: unknown
  event: { country?: string | null; is_password_protected?: boolean } | null
  eventId: string
  ipAddress?: string | null
  /** Shape the error body to the route's own convention. */
  errorBody?: (error: string, code: string) => any
}): Promise<GuestCheckoutOutcome> {
  const body = params.errorBody || ((error: string, code: string) => ({ error, code }))

  if (params.event?.is_password_protected) {
    return {
      ok: false,
      response: NextResponse.json(
        body('Please sign in to get tickets for this private event.', 'guest_not_allowed_private'),
        { status: 401 }
      ),
    }
  }

  if (!params.guestInput || typeof params.guestInput !== 'object') {
    return {
      ok: false,
      response: NextResponse.json(body('Unauthorized', 'unauthorized'), { status: 401 }),
    }
  }

  const country = normalizeCountryCode(params.event?.country || undefined)
  const validated = validateGuestContact(params.guestInput, {
    // Haiti: a phone number is how people are actually reachable, so it is required
    // and the ticket also goes out by SMS.
    requirePhone: country === 'HT',
    defaultCountry: country || 'HT',
  })
  if (!validated.ok) {
    return {
      ok: false,
      response: NextResponse.json(body(validated.error, validated.code), { status: 400 }),
    }
  }

  const contact: GuestContact = validated.contact
  const { record, token } = await createGuestOrder({
    contact,
    eventId: params.eventId,
    ipAddress: params.ipAddress,
  })

  return {
    ok: true,
    identity: {
      isGuest: true,
      id: record.guestId,
      email: record.email,
      name: record.name,
      phone: record.phone,
      guestToken: token,
      guestOrderKey: record.orderKey,
    },
  }
}
