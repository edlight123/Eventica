// Map the app's i18n language ('en' | 'fr' | 'ht') to date libraries' locales.
//
// date-fns has no Haitian Creole locale, so 'ht' reads dates in French — the
// closest available rendering for the same audience (month/day names are widely
// read in French in Haiti). If date-fns ever ships `ht`, swap it in here once.

import type { Locale } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'

/** date-fns `format(..., { locale })` for the current i18n language. */
export function dateLocaleFor(language?: string): Locale {
  const code = (language || 'en').slice(0, 2).toLowerCase()
  if (code === 'fr' || code === 'ht') return fr
  return enUS
}

/** BCP-47 tag for `toLocaleDateString` / `Intl` for the current i18n language. */
export function intlLocaleFor(language?: string): string {
  const code = (language || 'en').slice(0, 2).toLowerCase()
  if (code === 'fr') return 'fr-FR'
  // French as spoken/written in Haiti — the closest ICU locale to Kreyòl.
  if (code === 'ht') return 'fr-HT'
  return 'en-US'
}
