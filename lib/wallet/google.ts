/**
 * Google Wallet "Save to Google Wallet" links.
 *
 * Google's save flow is a signed JWT in a URL: the JWT carries the
 * EventTicketClass + EventTicketObject and is signed RS256 with the issuer's
 * service-account key, and Google creates/updates both on first save. That
 * removes the need for an OAuth round-trip to the Wallet REST API on the
 * ticket-viewing hot path, and means no extra dependency — Node's own `crypto`
 * signs the JWT.
 *
 * The link itself IS the credential (that is how Google's flow works), so it is
 * only ever handed to a caller who has already proved they own the ticket
 * (lib/wallet/ticket-access.ts).
 */

import crypto from 'node:crypto'
import type { GoogleWalletConfig } from './config'
import type { WalletTicket } from './ticket-access'

/** Google ids allow only `[a-zA-Z0-9._-]` after the issuer prefix. */
function sanitizeIdSuffix(value: string): string {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'unknown'
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** A Google Wallet localized string. */
function localized(value: string) {
  return { defaultValue: { language: 'en-US', value } }
}

/**
 * The EventTicketClass for this ticket's event. One class per event, shared by
 * every ticket for it, so all of an event's passes group together in Wallet.
 */
function buildEventTicketClass(ticket: WalletTicket, config: GoogleWalletConfig) {
  const classId = `${config.issuerId}.evt_${sanitizeIdSuffix(ticket.eventId || ticket.id)}`

  const eventClass: Record<string, any> = {
    id: classId,
    issuerName: config.issuerName,
    // Passes created through the JWT flow start under review; Google promotes
    // them automatically for issuers in good standing.
    reviewStatus: 'UNDER_REVIEW',
    eventName: localized(ticket.eventTitle),
    hexBackgroundColor: '#0a0a0a',
  }

  if (ticket.venueName || ticket.city) {
    eventClass.venue = {
      name: localized(ticket.venueName || ticket.city),
      address: localized([ticket.venueName, ticket.city].filter(Boolean).join(', ')),
    }
  }

  if (ticket.startDatetime) {
    eventClass.dateTime = {
      start: ticket.startDatetime,
      ...(ticket.endDatetime ? { end: ticket.endDatetime } : {}),
    }
  }

  return { classId, eventClass }
}

/** The EventTicketObject — this specific ticket. */
function buildEventTicketObject(
  ticket: WalletTicket,
  config: GoogleWalletConfig,
  classId: string
) {
  const object: Record<string, any> = {
    id: `${config.issuerId}.tkt_${sanitizeIdSuffix(ticket.id)}`,
    classId,
    state: 'ACTIVE',
    ticketNumber: ticket.orderRef,
    ticketType: localized(ticket.tierName),
    // THE existing QR payload — the same value the scanner already resolves.
    barcode: {
      type: 'QR_CODE',
      value: ticket.qrPayload,
      alternateText: ticket.orderRef,
    },
  }

  if (ticket.holderName) object.ticketHolderName = ticket.holderName

  return object
}

/**
 * Build a "Save to Google Wallet" URL for one ticket.
 * @throws if the service-account private key cannot sign (bad key material).
 */
export function buildGoogleSaveUrl(ticket: WalletTicket, config: GoogleWalletConfig): string {
  const { classId, eventClass } = buildEventTicketClass(ticket, config)
  const object = buildEventTicketObject(ticket, config, classId)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: config.clientEmail,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      eventTicketClasses: [eventClass],
      eventTicketObjects: [object],
    },
  }

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(config.privateKey)

  return `https://pay.google.com/gp/v/save/${signingInput}.${base64url(signature)}`
}
