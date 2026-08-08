/**
 * GET /api/wallet/pass/<token> — serve the signed `.pkpass` itself.
 *
 * Reached by Safari (or Mail, or a desktop browser), never by the app's
 * authenticated fetch, because that is the only way iOS presents the
 * Add-to-Wallet sheet. So the token in the path is the credential:
 * HMAC-signed, 10 minutes, one ticket, one user (lib/wallet/pass-token.ts).
 *
 * The token is NOT trusted on its own. Ownership and ticket status are
 * re-verified against Firestore here, at download time, so a ticket refunded or
 * transferred away after the link was minted stops producing passes
 * immediately.
 */

import { NextResponse } from 'next/server'
import { buildApplePkpass } from '@/lib/wallet/apple'
import { WALLET_ERROR_CODES, getAppleWalletConfig } from '@/lib/wallet/config'
import { verifyPassToken } from '@/lib/wallet/pass-token'
import { loadWalletTicket } from '@/lib/wallet/ticket-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fail(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const verified = verifyPassToken(String(params?.token ?? ''))
    if (!verified.ok) {
      return verified.reason === 'expired'
        ? fail('This wallet link has expired', WALLET_ERROR_CODES.passLinkExpired, 410)
        : fail('Invalid wallet link', WALLET_ERROR_CODES.invalidPassLink, 401)
    }

    // Re-check, at download time, that this is still the holder's live ticket.
    const access = await loadWalletTicket(verified.value.ticketId, verified.value.userId)
    if (!access.ok) {
      const message =
        access.code === 'ticket_not_found'
          ? 'Ticket not found'
          : access.code === 'not_ticket_owner'
            ? 'This ticket does not belong to you'
            : 'This ticket is no longer valid'
      return fail(message, access.code, access.status)
    }

    const appleConfig = getAppleWalletConfig()
    if (!appleConfig) {
      return fail(
        'Apple Wallet passes are not configured on this server',
        WALLET_ERROR_CODES.appleNotConfigured,
        503
      )
    }

    let pkpass: Buffer
    try {
      pkpass = buildApplePkpass(access.ticket, appleConfig)
    } catch (error: any) {
      // Bad/mismatched certificate material lands here. Say so specifically
      // instead of pretending the pass was produced.
      console.error('[wallet] pkpass signing failed', { message: error?.message })
      return fail(
        'Could not sign the Apple Wallet pass',
        WALLET_ERROR_CODES.passBuildFailed,
        502
      )
    }

    return new NextResponse(new Uint8Array(pkpass), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="tikem-${access.ticket.orderRef}.pkpass"`,
        'Content-Length': String(pkpass.length),
        // A pass is a bearer credential — never let it sit in a shared cache.
        'Cache-Control': 'no-store, private',
      },
    })
  } catch (error: any) {
    console.error('[wallet] pass download failed', error)
    return fail(error?.message || 'Failed to build wallet pass', 'server_error', 500)
  }
}
