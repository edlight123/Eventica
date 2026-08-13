import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'
import { updatePayoutProfileConfig } from '@/lib/firestore/payout'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  // Lazy load
  return require('stripe')(process.env.STRIPE_SECRET_KEY)
}

function normalizeAppUrl(request: NextRequest) {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const first = (value: string | null) => String(value || '').split(',')[0].trim()

  // Prefer the actual request host (works well with domain aliases).
  const host =
    first(request.headers.get('host')) ||
    first(request.headers.get('x-forwarded-host')) ||
    request.nextUrl.host ||
    first(process.env.VERCEL_URL || null)

  // Prefer forwarded proto, otherwise infer.
  const inferredProto = request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : ''
  const proto =
    first(request.headers.get('x-forwarded-proto')) ||
    inferredProto ||
    (process.env.VERCEL_ENV === 'production' ? 'https' : 'http')

  if (host) return `${proto}://${host}`

  return request.nextUrl.origin || 'http://localhost:3000'
}

function toStripeCountry(accountLocation: string): 'US' | 'CA' | 'FR' {
  const loc = String(accountLocation || '').toLowerCase()
  if (loc === 'canada' || loc === 'ca') return 'CA'
  if (loc === 'france' || loc === 'fr') return 'FR'
  return 'US'
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth('organizer')
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const organizerId = user.id

    const body = await request.json().catch(() => ({}))
    const requestedLocation = String(body?.accountLocation || '').toLowerCase()

    // Read payout profile (source of truth)
    const profile = await getPayoutProfile(organizerId, 'stripe_connect')

    const accountLocation =
      requestedLocation ||
      String(profile?.accountLocation || '').toLowerCase()

    if (
      !accountLocation ||
      (accountLocation !== 'united_states' && accountLocation !== 'canada' && accountLocation !== 'france')
    ) {
      return NextResponse.json(
        { error: 'Stripe Connect is only available for United States, Canada, or France accounts.' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Get organizer email
    const userDoc = await adminDb.collection('users').doc(organizerId).get()
    const email = userDoc.exists ? (userDoc.data()?.email as string | undefined) : undefined

    const stripeCountry = toStripeCountry(accountLocation)

    let stripeAccountId = profile?.stripeAccountId || null

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: stripeCountry,
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            // MANUAL payout schedule. Ticket sales are destination charges, so the
            // money is the organizer's from the moment of sale — this does not put
            // it in Tikèm's custody. What it stops is the automatic hop from their
            // Stripe balance to their bank, which is the only thing that made an
            // attendance/hold policy unenforceable: previously Stripe paid out on
            // its own schedule, before the event had even happened.
            // Release is triggered by /api/cron/release-payouts.
            schedule: { interval: 'manual' },
          },
        },
        metadata: {
          organizerId,
        },
      })

      stripeAccountId = account.id
      const createdStripeAccountId = account.id

      const updateResult = await updatePayoutProfileConfig(organizerId, 'stripe_connect', {
        payoutProvider: 'stripe_connect',
        accountLocation,
        stripeAccountId: createdStripeAccountId,
      })

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to save Stripe Connect profile')
      }
    }

    const appUrl = normalizeAppUrl(request)
    const refreshUrl = `${appUrl}/organizer/settings/payouts?stripe=refresh`
    const returnUrl = `${appUrl}/organizer/settings/payouts?stripe=return`

    // Embedded mode: the account bootstrap above is identical, but onboarding
    // renders in OUR page (Connect embedded components) instead of a
    // stripe.com-hosted account link. The mobile WebView and the web dashboard
    // both load this URL; completion redirects to the same returnUrl the
    // hosted flow used, so existing completion detection works unchanged.
    if (body?.embedded === true) {
      // The page URL must be built on the host that served THIS request — not
      // NEXT_PUBLIC_APP_URL. The env var holds the apex (tikem.co), which
      // 308-redirects to www, and the mobile WebView attaches its Bearer token
      // only to the INITIAL document request: WKWebView drops custom headers on
      // the redirect, so the page saw no auth and bounced organizers to the
      // login screen. The host that just authenticated this API call is proven
      // redirect-free for this client.
      const first = (value: string | null) => String(value || '').split(',')[0].trim()
      let requestHost =
        first(request.headers.get('x-forwarded-host')) || first(request.headers.get('host'))
      // In production, canonicalize alias hosts to www: the mobile WebView only
      // injects its Bearer token for tikem.co hosts, so a *.vercel.app alias or
      // the apex here means an unauthenticated page (the EAS env once pointed
      // the app at eventhaiti.vercel.app, whose 307 landed everything on
      // jointikem.vercel.app). Preview deployments keep their own host — those
      // flows run in a browser on the session cookie.
      if (
        process.env.VERCEL_ENV === 'production' &&
        (requestHost === 'tikem.co' || requestHost.endsWith('.vercel.app'))
      ) {
        requestHost = 'www.tikem.co'
      }
      const requestProto =
        first(request.headers.get('x-forwarded-proto')) ||
        (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https')
      const embeddedBase = requestHost ? `${requestProto}://${requestHost}` : appUrl

      return NextResponse.json({
        url: `${embeddedBase}/organizer/onboarding`,
        stripeAccountId,
        embedded: true,
      })
    }

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: link.url,
      stripeAccountId,
    })
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || Number(error?.raw?.statusCode) || 500

    // Common misconfiguration: Stripe account not enabled for Connect
    const rawMessage =
      String(error?.raw?.message || error?.message || 'Failed to create Stripe onboarding link')

    const connectNotEnabled =
      rawMessage.includes("signed up for Connect") ||
      rawMessage.includes('sign up for Connect') ||
      rawMessage.includes('signed up for connect')

    const userMessage = connectNotEnabled
      ? 'Stripe Connect is not enabled on this Stripe account. In Stripe Dashboard → Settings → Connect, enable Connect for this account (Test mode and/or Live mode), then retry.'
      : rawMessage

    console.error('Stripe connect error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create Stripe onboarding link',
        message: userMessage,
        stripe: {
          requestId: error?.requestId || error?.raw?.requestId,
          type: error?.type || error?.rawType,
        },
      },
      { status: statusCode }
    )
  }
}
