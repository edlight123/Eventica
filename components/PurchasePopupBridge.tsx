'use client'

import { useEffect } from 'react'

type PurchasePopupBridgeProps =
  | {
      status: 'success'
      ticketId?: string | null
    }
  | {
      status: 'failed'
      reason?: string | null
    }

export default function PurchasePopupBridge(props: PurchasePopupBridgeProps) {
  useEffect(() => {
    // Mobile WebView bridge: if we're running inside React Native WebView,
    // emit a message so the app can close the WebView and refresh tickets.
    try {
      ;(window as any)?.ReactNativeWebView?.postMessage?.(
        JSON.stringify({
          source: 'eventica',
          type: 'purchase_result',
          ...props,
        })
      )
    } catch {
      // ignore
    }

    // Only run when opened as a popup.
    if (!window.opener) return

    try {
      window.opener.postMessage(
        {
          source: 'eventica',
          type: 'purchase_result',
          ...props,
        },
        window.location.origin
      )
    } catch {
      // Ignore cross-window errors and still attempt to close.
    }

    // Give the browser a tick to dispatch the message.
    const timer = window.setTimeout(() => {
      window.close()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [props])

  return null
}
