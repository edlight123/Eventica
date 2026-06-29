'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Building2, 
  Smartphone, 
  Check, 
  Loader2,
  CreditCard,
  Shield,
  Wallet,
  MapPin,
  AlertCircle,
  Sparkles
} from 'lucide-react'

interface PayoutsSetupWizardProps {
  organizerId: string
  organizerDefaultCountry?: string
  onComplete: () => void
  onExit: () => void
}

const SUPPORTED_LOCATIONS = [
  { id: 'haiti', name: 'Haiti', flag: '🇭🇹', methods: ['bank_transfer', 'mobile_money'] },
  { id: 'united_states', name: 'United States', flag: '🇺🇸', methods: ['stripe'] },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', methods: ['stripe'] },
]

const HAITI_BANKS = [
  { value: 'unibank', label: 'Unibank' },
  { value: 'sogebank', label: 'Sogebank' },
  { value: 'bnc', label: 'BNC (Banque Nationale de Crédit)' },
  { value: 'capital_bank', label: 'Capital Bank' },
  { value: 'citibank', label: 'Citibank Haiti' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'other', label: 'Other Bank' }
]

const MOBILE_PROVIDERS = [
  { value: 'moncash', label: 'MonCash', icon: '📱' },
  { value: 'natcash', label: 'NatCash', icon: '💳' },
]

type Step = 'welcome' | 'location' | 'method' | 'details' | 'review'

export default function PayoutsSetupWizard({
  organizerId,
  organizerDefaultCountry,
  onComplete,
  onExit,
}: PayoutsSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedLocation, setSelectedLocation] = useState(() => {
    const country = organizerDefaultCountry?.toLowerCase()
    if (country === 'us' || country === 'united_states') return 'united_states'
    if (country === 'ca' || country === 'canada') return 'canada'
    return 'haiti'
  })
  const [selectedMethod, setSelectedMethod] = useState<'bank_transfer' | 'mobile_money' | 'stripe'>('bank_transfer')
  
  // Bank details
  const [bankForm, setBankForm] = useState({
    bankName: 'unibank',
    customBankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
  })
  
  // Mobile money details
  const [mobileForm, setMobileForm] = useState({
    provider: 'moncash',
    phoneNumber: '',
    accountName: '',
  })

  const locationData = SUPPORTED_LOCATIONS.find(l => l.id === selectedLocation)
  const isStripeLocation = selectedLocation === 'united_states' || selectedLocation === 'canada'

  // Auto-set method when location changes
  useEffect(() => {
    if (isStripeLocation) {
      setSelectedMethod('stripe')
    } else {
      setSelectedMethod('bank_transfer')
    }
  }, [selectedLocation, isStripeLocation])

  const steps: { id: Step; title: string }[] = [
    { id: 'welcome', title: 'Welcome' },
    { id: 'location', title: 'Location' },
    { id: 'method', title: 'Method' },
    { id: 'details', title: 'Details' },
    { id: 'review', title: 'Review' },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100

  const goToStep = (step: Step) => {
    setError('')
    setCurrentStep(step)
  }

  const handleNext = () => {
    setError('')
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const handleBack = () => {
    setError('')
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const normalizeHaitiPhone = (raw: string) => {
    const compact = raw.replace(/[\s\-()]/g, '')
    if (!compact) return ''
    if (compact.startsWith('+')) return compact
    if (compact.startsWith('509')) return `+${compact}`
    return compact
  }

  const validateMethod = (): boolean => {
    if (selectedMethod === 'bank_transfer') {
      if (!bankForm.bankName) {
        setError('Please select a bank')
        return false
      }
      if (bankForm.bankName === 'other' && !bankForm.customBankName.trim()) {
        setError('Please enter your bank name')
        return false
      }
      if (!bankForm.accountName.trim()) {
        setError('Please enter the account holder name')
        return false
      }
      if (!bankForm.accountNumber.trim()) {
        setError('Please enter your account number')
        return false
      }
    } else if (selectedMethod === 'mobile_money') {
      if (!mobileForm.phoneNumber.trim()) {
        setError('Please enter your phone number')
        return false
      }
      const normalizedPhone = normalizeHaitiPhone(mobileForm.phoneNumber)
      if (!/^\+509\d{8}$/.test(normalizedPhone)) {
        setError('Please enter a valid Haiti phone number (e.g., +509 1234 5678)')
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (selectedMethod !== 'stripe' && !validateMethod()) {
      return
    }

    try {
      setSaving(true)
      setError('')

      // For Stripe locations, redirect to Stripe onboarding
      if (isStripeLocation || selectedMethod === 'stripe') {
        // First save the profile config
        const configRes = await fetch('/api/organizer/payout-profile-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: 'stripe_connect',
            updates: {
              accountLocation: selectedLocation,
              payoutProvider: 'stripe_connect',
              method: 'bank_transfer',
            }
          })
        })

        if (!configRes.ok) {
          const data = await configRes.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to save configuration')
        }

        // Then start Stripe onboarding
        const stripeRes = await fetch('/api/organizer/stripe/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountLocation: selectedLocation })
        })
        
        const stripeData = await stripeRes.json()
        if (!stripeRes.ok) {
          throw new Error(stripeData?.error || 'Failed to start Stripe setup')
        }
        
        if (stripeData?.url) {
          window.location.href = stripeData.url
          return
        }
        throw new Error('Missing Stripe onboarding URL')
      }

      // For Haiti payouts
      const updates: any = {
        accountLocation: 'haiti',
        method: selectedMethod,
      }

      if (selectedMethod === 'bank_transfer') {
        updates.bankDetails = {
          accountLocation: 'haiti',
          bankName: bankForm.bankName === 'other' ? bankForm.customBankName : bankForm.bankName,
          accountName: bankForm.accountName,
          accountNumber: bankForm.accountNumber,
          routingNumber: bankForm.routingNumber || '',
        }
      } else if (selectedMethod === 'mobile_money') {
        updates.mobileMoneyDetails = {
          provider: mobileForm.provider,
          phoneNumber: normalizeHaitiPhone(mobileForm.phoneNumber),
          accountName: mobileForm.accountName || mobileForm.phoneNumber,
        }
        updates.payoutProvider = mobileForm.provider
      }

      const res = await fetch('/api/organizer/payout-profile-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: 'haiti',
          updates,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save payout details')
      }

      onComplete()
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[80vh] bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {currentStep !== 'welcome' && (
          <div className="mb-8">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Save & Exit
            </button>

            {/* Progress Bar */}
            <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">
                  Setting up payouts
                </span>
                <span className="text-xs text-white/50">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <div className="flex gap-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      idx <= currentStepIndex ? 'bg-brand-600' : 'bg-[#0a0a0a]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Get paid for your events
            </h1>
            <p className="text-lg text-white/60 mb-8 max-w-md mx-auto">
              Set up your payout method to receive earnings from ticket sales quickly and securely.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#0a0a0a] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">Secure</h3>
                <p className="text-sm text-white/60">Bank-level encryption protects your data</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">Fast</h3>
                <p className="text-sm text-white/60">Receive funds within 48 hours of events</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">Flexible</h3>
                <p className="text-sm text-white/60">Multiple payout methods available</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-brand-700 text-white rounded-xl font-semibold hover:bg-brand-800 transition-all shadow-lg shadow-brand-500/25"
            >
              Set Up Payouts
            </button>
          </div>
        )}

        {/* Location Step */}
        {currentStep === 'location' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-700 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Where is your bank located?</h2>
              <p className="text-white/60">This determines the payment methods available to you</p>
            </div>

            <div className="space-y-3 mb-8">
              {SUPPORTED_LOCATIONS.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedLocation === location.id
                      ? 'border-brand-500 '
                      : 'border-white/10 hover:border-white/15 bg-[#0a0a0a]'
                  }`}
                >
                  <span className="text-3xl">{location.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{location.name}</div>
                    <div className="text-sm text-white/50">
                      {location.methods.includes('stripe') 
                        ? 'Bank transfers via Stripe' 
                        : 'Bank transfer or mobile money'}
                    </div>
                  </div>
                  {selectedLocation === location.id && (
                    <Check className="w-5 h-5 text-brand-300" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Method Step (only for Haiti) */}
        {currentStep === 'method' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-700 flex items-center justify-center">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isStripeLocation ? 'Payment Method' : 'How would you like to receive payouts?'}
              </h2>
              <p className="text-white/60">
                {isStripeLocation 
                  ? 'Stripe Connect handles payments for US and Canada'
                  : 'Choose your preferred payout method'}
              </p>
            </div>

            {isStripeLocation ? (
              <div className="bg-[#0a0a0a] rounded-xl border-2 border-brand-500 p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M13.976 9.15c-2.172-.806-3.234-1.354-3.234-2.31 0-.788.636-1.262 1.885-1.262 2.217 0 3.614.964 3.614.964l.667-2.524s-1.397-.89-4.238-.89c-2.888 0-4.822 1.567-4.822 3.8 0 1.973 1.419 3.178 3.586 3.938 1.85.66 2.634 1.18 2.634 2.094 0 .888-.67 1.433-1.948 1.433-2.218 0-4.08-1.18-4.08-1.18l-.69 2.547s1.866 1.28 4.72 1.28c3.044 0 4.93-1.504 4.93-3.908 0-2.016-1.51-3.17-3.024-3.982z" fill="#635BFF"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">Stripe Connect</h3>
                    <p className="text-white/60 text-sm mb-3">
                      Stripe handles payment processing for US and Canada accounts. You&apos;ll be redirected to complete setup.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-emerald-300">
                      <Check className="w-4 h-4" />
                      <span>Direct bank deposits</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
                <button
                  onClick={() => setSelectedMethod('bank_transfer')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedMethod === 'bank_transfer'
                      ? 'border-brand-500 '
                      : 'border-white/10 hover:border-white/15 bg-[#0a0a0a]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-brand-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">Bank Transfer</div>
                    <div className="text-sm text-white/50">Direct deposit to your bank account</div>
                  </div>
                  {selectedMethod === 'bank_transfer' && (
                    <Check className="w-5 h-5 text-brand-300" />
                  )}
                </button>

                <button
                  onClick={() => setSelectedMethod('mobile_money')}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedMethod === 'mobile_money'
                      ? 'border-brand-500 '
                      : 'border-white/10 hover:border-white/15 bg-[#0a0a0a]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-brand-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">Mobile Money</div>
                    <div className="text-sm text-white/50">MonCash or NatCash</div>
                  </div>
                  {selectedMethod === 'mobile_money' && (
                    <Check className="w-5 h-5 text-brand-300" />
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-700 flex items-center justify-center">
                {selectedMethod === 'bank_transfer' ? (
                  <Building2 className="w-7 h-7 text-white" />
                ) : (
                  <Smartphone className="w-7 h-7 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {isStripeLocation 
                  ? 'Ready for Stripe' 
                  : selectedMethod === 'bank_transfer' 
                    ? 'Bank Account Details' 
                    : 'Mobile Money Details'}
              </h2>
              <p className="text-white/60">
                {isStripeLocation 
                  ? "You'll complete the setup on Stripe's secure platform"
                  : 'Enter your account information'}
              </p>
            </div>

            {isStripeLocation ? (
              <div className="bg-[#0a0a0a] rounded-xl p-6 mb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0a0a0a] border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M13.976 9.15c-2.172-.806-3.234-1.354-3.234-2.31 0-.788.636-1.262 1.885-1.262 2.217 0 3.614.964 3.614.964l.667-2.524s-1.397-.89-4.238-.89c-2.888 0-4.822 1.567-4.822 3.8 0 1.973 1.419 3.178 3.586 3.938 1.85.66 2.634 1.18 2.634 2.094 0 .888-.67 1.433-1.948 1.433-2.218 0-4.08-1.18-4.08-1.18l-.69 2.547s1.866 1.28 4.72 1.28c3.044 0 4.93-1.504 4.93-3.908 0-2.016-1.51-3.17-3.024-3.982z" fill="#635BFF"/>
                  </svg>
                </div>
                <p className="text-white/70 mb-2">
                  Click continue to complete your setup on Stripe&apos;s secure platform.
                </p>
                <p className="text-sm text-white/50">
                  You&apos;ll be able to add your bank account and verify your identity.
                </p>
              </div>
            ) : selectedMethod === 'bank_transfer' ? (
              <div className="bg-[#0a0a0a] rounded-xl  p-5 space-y-4 mb-8">
                {/* Bank Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Bank <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {HAITI_BANKS.map((bank) => (
                      <option key={bank.value} value={bank.value}>{bank.label}</option>
                    ))}
                  </select>
                </div>

                {bankForm.bankName === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankForm.customBankName}
                      onChange={(e) => setBankForm(prev => ({ ...prev, customBankName: e.target.value }))}
                      placeholder="Enter your bank name"
                      className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                )}

                {/* Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="Name as it appears on account"
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Your bank account number"
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Routing Number (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Routing/Transit Number <span className="text-white/40 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm(prev => ({ ...prev, routingNumber: e.target.value }))}
                    placeholder="If applicable"
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] rounded-xl  p-5 space-y-4 mb-8">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Provider <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {MOBILE_PROVIDERS.map((provider) => (
                      <button
                        key={provider.value}
                        type="button"
                        onClick={() => setMobileForm(prev => ({ ...prev, provider: provider.value }))}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          mobileForm.provider === provider.value
                            ? 'border-brand-500 '
                            : 'border-white/10 hover:border-white/15'
                        }`}
                      >
                        <span className="text-2xl mb-1 block">{provider.icon}</span>
                        <span className="font-medium text-white">{provider.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={mobileForm.phoneNumber}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="+509 1234 5678"
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <p className="mt-1.5 text-xs text-white/50">
                    Enter the phone number linked to your {mobileForm.provider === 'moncash' ? 'MonCash' : 'NatCash'} account
                  </p>
                </div>

                {/* Account Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Account Name <span className="text-white/40 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={mobileForm.accountName}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="Name on account"
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Review Your Setup</h2>
              <p className="text-white/60">Confirm your payout details before finishing</p>
            </div>

            <div className="bg-[#0a0a0a] rounded-xl  overflow-hidden mb-8">
              {/* Location */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Location</span>
                  <span className="font-medium text-white flex items-center gap-2">
                    <span>{locationData?.flag}</span>
                    {locationData?.name}
                  </span>
                </div>
              </div>

              {/* Method */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Payout Method</span>
                  <span className="font-medium text-white">
                    {isStripeLocation 
                      ? 'Stripe Connect'
                      : selectedMethod === 'bank_transfer' 
                        ? 'Bank Transfer' 
                        : 'Mobile Money'}
                  </span>
                </div>
              </div>

              {/* Details */}
              {!isStripeLocation && selectedMethod === 'bank_transfer' && (
                <>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Bank</span>
                      <span className="font-medium text-white">
                        {bankForm.bankName === 'other' 
                          ? bankForm.customBankName 
                          : HAITI_BANKS.find(b => b.value === bankForm.bankName)?.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Account Holder</span>
                      <span className="font-medium text-white">{bankForm.accountName}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Account Number</span>
                      <span className="font-medium text-white">
                        ****{bankForm.accountNumber.slice(-4)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {!isStripeLocation && selectedMethod === 'mobile_money' && (
                <>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Provider</span>
                      <span className="font-medium text-white">
                        {mobileForm.provider === 'moncash' ? 'MonCash' : 'NatCash'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Phone Number</span>
                      <span className="font-medium text-white">
                        {mobileForm.phoneNumber}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={saving}
                className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : isStripeLocation ? (
                  <>
                    Continue to Stripe
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
