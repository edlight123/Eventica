export type SupportedCurrency = 'HTG' | 'USD' | 'CAD' | 'EUR'

function normalizeCurrency(raw: unknown): SupportedCurrency {
  const upper = String(raw || '').toUpperCase()
  if (upper === 'USD') return 'USD'
  if (upper === 'CAD') return 'CAD'
  if (upper === 'EUR') return 'EUR'
  return 'HTG'
}

export function isBudgetFriendlyTicketPrice(price: unknown, currency: unknown): boolean {
  const numeric = Number(price || 0)
  if (!Number.isFinite(numeric)) return false
  if (numeric <= 0) return true

  const curr = normalizeCurrency(currency)
  if (curr === 'USD' || curr === 'CAD' || curr === 'EUR') return numeric <= 5
  return numeric <= 500
}

export function isOverBudgetTicketPrice(price: unknown, currency: unknown): boolean {
  const numeric = Number(price || 0)
  if (!Number.isFinite(numeric)) return false

  const curr = normalizeCurrency(currency)
  if (curr === 'USD' || curr === 'CAD' || curr === 'EUR') return numeric > 5
  return numeric > 500
}
