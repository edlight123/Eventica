/**
 * Locale-aware money / date / time formatting for organizer (and every other)
 * surface. This centralizes the copy-pasted `language → locale` ternary and the
 * `$`-hardcoding that was scattered across screens.
 *
 * Money placement is delegated to `lib/currency.ts` (the single source of truth
 * for symbol + placement), so HTG renders as a suffixed code (`1,234.56 HTG`)
 * and USD as a prefixed symbol (`$1,234.56`) — never a hardcoded `$`.
 */
import { useMemo } from 'react';
import { formatCurrency, type CurrencyCode } from './currency';
import { safeFormatForLanguage } from './dates';
import { useI18n, type Language } from '../contexts/I18nContext';

export interface FormatMoneyOptions {
  /** Currency code — defaults to HTG (the Haiti-first default). */
  currency?: CurrencyCode;
  /** Incoming value is in MINOR units (cents); divide by 100 before display. */
  cents?: boolean;
  /** Fixed fraction digits (defaults to 2). */
  decimals?: number;
}

/** BCP-47 locale for a UI language. `ht` has no wide Intl support → `ht-HT`. */
export function localeForLanguage(language: Language): string {
  switch (language) {
    case 'fr':
      return 'fr-FR';
    case 'ht':
      return 'ht-HT';
    case 'en':
    default:
      return 'en-US';
  }
}

/**
 * Format a money amount for display. HTG vs USD placement is decided by
 * `formatCurrency` — this wrapper only adapts the argument shape and the
 * cents → major-units conversion.
 */
export function formatMoney(value: number, opts: FormatMoneyOptions = {}): string {
  return formatCurrency(value, opts.currency, {
    fromCents: opts.cents,
    decimals: opts.decimals,
  });
}

/** Default patterns — override per call site when a screen needs something else. */
const DEFAULT_DATE_PATTERN = 'MMM d, yyyy';
const DEFAULT_TIME_PATTERN = 'h:mm a';

/**
 * Hook returning locale-bound formatters derived from the active I18n language.
 * Dates/times go through `safeFormatForLanguage` (crash-safe, ht → fr locale),
 * money through `formatMoney` (HTG/USD aware). `locale` is the BCP-47 string for
 * any call site that needs `toLocaleString` directly.
 */
export function useLocaleFormat() {
  const { language } = useI18n();

  return useMemo(
    () => ({
      locale: localeForLanguage(language),
      formatMoney: (value: number, opts?: FormatMoneyOptions) => formatMoney(value, opts),
      formatDate: (value: any, pattern: string = DEFAULT_DATE_PATTERN) =>
        safeFormatForLanguage(value, pattern, language),
      formatTime: (value: any, pattern: string = DEFAULT_TIME_PATTERN) =>
        safeFormatForLanguage(value, pattern, language),
    }),
    [language]
  );
}
