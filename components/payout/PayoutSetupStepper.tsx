'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, Smartphone, AlertCircle, Check } from 'lucide-react'
import type { PayoutConfig } from '@/lib/firestore/payout'
import { updatePayoutConfig } from '@/app/organizer/settings/payouts/actions'
import { auth } from '@/lib/firebase/client'
import { onAuthStateChanged, type User } from 'firebase/auth'

type Step = 'method' | 'details' | 'review'

interface PayoutSetupStepperProps {
  currentConfig: PayoutConfig | null
  onClose: () => void
  onComplete: () => void
}

export function PayoutSetupStepper({ currentConfig, onClose, onComplete }: PayoutSetupStepperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<'bank_transfer' | 'mobile_money'>(
    currentConfig?.method || 'bank_transfer'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Bank transfer fields
  const [bankName, setBankName] = useState(currentConfig?.bankDetails?.bankName || '')
  const [accountName, setAccountName] = useState(currentConfig?.bankDetails?.accountName || '')
  const [accountNumber, setAccountNumber] = useState('')
  const [routingNumber, setRoutingNumber] = useState(currentConfig?.bankDetails?.routingNumber || '')

  // Mobile money fields
  const [provider, setProvider] = useState<'moncash' | 'natcash'>(
    (currentConfig?.mobileMoneyDetails?.provider as 'moncash' | 'natcash') || 'moncash'
  )
  const [phoneNumber, setPhoneNumber] = useState('')
  const [mobileAccountName, setMobileAccountName] = useState(
    currentConfig?.mobileMoneyDetails?.accountName || ''
  )

  const validatePhone = (phone: string): boolean => {
    // Haiti phone format: +509XXXXXXXX (509 + 8 digits)
    const phoneRegex = /^\+509\d{8}$/
    return phoneRegex.test(phone)
  }

  const canProceed = () => {
    if (step === 'method') return true
    if (step === 'details') {
      if (method === 'bank_transfer') {
        return bankName.trim() && accountName.trim() && accountNumber.trim()
      } else {
        return phoneNumber && validatePhone(phoneNumber) && mobileAccountName.trim()
      }
    }
    return false
  }

  const handleNext = () => {
    if (step === 'method') {
      setStep('details')
    } else if (step === 'details') {
      setStep('review')
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save payout settings')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const updates: Partial<PayoutConfig> = {
        method,
      }

      if (method === 'bank_transfer') {
        updates.bankDetails = {
          bankName,
          accountName,
          accountNumber,
          routingNumber: routingNumber || undefined,
        }
        updates.mobileMoneyDetails = undefined
      } else {
        updates.mobileMoneyDetails = {
          provider,
          phoneNumber,
          accountName: mobileAccountName,
        }
        updates.bankDetails = undefined
      }

      const result = await updatePayoutConfig(updates)
      if (!result?.success) {
        if (result?.requiresVerification) {
          setError(
            'For your security, payout destination changes require email confirmation. Please update payout details from the payouts settings page.'
          )
          setLoading(false)
          return
        }
        setError(result?.error || 'Failed to save payout settings')
        setLoading(false)
        return
      }

      onComplete()
    } catch (err) {
      console.error('Error saving payout config:', err)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0a0a0a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {currentConfig ? 'Update Payout Method' : 'Set Up Payout Method'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white/65" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-4 bg-[#0a0a0a] border-b border-white/10">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step === 'method' ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-300'
              }`}>
                {step !== 'method' ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-xs font-medium text-white/65">Method</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${
              step !== 'method' ? 'bg-brand-600' : 'bg-gray-300'
            }`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step === 'review' ? 'bg-brand-100 text-brand-300' :
                step === 'details' ? 'bg-brand-700 text-white' : 'bg-white/[0.06] text-white/50'
              }`}>
                {step === 'review' ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-xs font-medium text-white/65">Details</span>
            </div>
            <div className={`flex-1 h-0.5 mx-2 ${
              step === 'review' ? 'bg-brand-600' : 'bg-gray-300'
            }`} />
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                step === 'review' ? 'bg-brand-700 text-white' : 'bg-white/[0.06] text-white/50'
              }`}>
                3
              </div>
              <span className="text-xs font-medium text-white/65">Review</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-6 p-4 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Choose Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <p className="text-white/65 mb-6">Select how you&apos;d like to receive payouts from your events.</p>
              
              <button
                onClick={() => setMethod('bank_transfer')}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                  method === 'bank_transfer'
                    ? 'border-brand-600 '
                    : 'border-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    method === 'bank_transfer' ? 'bg-brand-100' : 'bg-white/[0.04]'
                  }`}>
                    <CreditCard className={`w-6 h-6 ${
                      method === 'bank_transfer' ? 'text-brand-300' : 'text-white/65'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Bank Transfer</h3>
                    <p className="text-sm text-white/65">
                      Receive payouts directly to your bank account. Processing time: 1-3 business days.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMethod('mobile_money')}
                className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                  method === 'mobile_money'
                    ? 'border-brand-600 '
                    : 'border-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    method === 'mobile_money' ? 'bg-brand-100' : 'bg-white/[0.04]'
                  }`}>
                    <Smartphone className={`w-6 h-6 ${
                      method === 'mobile_money' ? 'text-brand-300' : 'text-white/65'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">Mobile Money</h3>
                    <p className="text-sm text-white/65">
                      Receive payouts via MonCash or NatCash. Processing time: Instant to 24 hours.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Enter Details */}
          {step === 'details' && method === 'bank_transfer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., Unibank Haiti"
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Your full name or business name"
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter your account number"
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors font-mono"
                  required
                />
                <p className="text-xs text-white/50 mt-1">
                  Your account number will be encrypted and masked after saving.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Routing/Transit Number
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {step === 'details' && method === 'mobile_money' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Provider <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProvider('moncash')}
                    className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                      provider === 'moncash'
                        ? 'border-brand-600 text-brand-300'
                        : 'border-white/10 hover:border-white/10 text-white/70'
                    }`}
                  >
                    MonCash
                  </button>
                  <button
                    onClick={() => setProvider('natcash')}
                    className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                      provider === 'natcash'
                        ? 'border-brand-600 text-brand-300'
                        : 'border-white/10 hover:border-white/10 text-white/70'
                    }`}
                  >
                    NatCash
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+509XXXXXXXX"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors font-mono ${
                    phoneNumber && !validatePhone(phoneNumber)
                      ? 'border-red-300 focus:border-red-600'
                      : 'border-white/10 focus:border-brand-600'
                  }`}
                  required
                />
                {phoneNumber && !validatePhone(phoneNumber) && (
                  <p className="text-xs text-red-600 mt-1">
                    Please enter a valid Haiti phone number (+509 followed by 8 digits)
                  </p>
                )}
                <p className="text-xs text-white/50 mt-1">
                  Your phone number will be encrypted and masked after saving.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={mobileAccountName}
                  onChange={(e) => setMobileAccountName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="p-6 bg-[#0a0a0a] rounded-xl">
                <h3 className="font-semibold text-white mb-4">Review your payout details</h3>
                
                {method === 'bank_transfer' ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/65">Method:</span>
                      <span className="font-medium text-white">Bank Transfer</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Bank:</span>
                      <span className="font-medium text-white">{bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Account Holder:</span>
                      <span className="font-medium text-white">{accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Account Number:</span>
                      <span className="font-medium text-white font-mono">
                        ****{accountNumber.slice(-4)}
                      </span>
                    </div>
                    {routingNumber && (
                      <div className="flex justify-between">
                        <span className="text-white/65">Routing Number:</span>
                        <span className="font-medium text-white font-mono">{routingNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/65">Method:</span>
                      <span className="font-medium text-white">Mobile Money</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Provider:</span>
                      <span className="font-medium text-white capitalize">{provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Account Holder:</span>
                      <span className="font-medium text-white">{mobileAccountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/65">Phone Number:</span>
                      <span className="font-medium text-white font-mono">
                        ****{phoneNumber.slice(-4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border border-brand-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-brand-300">
                  <p className="font-semibold mb-1">Security Notice</p>
                  <p>Your sensitive information will be encrypted. Only the last 4 digits will be visible after saving.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-[#0a0a0a]">
          {step !== 'method' ? (
            <button
              onClick={() => setStep(step === 'review' ? 'details' : 'method')}
              className="px-6 py-3 text-white/70 font-semibold hover:bg-white/[0.04] rounded-xl transition-colors"
              disabled={loading}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step === 'review' ? (
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-3 bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Payout Method'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-8 py-3 bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
