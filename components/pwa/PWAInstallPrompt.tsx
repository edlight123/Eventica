"use client"
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Where the "Get the app" button sends people. This points at our internal
// /download route, which sniffs the device and forwards iPhone/Android users
// straight to the right store (App Store / Play Store) and shows a landing
// page everywhere else. The actual store URLs live in app/download/page.tsx
// and are env-overridable (NEXT_PUBLIC_APP_STORE_URL / NEXT_PUBLIC_PLAY_STORE_URL)
// so they can point at a TestFlight/beta page while the public listings roll out.
// TODO: if you ever want this button to skip the interstitial and deep-link
// directly to TestFlight or a store, swap this constant for that URL.
const APP_LINK = '/download'

const DISMISS_KEY = 'tikem-app-cta-dismissed'

export function PWAInstallPrompt() {
  const { t } = useTranslation('common')
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Respect a previous dismissal.
    if (localStorage.getItem(DISMISS_KEY)) return

    // Don't nudge people who are already inside the installed/standalone app.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) return

    // The native app only exists for iPhone/Android, so only nudge those
    // visitors — a "get the mobile app" bar makes no sense on desktop.
    const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent)
    if (!isMobile) return

    setShow(true)
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-white/10 bg-[#111] shadow-lg backdrop-blur p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2"
      role="region"
      aria-label={t('app_cta.title')}
    >
      <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{t('app_cta.title')}</p>
        <p className="text-xs text-white/60 mt-0.5">{t('app_cta.subtitle')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={APP_LINK}
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black hover:opacity-90 transition-opacity"
        >
          {t('app_cta.get')}
        </a>
        <button
          onClick={dismiss}
          aria-label={t('app_cta.dismiss')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
