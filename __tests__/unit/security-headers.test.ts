/**
 * @jest-environment node
 */

/**
 * Tests for the security headers declared in next.config.js.
 *
 * Two things here are genuinely load-bearing and easy to regress:
 *
 *  1. The CSP must be ENFORCED, not Report-Only. A `Content-Security-Policy-Report-Only`
 *     header looks identical in a browser devtools panel but blocks nothing, so an
 *     external scanner correctly reports the app as having no CSP at all.
 *
 *  2. `form-action` must keep the MonCash/NatCash gateway hosts. The NatCash
 *     "Hosted Page" flow serves a self-origin page that auto-submits a <form>
 *     POST to the gateway (app/api/moncash-button/checkout/route.ts). Under a
 *     bare `form-action 'self'` the browser blocks that POST and checkout fails
 *     outright — this is the single highest-impact way to break paid checkout
 *     while every page still renders perfectly, so it is worth a test.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require('../../next.config.js')

type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderEntry[] }

async function globalHeaders(): Promise<HeaderEntry[]> {
  const rules: HeaderRule[] = await nextConfig.headers()
  const rule = rules.find((r) => r.source === '/:path*')
  if (!rule) throw new Error('expected a catch-all /:path* header rule')
  return rule.headers
}

function directives(csp: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const part of csp.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf(' ')
    if (idx === -1) map.set(trimmed, '')
    else map.set(trimmed.slice(0, idx), trimmed.slice(idx + 1))
  }
  return map
}

async function csp(): Promise<Map<string, string>> {
  const headers = await globalHeaders()
  const entry = headers.find((h) => h.key === 'Content-Security-Policy')
  if (!entry) throw new Error('no enforcing Content-Security-Policy header')
  return directives(entry.value)
}

describe('Content-Security-Policy', () => {
  it('is enforced, not Report-Only', async () => {
    const keys = (await globalHeaders()).map((h) => h.key)

    expect(keys).toContain('Content-Security-Policy')
    // The whole point: a Report-Only header enforces nothing.
    expect(keys).not.toContain('Content-Security-Policy-Report-Only')
  })

  it('allows the MonCash/NatCash gateway in form-action so checkout is not blocked', async () => {
    const formAction = (await csp()).get('form-action')

    expect(formAction).toBeDefined()
    expect(formAction).toContain("'self'")
    // Both modes: lib/moncash-button.ts picks sandbox vs production at runtime.
    expect(formAction).toContain('https://moncashbutton.digicelgroup.com')
    expect(formAction).toContain('https://sandbox.moncashbutton.digicelgroup.com')
  })

  it('keeps the hardening directives that make the policy worth enforcing', async () => {
    const d = await csp()

    expect(d.get('default-src')).toBe("'self'")
    expect(d.get('object-src')).toBe("'none'")
    expect(d.get('base-uri')).toBe("'self'")
    expect(d.get('frame-ancestors')).toBe("'none'")
  })

  it('allows the external origins the client actually needs', async () => {
    const d = await csp()

    // Stripe checkout.
    expect(d.get('script-src')).toContain('https://js.stripe.com')
    expect(d.get('frame-src')).toContain('https://js.stripe.com')
    expect(d.get('connect-src')).toContain('https://api.stripe.com')

    // Firebase auth + Firestore, including the WebChannel transport that backs
    // the app's onSnapshot realtime listeners.
    expect(d.get('connect-src')).toContain('https://*.googleapis.com')
    expect(d.get('connect-src')).toContain('wss://*.googleapis.com')
    expect(d.get('frame-src')).toContain('https://accounts.google.com')
  })
})

describe('baseline security headers', () => {
  it.each([
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ])('sets %s', async (key, value) => {
    const headers = await globalHeaders()
    expect(headers.find((h) => h.key === key)?.value).toBe(value)
  })
})
