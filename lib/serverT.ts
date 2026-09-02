// A minimal translator for SERVER components that render copy but cannot use
// react-i18next's `useTranslation` hook (no client-side context to read).
//
// SSR still has to speak the visitor's language: the `i18nextLng` cookie set by
// the client language detector (see lib/i18n.ts) is the one signal the server can
// also read, and app/layout.tsx already uses it the same way to SSR fr/ht from
// the first byte. This reads the same cookie and looks keys up directly in the
// `common` namespace JSON — no i18next instance needed for a handful of strings.

import { cookies } from 'next/headers'
import commonEn from '@/public/locales/en/common.json'
import commonFr from '@/public/locales/fr/common.json'
import commonHt from '@/public/locales/ht/common.json'

export type ServerLang = 'en' | 'fr' | 'ht'

const DICTS: Record<ServerLang, any> = { en: commonEn, fr: commonFr, ht: commonHt }

const SUPPORTED: readonly ServerLang[] = ['en', 'fr', 'ht']

/** The visitor's language for this request, from the same cookie the client writes. */
export async function resolveServerLanguage(): Promise<ServerLang> {
  // Next 15: cookies() is async.
  const fromCookie = (await cookies()).get('i18nextLng')?.value?.slice(0, 2)
  return (SUPPORTED as readonly string[]).includes(fromCookie || '') ? (fromCookie as ServerLang) : 'en'
}

function lookup(dict: any, path: string): string | undefined {
  let node = dict
  for (const part of path.split('.')) {
    node = node?.[part]
    if (node === undefined) return undefined
  }
  return typeof node === 'string' ? node : undefined
}

/**
 * Look up a dotted `common` namespace key for `lang`, falling back to English
 * and then to `fallback` — the same defaultValue pattern the client `t()` calls
 * use, so a key that hasn't landed in the locale files yet never renders blank.
 */
export function tServer(lang: ServerLang, path: string, fallback: string): string {
  return lookup(DICTS[lang], path) ?? lookup(DICTS.en, path) ?? fallback
}
