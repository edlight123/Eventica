/**
 * Centralized money formatting — one place decides symbol + placement so HTG
 * and USD render consistently everywhere (checkout, tickets, refunds, payouts).
 *
 * Placement rules (fixed):
 *   USD → prefix symbol, grouped:   $1,234.56
 *   CAD → prefix symbol, grouped:   CA$1,234.56
 *   EUR → prefix symbol, grouped:   €1,234.56
 *   DOP → prefix symbol, grouped:   RD$1,234.56
 *   HTG → suffix code,   grouped:   1,234.56 HTG
 *
 * Amounts are in MAJOR units by default. Pass `{ fromCents: true }` for values
 * stored in minor units (the payout/earnings API works in cents).
 */

export type CurrencyCode = 'HTG' | 'USD' | 'CAD' | 'EUR' | string;

interface FormatOptions {
  /** Divide the incoming amount by 100 (value is stored in cents). */
  fromCents?: boolean;
  /** Fraction digits (default 2). */
  decimals?: number;
}

/** Normalize a possibly-messy currency string to an uppercase code. */
export function normalizeCurrency(currency?: string | null): CurrencyCode {
  const code = String(currency || 'HTG').trim().toUpperCase();
  return code || 'HTG';
}

/**
 * Format a money amount for display. Non-finite input renders as a zero amount
 * in the target currency rather than "NaN".
 */
export function formatCurrency(
  amount: number,
  currency?: string | null,
  opts: FormatOptions = {},
): string {
  const code = normalizeCurrency(currency);
  const raw = Number.isFinite(amount) ? amount : 0;
  const value = opts.fromCents ? raw / 100 : raw;
  const decimals = opts.decimals ?? 2;

  const grouped = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (code === 'USD') return `$${grouped}`;
  if (code === 'CAD') return `CA$${grouped}`;
  if (code === 'EUR') return `€${grouped}`;
  if (code === 'DOP') return `RD$${grouped}`;
  // HTG (and any other unknown code) → suffix form.
  return `${grouped} ${code}`;
}

/**
 * A compact "from" price for CTA sub-labels, e.g. `apati 1,500 HTG` / `from $25`.
 * Drops the decimals when the amount is a whole number so the pill stays tight.
 */
export function formatPriceShort(amount: number, currency?: string | null): string {
  const whole = Number.isFinite(amount) && Math.abs(amount - Math.round(amount)) < 1e-9;
  return formatCurrency(amount, currency, { decimals: whole ? 0 : 2 });
}

/**
 * The single card/list price helper — consistent symbol + placement everywhere
 * an event price is shown (poster cards, list rows, "from" CTAs, filter readout)
 * so we never render three different shapes ("HTG 500" / "from 500 HTG" / "$500")
 * for the same amount. Whole amounts drop the decimals to stay tight.
 */
export function formatPrice(amount: number, currency?: string | null): string {
  return formatPriceShort(amount, currency);
}
