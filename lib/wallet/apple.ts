/**
 * Apple Wallet `.pkpass` construction.
 *
 * The archive Apple expects is: `pass.json` + artwork + a `manifest.json` of
 * SHA-1 hashes of every file + a PKCS#7 *detached* signature over that manifest,
 * all zipped. None of that is hand-rolled here — `passkit-generator` (already a
 * direct dependency of this repo, v3.5.7, MIT) does the manifest, the PKCS#7
 * signing via node-forge and the zip. Hand-rolling PKCS#7 for a pass that iOS
 * silently refuses when a single byte is wrong is not a good trade.
 *
 * Nothing money-related or account-related goes into the pass: it carries the
 * event, the date, the venue, the tier and the ticket's EXISTING QR payload.
 */

import { PKPass } from 'passkit-generator'
import type { AppleWalletConfig } from './config'
import type { WalletTicket } from './ticket-access'

/** Human date for the pass face. Locale-neutral so it reads the same everywhere. */
function formatPassDate(iso: string | null): string {
  if (!iso) return 'TBA'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'TBA'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Build a signed `.pkpass` for one ticket.
 *
 * @throws if the certificate material is rejected by the signer. Callers turn
 *         that into a specific error code — never into a silent success.
 */
export function buildApplePkpass(ticket: WalletTicket, config: AppleWalletConfig): Buffer {
  const pass = new PKPass(
    {
      // Apple will not open a pass without an icon; `logo.png` is what shows in
      // the pass header. Both come from config (env override, brand fallback).
      'icon.png': config.iconPng,
      'icon@2x.png': config.iconPng,
      'logo.png': config.logoPng,
      'logo@2x.png': config.logoPng,
    },
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      ...(config.signerKeyPassphrase ? { signerKeyPassphrase: config.signerKeyPassphrase } : {}),
    },
    {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      // One pass per ticket, stable across regenerations so re-adding a pass
      // updates the existing one instead of stacking duplicates in Wallet.
      serialNumber: ticket.id,
      organizationName: config.organizationName,
      description: `${ticket.eventTitle} — ${ticket.tierName}`,
      logoText: config.organizationName,
      backgroundColor: 'rgb(10, 10, 10)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(13, 148, 136)',
      sharingProhibited: true,
    }
  )

  pass.type = 'eventTicket'

  pass.headerFields.push({
    key: 'tier',
    label: 'TICKET',
    value: ticket.tierName,
  })

  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: ticket.eventTitle,
  })

  pass.secondaryFields.push({
    key: 'date',
    label: 'DATE',
    value: formatPassDate(ticket.startDatetime),
  })

  if (ticket.venueName) {
    pass.secondaryFields.push({
      key: 'venue',
      label: 'VENUE',
      value: ticket.venueName,
    })
  }

  if (ticket.holderName) {
    pass.auxiliaryFields.push({
      key: 'holder',
      label: 'ADMIT',
      value: ticket.holderName,
    })
  }

  pass.auxiliaryFields.push({
    key: 'order',
    label: 'ORDER',
    value: ticket.orderRef,
  })

  if (ticket.city) {
    pass.backFields.push({ key: 'city', label: 'City', value: ticket.city })
  }
  pass.backFields.push({
    key: 'instructions',
    label: 'At the door',
    value: 'Show this pass at the entrance. Each ticket scans once.',
  })

  // THE existing QR payload, straight from Firestore. Re-encoding it in the
  // pass is the whole point; minting a new code would fail at the scanner.
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: ticket.qrPayload,
    messageEncoding: 'iso-8859-1',
    altText: ticket.orderRef,
  })

  return pass.getAsBuffer()
}
