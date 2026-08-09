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

import type { PKPass as PKPassType } from 'passkit-generator'
import type { AppleWalletConfig } from './config'
import type { WalletTicket } from './ticket-access'

/** The ISO instant, or null when the event has no usable date. */
function passDateValue(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Build a signed `.pkpass` for one ticket.
 *
 * @throws if the certificate material is rejected by the signer. Callers turn
 *         that into a specific error code — never into a silent success.
 */
export async function buildApplePkpass(
  ticket: WalletTicket,
  config: AppleWalletConfig
): Promise<Buffer> {
  // Loaded on demand, NOT at module scope. `next build` imports every route
  // module to collect page data, so a top-level import drags passkit-generator
  // (plus node-forge and joi) into the same process that renders 199 static
  // pages — which OOM'd the build. Nothing here runs until a pass is requested.
  const { PKPass } = (await import('passkit-generator')) as {
    PKPass: typeof PKPassType
  }

  const startValue = passDateValue(ticket.startDatetime)

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
      // NO logoText: `logo.png` is the Tikèm wordmark, so setting logoText too
      // printed "tikèm" as art and "Tikèm" as text side by side in the header.
      backgroundColor: 'rgb(10, 10, 10)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(13, 148, 136)',
      sharingProhibited: true,
    }
  )

  // Surfaces the pass on the lock screen around door time instead of making the
  // attendee dig through Wallet at the entrance. This goes through the setter,
  // not the props object — the top-level `relevantDate` key is stripped by the
  // schema, and it is deprecated as of iOS 18 anyway. An interval (rather than
  // a single instant) is what triggers the Live Activity countdown on modern
  // iOS for event tickets, so pass start+end whenever the event has both.
  const endValue = passDateValue(ticket.endDatetime)
  if (startValue && endValue) {
    pass.setRelevantDates([{ startDate: startValue, endDate: endValue }])
  } else if (startValue) {
    pass.setRelevantDates([{ date: startValue }])
  }

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

  // Hand Wallet the raw instant and let IT format, rather than pre-rendering a
  // string. The old code formatted in UTC, so a 9:30 PM Haiti event printed as
  // "2:30 AM" the next day on the pass while the app showed 9:30 PM. With
  // dateStyle/timeStyle, Wallet renders in the device's own timezone and
  // locale — the same thing the app's date-fns formatting does.
  pass.secondaryFields.push(
    startValue
      ? {
          key: 'date',
          label: 'DATE',
          value: startValue,
          dateStyle: 'PKDateStyleMedium',
          timeStyle: 'PKDateStyleShort',
        }
      : { key: 'date', label: 'DATE', value: 'TBA' }
  )

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
