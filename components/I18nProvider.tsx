'use client'

import { useEffect, useState } from 'react'
import { createInstance } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { i18nOptions } from '@/lib/i18n'

/**
 * Builds one i18n instance per render tree, initialized with the language the
 * SERVER resolved from the i18nextLng cookie (see app/layout.tsx). That makes
 * the SSR HTML come out in the reader's language, so hydration matches and
 * fr/ht readers stop seeing an English flash.
 *
 * When the user switches language (useTranslation().i18n.changeLanguage),
 * the detector's caches write the cookie + localStorage, so the next
 * server render speaks the new language from the first byte.
 */
export function I18nProvider({ children, lng }: { children: React.ReactNode; lng?: string }) {
  const [i18n] = useState(() => {
    const instance = createInstance()
    instance
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        ...(i18nOptions as any),
        // An explicit language (from the cookie) wins over client detection;
        // without one, the detector runs as before (localStorage/navigator).
        ...(lng ? { lng } : {}),
      })
    return instance
  })

  // Migration: users who picked a language before the cookie existed have it
  // only in localStorage, which the server can't see. Re-apply it once so the
  // detector writes the cookie — from then on SSR speaks their language too.
  useEffect(() => {
    try {
      if (document.cookie.includes('i18nextLng=')) return
      const stored = (localStorage.getItem('i18nextLng') || '').slice(0, 2)
      if (['en', 'fr', 'ht'].includes(stored)) i18n.changeLanguage(stored)
    } catch {
      /* storage unavailable — nothing to migrate */
    }
  }, [i18n])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
