'use client'

// The escape hatch for flows that STILL require an account inside an in-app browser.
//
// Google refuses OAuth in embedded WebViews, so "Sign in with Google" cannot succeed
// here no matter how many times the buyer taps it. Rather than let them discover that
// through an opaque `disallowed_useragent` error, we say so up front and give them the
// two things that work: the exact menu path out of this WebView, and a copyable link.
//
// Only rendered when a session is genuinely unavoidable (a password-protected event,
// an account action). The ordinary buying path no longer needs one — that is what
// guest checkout is for.

import { useEffect, useState } from 'react'
import { inAppBrowserNameClient, isInAppBrowserClient, openInBrowserHint } from '@/lib/utils/in-app-browser'

export default function OpenInBrowserNotice({
  className = '',
  url,
}: {
  className?: string
  /** Defaults to the current page. */
  url?: string
}) {
  // Detected in an effect, never during SSR: the server has no reliable idea which
  // browser this is, and a wrong guess would flash the wrong UI.
  const [inApp, setInApp] = useState(false)
  const [appName, setAppName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setInApp(isInAppBrowserClient())
    setAppName(inAppBrowserNameClient())
  }, [])

  if (!inApp) return null

  const target = url || (typeof window !== 'undefined' ? window.location.href : '')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(target)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard is unavailable in some WebViews — the hint above still stands.
      setCopied(false)
    }
  }

  return (
    <div className={`rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 ${className}`}>
      <p className="text-sm font-semibold text-amber-200">
        Signing in doesn&apos;t work inside {appName || 'this app'}
      </p>
      <p className="mt-1 text-xs text-amber-100/80 leading-relaxed">
        Google blocks sign-in in in-app browsers. {openInBrowserHint()}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2.5 text-xs font-semibold text-amber-200 underline underline-offset-2"
      >
        {copied ? 'Link copied, paste it in Safari or Chrome' : 'Copy this page link'}
      </button>
    </div>
  )
}
