// Detecting the embedded WebViews that most Tikèm traffic actually arrives in.
//
// An Instagram or Facebook link does not open Safari or Chrome — it opens a WebView
// inside the app. Two things break there, and both are on the buying path:
//
//   1. POPUPS. `window.open` in a WebView either does nothing or opens a chromeless
//      view with no address bar and no reliable way back. Our MonCash checkout opened
//      a popup and only fell back to a same-tab redirect when the popup was BLOCKED —
//      a popup that "opens" somewhere unreturnable is not blocked, so the buyer was
//      stranded with a ticket order already created.
//   2. GOOGLE SIGN-IN. Google refuses OAuth inside embedded WebViews outright
//      ("disallowed_useragent"), so any flow that requires an account dead-ends with
//      an error the buyer cannot act on. Guest checkout is the real fix; where a
//      session is genuinely required, we at least offer "open in Safari/Chrome".
//
// Detection is user-agent based, which is imprecise by nature — so it is only ever
// used to choose a MORE conservative path (same-tab navigation, an extra hint), never
// to block anything.

/** Apps whose in-app browser we recognize, in the order we want to name them. */
const IN_APP_PATTERNS: Array<{ name: string; test: RegExp }> = [
  { name: 'Instagram', test: /instagram/i },
  { name: 'Messenger', test: /\bFB_IAB\/MESSENGER|messenger/i },
  // FBAN/FBAV are the Facebook app's own markers.
  { name: 'Facebook', test: /\bFBAN\/|\bFBAV\/|\bFB_IAB\b/i },
  { name: 'TikTok', test: /musical_ly|bytedance|tiktok|BytedanceWebview/i },
  { name: 'Snapchat', test: /snapchat/i },
  { name: 'LinkedIn', test: /linkedin/i },
  { name: 'Twitter', test: /\bTwitter\b/i },
  { name: 'Pinterest', test: /\bPinterest\b/i },
  { name: 'Line', test: /\bLine\//i },
  { name: 'WeChat', test: /MicroMessenger/i },
  { name: 'WhatsApp', test: /WhatsApp/i },
]

/** The app whose embedded browser this user agent belongs to, or null. */
export function inAppBrowserName(userAgent?: string | null): string | null {
  const ua = String(userAgent || '')
  if (!ua) return null
  for (const { name, test } of IN_APP_PATTERNS) {
    if (test.test(ua)) return name
  }
  return null
}

/** True when the page is running inside a social app's embedded WebView. */
export function isInAppBrowser(userAgent?: string | null): boolean {
  return inAppBrowserName(userAgent) !== null
}

/** iOS specifically — the platform where "open in Safari" is the escape hatch. */
export function isIosUserAgent(userAgent?: string | null): boolean {
  return /iPad|iPhone|iPod/i.test(String(userAgent || ''))
}

/**
 * Browser-side convenience. Returns false during SSR, so a server-rendered page never
 * guesses; components read it in an effect and re-render.
 */
export function isInAppBrowserClient(): boolean {
  if (typeof navigator === 'undefined') return false
  return isInAppBrowser(navigator.userAgent)
}

export function inAppBrowserNameClient(): string | null {
  if (typeof navigator === 'undefined') return null
  return inAppBrowserName(navigator.userAgent)
}

/**
 * How to send a buyer to an external payment page.
 *
 * `'same-tab'` inside an in-app browser: a full-page navigation keeps the gateway
 * inside the WebView the buyer is already in, and the gateway's return URL brings
 * them back to us — a round trip they can actually complete. A popup cannot promise
 * that here.
 */
export function paymentNavigationMode(): 'popup' | 'same-tab' {
  return isInAppBrowserClient() ? 'same-tab' : 'popup'
}

/**
 * The instruction that actually works for escaping a given in-app browser.
 * Deliberately concrete: "open in your browser" is useless advice if the buyer
 * cannot find the button.
 */
export function openInBrowserHint(userAgent?: string | null): string {
  const ua = typeof userAgent === 'string' ? userAgent : (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const app = inAppBrowserName(ua)
  const ios = isIosUserAgent(ua)

  if (app === 'Instagram') {
    return ios
      ? 'Tap ••• at the top right, then "Open in external browser".'
      : 'Tap ⋮ at the top right, then "Open in browser".'
  }
  if (app === 'Facebook' || app === 'Messenger') {
    return ios
      ? 'Tap ••• at the bottom right, then "Open in Safari".'
      : 'Tap ⋮ at the top right, then "Open in Chrome".'
  }
  if (app === 'TikTok') {
    return 'Tap ••• at the top right, then "Open in browser".'
  }
  return ios
    ? 'Tap the ••• menu, then "Open in Safari".'
    : 'Tap the ⋮ menu, then "Open in browser".'
}
