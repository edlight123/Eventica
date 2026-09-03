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
import { useTranslation } from 'react-i18next'
import { updateDeclaredMarkets } from '@/app/organizer/settings/payouts/actions'
import { COUNTRY_SUPPORT } from '@/lib/country-support'
import {
  DECLARABLE_MARKETS,
  normalizeDeclaredMarkets,
  railsForMarkets,
} from '@/lib/organizer-markets'

interface PayoutsSetupWizardProps {
  organizerId: string
  organizerDefaultCountry?: string
  /** Countries already declared, if any. UI hint only — see lib/organizer-markets.ts. */
  declaredMarkets?: string[]
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

type Step = 'welcome' | 'markets' | 'location' | 'method' | 'details' | 'review'

export default function PayoutsSetupWizard({
  organizerId,
  organizerDefaultCountry,
  declaredMarkets,
  onComplete,
  onExit,
}: PayoutsSetupWizardProps) {
  const { t } = useTranslation('organizer')
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Where the organizer says they'll run events. Asked FIRST, because it is what
  // decides whether Stripe is ever mentioned to them at all. Saving it is
  // best-effort: a failed write must not block them from setting up a payout.
  const [markets, setMarkets] = useState<string[]>(() => normalizeDeclaredMarkets(declaredMarkets))
  const [savingMarkets, setSavingMarkets] = useState(false)
  const declaredRails = railsForMarkets(markets)
  const showStripeLocations = declaredRails.length === 0 || declaredRails.includes('stripe_connect')
  const showHaitiLocation = declaredRails.length === 0 || declaredRails.includes('haiti')
  const availableLocations = SUPPORTED_LOCATIONS.filter((location) =>
    location.id === 'haiti' ? showHaitiLocation : showStripeLocations
  )

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
    { id: 'markets', title: 'Markets' },
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

  const handleMarketsContinue = async () => {
    setSavingMarkets(true)
    try {
      await updateDeclaredMarkets(markets)
    } catch {
      // Best effort. The declaration shapes the UI; it is never a prerequisite
      // for setting up a payout method, so a failed write must not stop them.
    } finally {
      setSavingMarkets(false)
    }

    // Never leave them parked on a location the declaration just stopped showing.
    const stillAvailable = SUPPORTED_LOCATIONS.filter((location) => {
      const rails = railsForMarkets(markets)
      if (rails.length === 0) return true
      return location.id === 'haiti' ? rails.includes('haiti') : rails.includes('stripe_connect')
    })
    if (!stillAvailable.some((l) => l.id === selectedLocation)) {
      setSelectedLocation(stillAvailable[0]?.id || 'haiti')
    }

    handleNext()
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
        setError(t('onboarding.payouts.errors.select_bank', { defaultValue: 'Please select a bank' }))
        return false
      }
      if (bankForm.bankName === 'other' && !bankForm.customBankName.trim()) {
        setError(t('onboarding.payouts.errors.bank_name_required', { defaultValue: 'Please enter your bank name' }))
        return false
      }
      if (!bankForm.accountName.trim()) {
        setError(t('onboarding.payouts.errors.account_holder_required', { defaultValue: 'Please enter the account holder name' }))
        return false
      }
      if (!bankForm.accountNumber.trim()) {
        setError(t('onboarding.payouts.errors.account_number_required', { defaultValue: 'Please enter your account number' }))
        return false
      }
    } else if (selectedMethod === 'mobile_money') {
      if (!mobileForm.phoneNumber.trim()) {
        setError(t('onboarding.payouts.errors.phone_required', { defaultValue: 'Please enter your phone number' }))
        return false
      }
      const normalizedPhone = normalizeHaitiPhone(mobileForm.phoneNumber)
      if (!/^\+509\d{8}$/.test(normalizedPhone)) {
        setError(t('onboarding.payouts.errors.phone_invalid', { defaultValue: 'Please enter a valid Haiti phone number (e.g., +509 1234 5678)' }))
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
          throw new Error(data?.error || t('onboarding.payouts.errors.save_config_failed', { defaultValue: 'Failed to save configuration' }))
        }

        // Then start Stripe onboarding
        const stripeRes = await fetch('/api/organizer/stripe/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountLocation: selectedLocation })
        })
        
        const stripeData = await stripeRes.json()
        if (!stripeRes.ok) {
          throw new Error(stripeData?.error || t('onboarding.payouts.errors.stripe_start_failed', { defaultValue: 'Failed to start Stripe setup' }))
        }

        if (stripeData?.url) {
          window.location.href = stripeData.url
          return
        }
        throw new Error(t('onboarding.payouts.errors.stripe_url_missing', { defaultValue: 'Missing Stripe onboarding URL' }))
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
        throw new Error(data?.error || t('onboarding.payouts.errors.save_payout_failed', { defaultValue: 'Failed to save payout details' }))
      }

      onComplete()
    } catch (err: any) {
      setError(err.message || t('onboarding.payouts.errors.generic', { defaultValue: 'Something went wrong. Please try again.' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-[80vh] bg-white/[0.03]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        {currentStep !== 'welcome' && (
          <div className="mb-8">
            <button
              onClick={onExit}
              className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('onboarding.payouts.save_exit', { defaultValue: 'Save & Exit' })}
            </button>

            {/* Progress Bar */}
            <div className="bg-white/[0.03] rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">
                  {t('onboarding.payouts.progress_title', { defaultValue: 'Setting up payouts' })}
                </span>
                <span className="text-xs text-white/50">
                  {t('onboarding.payouts.step_of', {
                    defaultValue: 'Step {{current}} of {{total}}',
                    current: currentStepIndex + 1,
                    total: steps.length,
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      idx <= currentStepIndex ? 'bg-brand-600' : 'bg-white/[0.03]'
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
              {t('onboarding.payouts.welcome.title', { defaultValue: 'Get paid for your events' })}
            </h1>
            <p className="text-lg text-white/60 mb-8 max-w-md mx-auto">
              {t('onboarding.payouts.welcome.subtitle', { defaultValue: 'Set up your payout method to receive earnings from ticket sales quickly and securely.' })}
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/[0.03] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">{t('onboarding.payouts.welcome.secure_title', { defaultValue: 'Secure' })}</h3>
                <p className="text-sm text-white/60">{t('onboarding.payouts.welcome.secure_desc', { defaultValue: 'Bank-level encryption protects your data' })}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">{t('onboarding.payouts.welcome.fast_title', { defaultValue: 'Fast' })}</h3>
                <p className="text-sm text-white/60">{t('onboarding.payouts.welcome.fast_desc', { defaultValue: 'Receive funds within 48 hours of events' })}</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl  p-4 text-left">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-brand-300" />
                </div>
                <h3 className="font-semibold text-white mb-1">{t('onboarding.payouts.welcome.flexible_title', { defaultValue: 'Flexible' })}</h3>
                <p className="text-sm text-white/60">{t('onboarding.payouts.welcome.flexible_desc', { defaultValue: 'Multiple payout methods available' })}</p>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="px-8 py-3.5 bg-brand-700 text-white rounded-xl font-semibold hover:bg-brand-800 transition-all shadow-lg shadow-brand-500/25"
            >
              {t('onboarding.payouts.welcome.cta', { defaultValue: 'Set Up Payouts' })}
            </button>
          </div>
        )}

        {/* Markets Step — asked BEFORE anything about banks, because the answer
            decides whether Stripe is ever mentioned to this organizer at all.
            Skippable, and re-editable later from payout settings. */}
        {currentStep === 'markets' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-700 flex items-center justify-center">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.payouts.markets.title', { defaultValue: 'Where will you run events?' })}</h2>
              <p className="text-white/60">
                {t('onboarding.payouts.markets.subtitle', { defaultValue: 'Pick every country you plan to hold events in. We’ll only set up the payout methods those countries use — and you can change this any time.' })}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {DECLARABLE_MARKETS.map((code) => {
                const isOn = markets.includes(code)
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() =>
                      setMarkets((current) =>
                        current.includes(code)
                          ? current.filter((c) => c !== code)
                          : [...current, code]
                      )
                    }
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      isOn ? 'border-brand-500' : 'border-white/10 hover:border-white/15 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white">
                        {COUNTRY_SUPPORT[code]?.name || code}
                      </div>
                      <div className="text-sm text-white/50">
                        {COUNTRY_SUPPORT[code]?.requiredProfile === 'stripe_connect'
                          ? t('onboarding.payouts.markets.rail_stripe', { defaultValue: 'Paid out through Stripe Connect' })
                          : COUNTRY_SUPPORT[code]?.requiredProfile === 'haiti'
                            ? t('onboarding.payouts.markets.rail_haiti', { defaultValue: 'Paid out by bank transfer or MonCash' })
                            : t('onboarding.payouts.markets.rail_none', { defaultValue: 'Free and RSVP events for now — paid tickets coming soon' })}
                      </div>
                    </div>
                    {isOn && <Check className="w-5 h-5 text-brand-300" />}
                  </button>
                )
              })}
            </div>

            {declaredRails.length > 1 ? (
              <div className="mb-6 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60">
                {t('onboarding.payouts.markets.two_rails_note', { defaultValue: 'Those markets use two different payout systems, so you’ll set up two separate methods. We’ll do one now — you can add the other straight after.' })}
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                {t('onboarding.payouts.nav.back', { defaultValue: 'Back' })}
              </button>
              <button
                onClick={handleMarketsContinue}
                disabled={savingMarkets}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all disabled:opacity-60"
              >
                {savingMarkets ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {markets.length === 0
                  ? t('onboarding.payouts.nav.skip_for_now', { defaultValue: 'Skip for now' })
                  : t('onboarding.payouts.nav.continue', { defaultValue: 'Continue' })}
                {savingMarkets ? null : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Location Step */}
        {currentStep === 'location' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-brand-700 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.payouts.location.title', { defaultValue: 'Where is your bank located?' })}</h2>
              <p className="text-white/60">{t('onboarding.payouts.location.subtitle', { defaultValue: 'This determines the payment methods available to you' })}</p>
            </div>

            <div className="space-y-3 mb-8">
              {availableLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    selectedLocation === location.id
                      ? 'border-brand-500 '
                      : 'border-white/10 hover:border-white/15 bg-white/[0.03]'
                  }`}
                >
                  <span className="text-3xl">{location.flag}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{t(`onboarding.payouts.location.${location.id}`, { defaultValue: location.name })}</div>
                    <div className="text-sm text-white/50">
                      {location.methods.includes('stripe')
                        ? t('onboarding.payouts.location.method_stripe', { defaultValue: 'Bank transfers via Stripe' })
                        : t('onboarding.payouts.location.method_haiti', { defaultValue: 'Bank transfer or mobile money' })}
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
                {t('onboarding.payouts.nav.back', { defaultValue: 'Back' })}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                {t('onboarding.payouts.nav.continue', { defaultValue: 'Continue' })}
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
                {isStripeLocation
                  ? t('onboarding.payouts.method.title_stripe', { defaultValue: 'Payment Method' })
                  : t('onboarding.payouts.method.title_haiti', { defaultValue: 'How would you like to receive payouts?' })}
              </h2>
              <p className="text-white/60">
                {isStripeLocation
                  ? t('onboarding.payouts.method.subtitle_stripe', { defaultValue: 'Stripe Connect handles payments for US and Canada' })
                  : t('onboarding.payouts.method.subtitle_haiti', { defaultValue: 'Choose your preferred payout method' })}
              </p>
            </div>

            {isStripeLocation ? (
              <div className="bg-white/[0.03] rounded-xl border-2 border-brand-500 p-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M13.976 9.15c-2.172-.806-3.234-1.354-3.234-2.31 0-.788.636-1.262 1.885-1.262 2.217 0 3.614.964 3.614.964l.667-2.524s-1.397-.89-4.238-.89c-2.888 0-4.822 1.567-4.822 3.8 0 1.973 1.419 3.178 3.586 3.938 1.85.66 2.634 1.18 2.634 2.094 0 .888-.67 1.433-1.948 1.433-2.218 0-4.08-1.18-4.08-1.18l-.69 2.547s1.866 1.28 4.72 1.28c3.044 0 4.93-1.504 4.93-3.908 0-2.016-1.51-3.17-3.024-3.982z" fill="#635BFF"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">Stripe Connect</h3>
                    <p className="text-white/60 text-sm mb-3">
                      {t('onboarding.payouts.method.stripe_connect_desc', { defaultValue: 'Stripe handles payment processing for US and Canada accounts. You’ll be redirected to complete setup.' })}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-emerald-300">
                      <Check className="w-4 h-4" />
                      <span>{t('onboarding.payouts.method.stripe_direct_deposits', { defaultValue: 'Direct bank deposits' })}</span>
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
                      : 'border-white/10 hover:border-white/15 bg-white/[0.03]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-brand-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{t('onboarding.payouts.method.bank_transfer', { defaultValue: 'Bank Transfer' })}</div>
                    <div className="text-sm text-white/50">{t('onboarding.payouts.method.bank_transfer_desc', { defaultValue: 'Direct deposit to your bank account' })}</div>
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
                      : 'border-white/10 hover:border-white/15 bg-white/[0.03]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-brand-300" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{t('onboarding.payouts.method.mobile_money', { defaultValue: 'Mobile Money' })}</div>
                    <div className="text-sm text-white/50">{t('onboarding.payouts.method.mobile_money_desc', { defaultValue: 'MonCash or NatCash' })}</div>
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
                {t('onboarding.payouts.nav.back', { defaultValue: 'Back' })}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                {t('onboarding.payouts.nav.continue', { defaultValue: 'Continue' })}
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
                  ? t('onboarding.payouts.details.title_stripe', { defaultValue: 'Ready for Stripe' })
                  : selectedMethod === 'bank_transfer'
                    ? t('onboarding.payouts.details.title_bank', { defaultValue: 'Bank Account Details' })
                    : t('onboarding.payouts.details.title_mobile', { defaultValue: 'Mobile Money Details' })}
              </h2>
              <p className="text-white/60">
                {isStripeLocation
                  ? t('onboarding.payouts.details.subtitle_stripe', { defaultValue: 'You’ll complete the setup on Stripe’s secure platform' })
                  : t('onboarding.payouts.details.subtitle_haiti', { defaultValue: 'Enter your account information' })}
              </p>
            </div>

            {isStripeLocation ? (
              <div className="bg-white/[0.03] rounded-xl p-6 mb-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M13.976 9.15c-2.172-.806-3.234-1.354-3.234-2.31 0-.788.636-1.262 1.885-1.262 2.217 0 3.614.964 3.614.964l.667-2.524s-1.397-.89-4.238-.89c-2.888 0-4.822 1.567-4.822 3.8 0 1.973 1.419 3.178 3.586 3.938 1.85.66 2.634 1.18 2.634 2.094 0 .888-.67 1.433-1.948 1.433-2.218 0-4.08-1.18-4.08-1.18l-.69 2.547s1.866 1.28 4.72 1.28c3.044 0 4.93-1.504 4.93-3.908 0-2.016-1.51-3.17-3.024-3.982z" fill="#635BFF"/>
                  </svg>
                </div>
                <p className="text-white/70 mb-2">
                  {t('onboarding.payouts.details.stripe_note', { defaultValue: 'Click continue to complete your setup on Stripe’s secure platform.' })}
                </p>
                <p className="text-sm text-white/50">
                  {t('onboarding.payouts.details.stripe_note_2', { defaultValue: 'You’ll be able to add your bank account and verify your identity.' })}
                </p>
              </div>
            ) : selectedMethod === 'bank_transfer' ? (
              <div className="bg-white/[0.03] rounded-xl  p-5 space-y-4 mb-8">
                {/* Bank Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.bank', { defaultValue: 'Bank' })} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {HAITI_BANKS.map((bank) => (
                      <option key={bank.value} value={bank.value}>{t(`onboarding.payouts.banks.${bank.value}`, { defaultValue: bank.label })}</option>
                    ))}
                  </select>
                </div>

                {bankForm.bankName === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      {t('onboarding.payouts.field.bank_name', { defaultValue: 'Bank Name' })} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankForm.customBankName}
                      onChange={(e) => setBankForm(prev => ({ ...prev, customBankName: e.target.value }))}
                      placeholder={t('onboarding.payouts.field.bank_name_placeholder', { defaultValue: 'Enter your bank name' })}
                      className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                )}

                {/* Account Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.account_holder_name', { defaultValue: 'Account Holder Name' })} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder={t('onboarding.payouts.field.account_holder_name_placeholder', { defaultValue: 'Name as it appears on account' })}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.account_number', { defaultValue: 'Account Number' })} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder={t('onboarding.payouts.field.account_number_placeholder', { defaultValue: 'Your bank account number' })}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Routing Number (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.routing_number', { defaultValue: 'Routing/Transit Number' })} <span className="text-white/40 text-xs">{t('onboarding.payouts.optional', { defaultValue: '(Optional)' })}</span>
                  </label>
                  <input
                    type="text"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm(prev => ({ ...prev, routingNumber: e.target.value }))}
                    placeholder={t('onboarding.payouts.field.routing_number_placeholder', { defaultValue: 'If applicable' })}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] rounded-xl  p-5 space-y-4 mb-8">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.provider', { defaultValue: 'Provider' })} <span className="text-red-500">*</span>
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
                    {t('onboarding.payouts.field.phone_number', { defaultValue: 'Phone Number' })} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={mobileForm.phoneNumber}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder={t('onboarding.payouts.field.phone_number_placeholder', { defaultValue: '+509 1234 5678' })}
                    className="w-full px-4 py-3 border border-white/15 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <p className="mt-1.5 text-xs text-white/50">
                    {t('onboarding.payouts.field.phone_hint', {
                      defaultValue: 'Enter the phone number linked to your {{provider}} account',
                      provider: mobileForm.provider === 'moncash' ? 'MonCash' : 'NatCash',
                    })}
                  </p>
                </div>

                {/* Account Name (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {t('onboarding.payouts.field.account_name', { defaultValue: 'Account Name' })} <span className="text-white/40 text-xs">{t('onboarding.payouts.optional', { defaultValue: '(Optional)' })}</span>
                  </label>
                  <input
                    type="text"
                    value={mobileForm.accountName}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder={t('onboarding.payouts.field.account_name_placeholder', { defaultValue: 'Name on account' })}
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
                {t('onboarding.payouts.nav.back', { defaultValue: 'Back' })}
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-700 text-white rounded-lg font-semibold hover:bg-brand-800 transition-all"
              >
                {t('onboarding.payouts.nav.continue', { defaultValue: 'Continue' })}
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
              <h2 className="text-2xl font-bold text-white mb-2">{t('onboarding.payouts.review.title', { defaultValue: 'Review Your Setup' })}</h2>
              <p className="text-white/60">{t('onboarding.payouts.review.subtitle', { defaultValue: 'Confirm your payout details before finishing' })}</p>
            </div>

            <div className="bg-white/[0.03] rounded-xl  overflow-hidden mb-8">
              {/* Location */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{t('onboarding.payouts.review.location', { defaultValue: 'Location' })}</span>
                  <span className="font-medium text-white flex items-center gap-2">
                    <span>{locationData?.flag}</span>
                    {locationData ? t(`onboarding.payouts.location.${locationData.id}`, { defaultValue: locationData.name }) : null}
                  </span>
                </div>
              </div>

              {/* Method */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">{t('onboarding.payouts.review.payout_method', { defaultValue: 'Payout Method' })}</span>
                  <span className="font-medium text-white">
                    {isStripeLocation
                      ? 'Stripe Connect'
                      : selectedMethod === 'bank_transfer'
                        ? t('onboarding.payouts.method.bank_transfer', { defaultValue: 'Bank Transfer' })
                        : t('onboarding.payouts.method.mobile_money', { defaultValue: 'Mobile Money' })}
                  </span>
                </div>
              </div>

              {/* Details */}
              {!isStripeLocation && selectedMethod === 'bank_transfer' && (
                <>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{t('onboarding.payouts.review.bank', { defaultValue: 'Bank' })}</span>
                      <span className="font-medium text-white">
                        {bankForm.bankName === 'other'
                          ? bankForm.customBankName
                          : t(`onboarding.payouts.banks.${bankForm.bankName}`, { defaultValue: HAITI_BANKS.find(b => b.value === bankForm.bankName)?.label })}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{t('onboarding.payouts.review.account_holder', { defaultValue: 'Account Holder' })}</span>
                      <span className="font-medium text-white">{bankForm.accountName}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{t('onboarding.payouts.review.account_number', { defaultValue: 'Account Number' })}</span>
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
                      <span className="text-sm text-white/50">{t('onboarding.payouts.review.provider', { defaultValue: 'Provider' })}</span>
                      <span className="font-medium text-white">
                        {mobileForm.provider === 'moncash' ? 'MonCash' : 'NatCash'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{t('onboarding.payouts.review.phone_number', { defaultValue: 'Phone Number' })}</span>
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
                {t('onboarding.payouts.nav.back', { defaultValue: 'Back' })}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('onboarding.payouts.nav.setting_up', { defaultValue: 'Setting up...' })}
                  </>
                ) : isStripeLocation ? (
                  <>
                    {t('onboarding.payouts.nav.continue_to_stripe', { defaultValue: 'Continue to Stripe' })}
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t('onboarding.payouts.nav.complete_setup', { defaultValue: 'Complete Setup' })}
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
