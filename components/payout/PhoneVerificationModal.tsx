'use client'

import { useState } from 'react'
import { X, Smartphone, AlertCircle, CheckCircle } from 'lucide-react'

interface PhoneVerificationModalProps {
  onClose: () => void
  onComplete: () => void
}

export function PhoneVerificationModal({ onClose, onComplete }: PhoneVerificationModalProps) {
  const [step, setStep] = useState<'info' | 'code' | 'verified'>('info')
  const [verificationCode, setVerificationCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugCode, setDebugCode] = useState<string | null>(null)

  const handleSendCode = async () => {
    setSending(true)
    setError(null)
    
    try {
      const response = await fetch('/api/organizer/send-phone-verification-code', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send verification code')
      }

      // In development, show the code
      if (data.debugCode) {
        setDebugCode(data.debugCode)
      }

      setStep('code')
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code')
      return
    }

    setVerifying(true)
    setError(null)
    
    try {
      const response = await fetch('/api/organizer/submit-phone-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Invalid verification code')
      }

      setStep('verified')
    } catch (error: any) {
      setError(error.message || 'Invalid verification code. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleCodeInput = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setVerificationCode(cleaned)
    setError(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0a0a0a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Verify Phone Number</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors">
            <X className="w-6 h-6 text-white/65" />
          </button>
        </div>

        <div className="p-6">
          {step === 'info' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-brand-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Verify Your Mobile Money Account
                </h3>
                <p className="text-white/65">
                  We&apos;ll send a verification code to your mobile money phone number to confirm it belongs to you.
                </p>
              </div>

              <div className="p-4 border border-brand-200 rounded-xl">
                <p className="text-sm text-brand-300">
                  <strong>Note:</strong> Make sure you have access to your mobile money account to receive the verification code.
                </p>
              </div>

              {error && (
                <div className="p-4 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <button
                onClick={handleSendCode}
                disabled={sending}
                className="w-full px-6 py-3 bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                {sending ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-brand-600" />
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Enter Verification Code
                </h3>
                <p className="text-white/65">
                  We&apos;ve sent a 6-digit code to your mobile money number.
                </p>
              </div>

              {debugCode && (
                <div className="p-4 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-300">
                    <strong>Development Mode:</strong> Your verification code is <span className="font-mono font-bold">{debugCode}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-white mb-2 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-6 py-4 text-center text-2xl font-mono font-bold border-2 border-white/10 rounded-xl focus:border-brand-600 focus:outline-none transition-colors tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-white/50 text-center mt-2">
                  Enter the 6-digit code sent to your phone
                </p>
              </div>

              {error && (
                <div className="p-4 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleVerifyCode}
                  disabled={verifying || verificationCode.length !== 6}
                  className="w-full px-6 py-3 bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  onClick={handleSendCode}
                  disabled={sending}
                  className="text-sm text-brand-300 hover:text-brand-300 font-semibold"
                >
                  {sending ? 'Sending...' : 'Didn&apos;t receive the code? Resend'}
                </button>
              </div>
            </div>
          )}

          {step === 'verified' && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Phone Verified!</h3>
              <p className="text-white/65 mb-6 max-w-md mx-auto">
                Your mobile money phone number has been successfully verified. You can now receive payouts via mobile money.
              </p>
              <button
                onClick={() => {
                  onComplete()
                  onClose()
                }}
                className="px-8 py-3 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
