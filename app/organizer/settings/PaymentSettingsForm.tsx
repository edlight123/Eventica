'use client'

import { useState } from 'react'
import { firebaseDb as supabase } from '@/lib/firebase-db/client'

type Settings = {
  organizer_id: string
  payment_method: 'bank_transfer' | 'moncash' | 'paypal'
  bank_name?: string | null
  account_number?: string | null
  account_holder?: string | null
  moncash_number?: string | null
  paypal_email?: string | null
} | null

export default function PaymentSettingsForm({ 
  initialSettings, 
  userId 
}: { 
  initialSettings: Settings
  userId: string
}) {
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'moncash' | 'paypal'>(
    initialSettings?.payment_method || 'moncash'
  )
  const [bankName, setBankName] = useState(initialSettings?.bank_name || '')
  const [accountNumber, setAccountNumber] = useState(initialSettings?.account_number || '')
  const [accountHolder, setAccountHolder] = useState(initialSettings?.account_holder || '')
  const [moncashNumber, setMoncashNumber] = useState(initialSettings?.moncash_number || '')
  const [paypalEmail, setPaypalEmail] = useState(initialSettings?.paypal_email || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const settingsData = {
        organizer_id: userId,
        payment_method: paymentMethod,
        bank_name: paymentMethod === 'bank_transfer' ? bankName : null,
        account_number: paymentMethod === 'bank_transfer' ? accountNumber : null,
        account_holder: paymentMethod === 'bank_transfer' ? accountHolder : null,
        moncash_number: paymentMethod === 'moncash' ? moncashNumber : null,
        paypal_email: paymentMethod === 'paypal' ? paypalEmail : null,
      }

      const { error } = await supabase
        .from('organizer_settings')
        .upsert(settingsData)

      if (error) throw error

      setMessage({ type: 'success', text: 'Payment settings saved successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-2xl shadow-sm  p-8">
      <h2 className="font-display text-xl text-white mb-6">Payment Method</h2>

      {message && (
        <div className={`mb-6 p-4 rounded-xl ${
          message.type === 'success' 
            ? 'border border-emerald-500/30 text-emerald-300' 
            : 'border border-red-500/30 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Payment Method Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white/70 mb-3">
          Select Payment Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setPaymentMethod('moncash')}
            className={`p-4 rounded-xl border-2 transition ${
              paymentMethod === 'moncash'
                ? 'border-brand-500 '
                : 'border-white/10 hover:border-white/15'
            }`}
          >
            <div className="font-semibold text-white">MonCash</div>
            <div className="text-sm text-white/60 mt-1">Haitian mobile money</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('bank_transfer')}
            className={`p-4 rounded-xl border-2 transition ${
              paymentMethod === 'bank_transfer'
                ? 'border-brand-500 '
                : 'border-white/10 hover:border-white/15'
            }`}
          >
            <div className="font-semibold text-white">Bank Transfer</div>
            <div className="text-sm text-white/60 mt-1">Direct to your bank</div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('paypal')}
            className={`p-4 rounded-xl border-2 transition ${
              paymentMethod === 'paypal'
                ? 'border-brand-500 '
                : 'border-white/10 hover:border-white/15'
            }`}
          >
            <div className="font-semibold text-white">PayPal</div>
            <div className="text-sm text-white/60 mt-1">International payments</div>
          </button>
        </div>
      </div>

      {/* MonCash Details */}
      {paymentMethod === 'moncash' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="moncashNumber" className="block text-sm font-medium text-white/70 mb-2">
              MonCash Phone Number
            </label>
            <input
              id="moncashNumber"
              type="tel"
              required
              value={moncashNumber}
              onChange={(e) => setMoncashNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/15 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="+509 1234 5678"
            />
          </div>
        </div>
      )}

      {/* Bank Transfer Details */}
      {paymentMethod === 'bank_transfer' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-white/70 mb-2">
              Bank Name
            </label>
            <input
              id="bankName"
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/15 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="e.g., Unibank Haiti"
            />
          </div>

          <div>
            <label htmlFor="accountHolder" className="block text-sm font-medium text-white/70 mb-2">
              Account Holder Name
            </label>
            <input
              id="accountHolder"
              type="text"
              required
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/15 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Full name on account"
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-white/70 mb-2">
              Account Number
            </label>
            <input
              id="accountNumber"
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/15 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Account number"
            />
          </div>
        </div>
      )}

      {/* PayPal Details */}
      {paymentMethod === 'paypal' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="paypalEmail" className="block text-sm font-medium text-white/70 mb-2">
              PayPal Email
            </label>
            <input
              id="paypalEmail"
              type="email"
              required
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/15 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 border border-blue-500/30 rounded-xl">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-300 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Payout Information</p>
            <p>Payouts are processed within 3-5 business days after your event ends. Make sure your payment information is accurate to avoid delays.</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 rounded-xl bg-brand-700 text-white font-semibold hover:bg-brand-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </div>
    </form>
  )
}
