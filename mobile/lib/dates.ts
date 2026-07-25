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

// date-fns applies the locale's WORDS but respects the pattern's literal ORDER,
// so "EEE, MMM d" renders "dim., août 9" in French — wrong. French/Kreyòl want
// day-before-month and 24-hour time. Remap the app's (English-ordered) patterns
// to locale-correct equivalents; unknown patterns pass through unchanged.
const FR_PATTERN_MAP: Record<string, string> = {
  'EEE, MMM d · h:mm a': 'EEE d MMM · HH:mm',
  'EEE, MMM d': 'EEE d MMM',
  'EEEE, MMMM d, yyyy': 'EEEE d MMMM yyyy',
  'EEEE, MMMM dd, yyyy': 'EEEE d MMMM yyyy',
  'MMMM d, yyyy': 'd MMMM yyyy',
  'MMM d, yyyy': 'd MMM yyyy',
  'MMM d': 'd MMM',
  'h:mm a': 'HH:mm',
}

function localizePattern(pattern: string, language: Language): string {
  if (language === 'fr' || language === 'ht') return FR_PATTERN_MAP[pattern] || pattern
  return pattern
}

export function formatDateForLanguage(date: Date, pattern: string, language: Language) {
  return format(date, localizePattern(pattern, language), { locale: getDateFnsLocale(language) })
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
  return format(date, localizePattern(pattern, language), { locale: getDateFnsLocale(language) })
}
