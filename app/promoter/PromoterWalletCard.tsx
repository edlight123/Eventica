'use client'

// The promoter's money: what is withdrawable now, what is still held with its
// event (same release ladder as the organizer's own funds), and the withdraw
// action itself. Full-balance withdrawals only — street-team amounts don't need
// partial-amount ceremony.

import { useCallback, useEffect, useState } from 'react'

interface WalletData {
  availableByCurrency: Record<string, number>
  pendingByCurrency: Record<string, number>
  unsupportedByCurrency: Record<string, number>
  moncashPhone: string | null
  feePercent: number
  minWithdrawalHtgCents: number
}

interface WithdrawalRow {
  id: string
  status: string
  grossCents: number
  feeCents: number
  payoutHtgCents: number
  instant: boolean
  createdAt: string | null
}

function fmtMoney(cents: number, currency: string): string {
  return `${(Math.round(cents) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`
}

function fmtBuckets(buckets: Record<string, number>): string {
  const parts = Object.entries(buckets)
    .filter(([, cents]) => cents > 0)
    .map(([currency, cents]) => fmtMoney(cents, currency))
  return parts.length ? parts.join(' + ') : '0 HTG'
}

export default function PromoterWalletCard() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/promoter/wallet')
      if (!res.ok) return
      const data = await res.json()
      setWallet(data.wallet)
      setWithdrawals(data.withdrawals || [])
      if (data.wallet?.moncashPhone) setPhone(data.wallet.moncashPhone)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !wallet) return null

  const hasAvailable = Object.values(wallet.availableByCurrency).some((c) => c > 0)
  const hasPending = Object.values(wallet.pendingByCurrency).some((c) => c > 0)
  const hasAnything = hasAvailable || hasPending || withdrawals.length > 0
  if (!hasAnything) return null

  const handleWithdraw = async () => {
    setWorking(true)
    setMessage(null)
    try {
      const res = await fetch('/api/promoter/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: 'error', text: data?.error || 'Withdrawal failed.' })
        return
      }
      setMessage({
        kind: 'ok',
        text: data.instant
          ? `Sent! ${fmtMoney(data.payoutHtgCents, 'HTG')} is on its way to your MonCash (after the ${Math.round(
              (wallet.feePercent || 0.03) * 100
            )}% instant fee).`
          : `Requested. ${fmtMoney(data.payoutHtgCents, 'HTG')} will be sent to your MonCash shortly — no fee on this path.`,
      })
      await load()
    } catch {
      setMessage({ kind: 'error', text: 'Could not reach Tikèm. Nothing was sent.' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="label-mono text-[11px] uppercase tracking-widest text-brand-400 mb-3">Your wallet</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xl font-bold text-white">{fmtBuckets(wallet.availableByCurrency)}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-1">Available now</p>
        </div>
        <div>
          <p className="text-xl font-bold text-white/70">{fmtBuckets(wallet.pendingByCurrency)}</p>
          <p className="text-[11px] uppercase tracking-wider text-white/50 mt-1">Pending release</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-white/40 leading-relaxed">
        Commission unlocks when the event&apos;s funds release to the organizer — the same
        schedule their own payout follows. Instant MonCash withdrawals carry a{' '}
        {Math.round((wallet.feePercent || 0.03) * 100)}% fee; minimum{' '}
        {fmtMoney(wallet.minWithdrawalHtgCents, 'HTG')}.
      </p>

      {hasAvailable && (
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="MonCash number (e.g. 509 XX XX XX XX)"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={working || !phone.trim()}
            className="rounded-xl bg-white hover:bg-white/90 px-5 py-3 text-sm font-medium text-black transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {working ? 'Sending…' : 'Withdraw to MonCash'}
          </button>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.kind === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
          {message.text}
        </p>
      )}

      {withdrawals.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/60">
                {w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                {' · '}
                {fmtMoney(w.payoutHtgCents, 'HTG')}
                {w.instant ? ' · instant' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/50">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    w.status === 'completed'
                      ? 'bg-emerald-400'
                      : w.status === 'failed'
                      ? 'bg-red-400'
                      : 'bg-amber-400'
                  }`}
                />
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
