import { format } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'

import type { Language } from '../contexts/I18nContext'

export function getDateFnsLocale(language: Language) {
  switch (language) {
    case 'fr':
      return fr
    case 'ht':
      // date-fns doesn't currently ship an ht locale; French is the closest match.
      return fr
    case 'en':
    default:
      return enUS
  }
}

export function formatDateForLanguage(date: Date, pattern: string, language: Language) {
  return format(date, pattern, { locale: getDateFnsLocale(language) })
}

/** True only for a real, finite Date. */
export function isValidDate(value: any): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/**
 * Crash-safe date formatter: coerces the input to a Date and returns '' when it
 * is missing or invalid instead of throwing (date-fns `format` throws on an
 * Invalid Date). Use this at every render site that formats event dates.
 */
export function safeFormatForLanguage(value: any, pattern: string, language: Language): string {
  const date = value instanceof Date ? value : value ? new Date(value) : null
  if (!isValidDate(date)) return ''
  return format(date, pattern, { locale: getDateFnsLocale(language) })
}
