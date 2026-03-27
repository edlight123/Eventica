"use client"
import { useEffect, useState } from 'react'

// Types: beforeinstallprompt is not typed in TS lib by default
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showChromePrompt, setShowChromePrompt] = useState(false)
  const [showIosPrompt, setShowIosPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (hasBeenDismissed) {
      setDismissed(true)
      return
    }

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
    
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

    if (isIos && !isStandalone) {
      // iOS has no beforeinstallprompt; show custom banner
      setShowIosPrompt(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      if (!dismissed) setShowChromePrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const install = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setShowChromePrompt(false)
      setDeferredPrompt(null)
      if (choice.outcome === 'accepted') {
        // Optionally analytics event
      }
    } catch {
      // swallow errors
    }
  }

  const dismiss = () => {
    setShowChromePrompt(false)
    setShowIosPrompt(false)
    setDismissed(true)
    // Remember dismissal in localStorage so it doesn't show again
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (dismissed) return null

  // Shared container styling
  const base = 'fixed inset-x-4 bottom-4 z-50 rounded-xl shadow-lg border bg-white/90 backdrop-blur p-4 flex flex-col gap-3 animate-in fade-in'

  return (
    <>
      {showChromePrompt && (
        <div className={base} role="alert" aria-label="Install app prompt">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-600 to-accent-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Install Eventica</p>
              <p className="text-xs text-gray-600 mt-0.5">Get faster access and offline support.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={dismiss} className="flex-1 h-10 text-sm border rounded-lg">Maybe Later</button>
            <button onClick={install} className="flex-1 h-10 text-sm rounded-lg bg-brand-600 text-white">Install</button>
          </div>
        </div>
      )}
      {showIosPrompt && (
        <div className={base} role="alert" aria-label="Add to Home Screen instructions">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-600 to-accent-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Add Eventica to Home Screen</p>
              <p className="text-xs text-gray-600 mt-0.5">Tap the Share icon, then Add to Home Screen.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={dismiss} className="flex-1 h-10 text-sm border rounded-lg">Dismiss</button>
          </div>
        </div>
      )}
    </>
  )
}

export default PWAInstallPrompt
