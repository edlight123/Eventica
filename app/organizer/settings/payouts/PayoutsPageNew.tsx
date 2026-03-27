'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, AlertCircle, CheckCircle, Clock, Ban } from 'lucide-react'
import Link from 'next/link'
import { updatePayoutProfileConfig } from './actions'
import { useRouter } from 'next/navigation'

type BankDestination = {
  id: string
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary: boolean
  verificationStatus?: 'pending' | 'verified' | 'failed'
  verificationSubmittedAt?: string | null
}

// Types
interface PayoutConfig {
  status?: 'not_setup' | 'pending_verification' | 'active' | 'on_hold'
  accountLocation?: string
  payoutProvider?: 'stripe_connect' | 'moncash' | 'natcash' | 'bank_transfer'
  stripeAccountId?: string
  allowInstantMoncash?: boolean
  method?: 'bank_transfer' | 'mobile_money'
  bankDetails?: {
    accountLocation?: string
    accountName: string
    accountNumber: string
    bankName: string
    routingNumber?: string
    swift?: string
    iban?: string
    accountNumberLast4?: string
  }
  mobileMoneyDetails?: {
    provider: string
    phoneNumber: string
    accountName: string
    phoneNumberLast4?: string
  }
  verificationStatus?: {
    identity?: 'pending' | 'verified' | 'failed'
    bank?: 'pending' | 'verified' | 'failed'
    phone?: 'pending' | 'verified' | 'failed'
  }
}

interface EventPayoutSummary {
  eventId: string
  name: string
  date: string
  ticketsSold: number
  grossSales: number
  fees: number
  netPayout: number
  currency?: 'HTG' | 'USD' | string
  payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold'
}

interface PayoutsPageProps {
  haitiConfig?: PayoutConfig
  stripeConfig?: PayoutConfig
  eventSummaries?: EventPayoutSummary[]
  upcomingPayout?: {
    amount: number
    currency: string
    date: string
    eventCount: number
  }
  organizerId: string
  showEarningsAndPayouts?: boolean
  organizerDefaultCountry?: string
  initialActiveProfile?: 'haiti' | 'stripe_connect'
}

export default function PayoutsPageNew({
  haitiConfig,
  stripeConfig,
  eventSummaries,
  upcomingPayout,
  organizerId,
  showEarningsAndPayouts,
  organizerDefaultCountry,
  initialActiveProfile,
}: PayoutsPageProps) {
  const router = useRouter()

  const shouldShowEarningsAndPayouts = showEarningsAndPayouts !== false
  const normalizedEventSummaries = Array.isArray(eventSummaries) ? eventSummaries : []

  const normalizedOrganizerCountry = String(organizerDefaultCountry || '').toUpperCase()

  const primaryProfile: 'haiti' | 'stripe_connect' = (() => {
    // If only one profile exists, it should be the default.
    if (haitiConfig && !stripeConfig) return 'haiti'
    if (stripeConfig && !haitiConfig) return 'stripe_connect'

    // Otherwise, prefer organizer's default country.
    if (normalizedOrganizerCountry === 'US' || normalizedOrganizerCountry === 'CA') return 'stripe_connect'
    return 'haiti'
  })()

  const [activeProfile, setActiveProfile] = useState<'haiti' | 'stripe_connect'>(() => {
    if (initialActiveProfile) return initialActiveProfile
    return primaryProfile
  })

  const [showAdditionalProfiles, setShowAdditionalProfiles] = useState(() => {
    // Show both profiles by default if both are configured
    return Boolean(haitiConfig && stripeConfig)
  })

  const config = activeProfile === 'haiti' ? haitiConfig : stripeConfig

  const [isEditing, setIsEditing] = useState(!config)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payoutChangeVerificationRequired, setPayoutChangeVerificationRequired] = useState(false)
  const [payoutChangeCode, setPayoutChangeCode] = useState('')
  const [payoutChangeMessage, setPayoutChangeMessage] = useState<string | null>(null)
  const [isSendingPayoutChangeCode, setIsSendingPayoutChangeCode] = useState(false)
  const [isVerifyingPayoutChangeCode, setIsVerifyingPayoutChangeCode] = useState(false)
  const [pendingSensitiveUpdate, setPendingSensitiveUpdate] = useState<
    | { kind: 'profile_update'; updates: any }
    | { kind: 'add_bank_destination'; bankDetails: any }
    | null
  >(null)
  const [period, setPeriod] = useState<'this_month' | 'last_3_months' | 'all_time'>('all_time')
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false)
  const [isSubmittingPhoneCode, setIsSubmittingPhoneCode] = useState(false)
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [phoneVerificationMessage, setPhoneVerificationMessage] = useState<string | null>(null)
  const [bankVerificationType, setBankVerificationType] = useState<'bank_statement' | 'void_check' | 'utility_bill'>('bank_statement')
  const [bankVerificationFile, setBankVerificationFile] = useState<File | null>(null)
  const [isSubmittingBankVerification, setIsSubmittingBankVerification] = useState(false)
  const [bankVerificationMessage, setBankVerificationMessage] = useState<string | null>(null)

  const [bankDestinations, setBankDestinations] = useState<BankDestination[] | null>(null)
  const [isLoadingBankDestinations, setIsLoadingBankDestinations] = useState(false)
  const [bankDestinationsError, setBankDestinationsError] = useState<string | null>(null)
  const [selectedBankDestinationId, setSelectedBankDestinationId] = useState<string>('')

  const [showAddBankDestination, setShowAddBankDestination] = useState(false)
  const [isAddingBankDestination, setIsAddingBankDestination] = useState(false)
  const [addBankDestinationMessage, setAddBankDestinationMessage] = useState<string | null>(null)
  const [newBankDestination, setNewBankDestination] = useState({
    bankName: '',
    customBankName: '',
    accountNumber: '',
    accountHolder: '',
    routingNumber: '',
    swiftCode: '',
  })
  const [stripeStatus, setStripeStatus] = useState<any | null>(null)
  const [stripeStatusError, setStripeStatusError] = useState<string | null>(null)
  const [isLoadingStripeStatus, setIsLoadingStripeStatus] = useState(false)
  const [prefunding, setPrefunding] = useState<{ enabled: boolean; available: boolean } | null>(null)
  const [prefundingError, setPrefundingError] = useState<string | null>(null)
  const [isChangingMobileNumber, setIsChangingMobileNumber] = useState(false)
  const [formData, setFormData] = useState(() => ({
    accountLocation:
      activeProfile === 'stripe_connect'
        ? (stripeConfig?.accountLocation || 'united_states')
        : (haitiConfig?.accountLocation || haitiConfig?.bankDetails?.accountLocation || 'haiti'),
    method: config?.method || (activeProfile === 'stripe_connect' ? 'bank_transfer' : 'bank_transfer'),
    bankName: config?.bankDetails?.bankName || 'unibank',
    customBankName: '',
    routingNumber: config?.bankDetails?.routingNumber || '',
    accountName: config?.bankDetails?.accountName || '',
    accountNumber: '',
    swift: config?.bankDetails?.swift || '',
    iban: config?.bankDetails?.iban || '',
    provider: config?.mobileMoneyDetails?.provider || 'moncash',
    phoneNumber: ''
  }))

  const hasPayoutSetup = Boolean(config)
  // Organizer identity verification is shared across profiles (internal KYC).
  const organizerIdentityStatus = haitiConfig?.verificationStatus?.identity || 'pending'
  const identityStatus = config?.verificationStatus?.identity || organizerIdentityStatus
  const bankStatus = config?.verificationStatus?.bank || 'pending'
  const phoneStatus = config?.verificationStatus?.phone || 'pending'

  useEffect(() => {
    setIsEditing(!config)
    setError(null)
    setPayoutChangeVerificationRequired(false)
    setPayoutChangeCode('')
    setPayoutChangeMessage(null)
    setPendingSensitiveUpdate(null)

    setBankVerificationFile(null)
    setBankVerificationMessage(null)
    setAddBankDestinationMessage(null)
    setShowAddBankDestination(false)
    setIsChangingMobileNumber(false)

    setFormData({
      accountLocation:
        activeProfile === 'stripe_connect'
          ? (stripeConfig?.accountLocation || 'united_states')
          : (haitiConfig?.accountLocation || haitiConfig?.bankDetails?.accountLocation || 'haiti'),
      method: config?.method || (activeProfile === 'stripe_connect' ? 'bank_transfer' : 'bank_transfer'),
      bankName: config?.bankDetails?.bankName || 'unibank',
      customBankName: '',
      routingNumber: config?.bankDetails?.routingNumber || '',
      accountName: config?.bankDetails?.accountName || '',
      // Never prefill sensitive values.
      accountNumber: '',
      swift: config?.bankDetails?.swift || '',
      iban: config?.bankDetails?.iban || '',
      provider: config?.mobileMoneyDetails?.provider || 'moncash',
      phoneNumber: '',
    })
    // Note: stripeConfig and haitiConfig are intentionally excluded to prevent infinite loops
    // as they're derived from activeProfile which is already in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, config])

  useEffect(() => {
    if (!payoutChangeVerificationRequired) return
    // Make sure the step-up prompt is visible even when not editing.
    const el = document.getElementById('payout-change-stepup')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [payoutChangeVerificationRequired])

  const effectiveAccountLocation = (isEditing
    ? formData.accountLocation
    : (config?.accountLocation || config?.bankDetails?.accountLocation || formData.accountLocation))

  const isHaiti = activeProfile === 'haiti'
  const selectedProvider = String((isEditing ? formData.provider : config?.mobileMoneyDetails?.provider) || formData.provider || '').toLowerCase()

  const isStripeConnectSelection =
    activeProfile === 'stripe_connect' ||
    String(effectiveAccountLocation || '').toLowerCase() === 'united_states' ||
    String(effectiveAccountLocation || '').toLowerCase() === 'canada'

  const isStripeConnectAccount =
    activeProfile === 'stripe_connect' ||
    isStripeConnectSelection || String(config?.payoutProvider || '').toLowerCase() === 'stripe_connect'

  const formatLocationLabel = (raw: string | null | undefined) => {
    const value = String(raw || '').trim()
    if (!value) return 'Not set'
    if (value.toLowerCase() === 'united_states') return 'United States'
    if (value.toLowerCase() === 'canada') return 'Canada'
    if (value.toLowerCase() === 'haiti') return 'Haiti'
    return value.replace(/_/g, ' ')
  }

  useEffect(() => {
    let cancelled = false

    const loadStripe = async () => {
      if (activeProfile !== 'stripe_connect') return
      setIsLoadingStripeStatus(true)
      setStripeStatusError(null)
      try {
        const res = await fetch('/api/organizer/stripe/status', { cache: 'no-store' as any })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load Stripe status')
        if (!cancelled) setStripeStatus(data)
      } catch (e: any) {
        if (!cancelled) setStripeStatusError(e?.message || 'Failed to load Stripe status')
      } finally {
        if (!cancelled) setIsLoadingStripeStatus(false)
      }
    }

    const loadPrefunding = async () => {
      if (activeProfile !== 'haiti') return
      setPrefundingError(null)
      try {
        const res = await fetch('/api/organizer/payout-prefunding-status', { cache: 'no-store' as any })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load prefunding status')
        if (!cancelled) setPrefunding(data?.prefunding || { enabled: false, available: false })
      } catch (e: any) {
        if (!cancelled) setPrefundingError(e?.message || 'Failed to load prefunding status')
      }
    }

    void loadStripe()
    void loadPrefunding()

    return () => {
      cancelled = true
    }
  }, [activeProfile])

  useEffect(() => {
    let cancelled = false

    const loadBankDestinations = async () => {
      if (activeProfile !== 'haiti') return
      const effectiveMethod = String((isEditing ? formData.method : config?.method) || '').toLowerCase()
      if (effectiveMethod !== 'bank_transfer') return

      setIsLoadingBankDestinations(true)
      setBankDestinationsError(null)
      try {
        const res = await fetch('/api/organizer/payout-destinations/bank', { cache: 'no-store' as any })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to load bank accounts')
        const destinations = (Array.isArray(data?.destinations) ? data.destinations : []) as BankDestination[]
        if (cancelled) return
        setBankDestinations(destinations)

        const stillExists = selectedBankDestinationId && destinations.some((d) => d.id === selectedBankDestinationId)
        if (!stillExists) {
          const primary = destinations.find((d) => d.isPrimary)
          setSelectedBankDestinationId(primary?.id || destinations[0]?.id || '')
        }
      } catch (e: any) {
        if (cancelled) return
        setBankDestinations(null)
        setBankDestinationsError(e?.message || 'Failed to load bank accounts')
        setSelectedBankDestinationId('')
      } finally {
        if (!cancelled) setIsLoadingBankDestinations(false)
      }
    }

    void loadBankDestinations()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, config?.method, isEditing, formData.method])

  const normalizeHaitiPhone = (raw: string) => {
    const compact = String(raw || '').replace(/[\s\-()]/g, '')
    if (!compact) return ''
    if (compact.startsWith('+')) return compact
    if (compact.startsWith('509')) return `+${compact}`
    return compact
  }

  const isValidHaitiPhone = (raw: string) => {
    const phone = normalizeHaitiPhone(raw)
    return /^\+509\d{8}$/.test(phone)
  }

  const getStripeBadge = () => {
    const status = String(stripeStatus?.status || '')
    if (status === 'verified') return { label: 'Verified', tone: 'bg-green-100 text-green-800 border-green-200' }
    if (status === 'requires_more_info') return { label: 'Needs attention', tone: 'bg-red-100 text-red-800 border-red-200' }
    if (status === 'incomplete') return { label: 'Incomplete', tone: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    if (status === 'in_review') return { label: 'In review', tone: 'bg-blue-100 text-blue-800 border-blue-200' }
    return { label: 'Not connected', tone: 'bg-gray-100 text-gray-800 border-gray-200' }
  }

  const startStripeOnboarding = async () => {
    setError(null)
    try {
      const res = await fetch('/api/organizer/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountLocation: String(effectiveAccountLocation || '').toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to start Stripe onboarding')
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error('Stripe onboarding URL missing')
    } catch (e: any) {
      setError(e?.message || 'Failed to start Stripe onboarding')
    }
  }

  const openStripeDashboard = async () => {
    setError(null)
    try {
      const res = await fetch('/api/organizer/stripe/login-link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to open Stripe dashboard')
      if (data?.url) {
        window.location.href = data.url
        return
      }
      throw new Error('Stripe dashboard URL missing')
    } catch (e: any) {
      setError(e?.message || 'Failed to open Stripe dashboard')
    }
  }

  const statusIcon = (status: 'pending' | 'verified' | 'failed') => {
    if (status === 'verified') return <CheckCircle className="w-4 h-4 text-green-600" />
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-yellow-600" />
  }

  // List of supported banks
  const banks = [
    { value: 'unibank', label: 'Unibank' },
    { value: 'sogebank', label: 'Sogebank' },
    { value: 'bnc', label: 'BNC (Banque Nationale de Crédit)' },
    { value: 'capital_bank', label: 'Capital Bank' },
    { value: 'citibank', label: 'Citibank Haiti' },
    { value: 'scotiabank', label: 'Scotiabank' },
    { value: 'other', label: 'Other (add my bank)' }
  ]

  const handleSavePayoutDetails = async () => {
    setIsSaving(true)
    setError(null)
    setPayoutChangeMessage(null)

    const normalizedLocation = String(formData.accountLocation || '').toLowerCase()
    const wantsStripeConnect = normalizedLocation === 'united_states' || normalizedLocation === 'canada'
    
    // Stripe Connect profile: redirect to Stripe onboarding instead of collecting bank fields here.
    if (activeProfile === 'stripe_connect') {
      try {
        if (!wantsStripeConnect) {
          setError('Stripe Connect is only available for United States or Canada accounts')
          setIsSaving(false)
          return
        }

        const stripeSetupUpdate = {
          accountLocation: normalizedLocation,
          payoutProvider: 'stripe_connect',
          method: 'bank_transfer',
        }
        const updateResult = await updatePayoutProfileConfig('stripe_connect', stripeSetupUpdate as any)
        if (!updateResult?.success) {
          if (updateResult?.requiresVerification) {
            setPendingSensitiveUpdate({ kind: 'profile_update', updates: stripeSetupUpdate })
            setPayoutChangeVerificationRequired(true)
            setPayoutChangeMessage('For your security, confirm this payout change with the code we email you.')
            setIsSaving(false)
            return
          }
          throw new Error(updateResult?.error || 'Failed to save payout details. Please try again.')
        }

        const res = await fetch('/api/organizer/stripe/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountLocation: normalizedLocation }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || data?.message || 'Failed to start Stripe onboarding')
        }
        if (data?.url) {
          window.location.href = data.url
          return
        }
        throw new Error('Stripe onboarding URL missing')
      } catch (err: any) {
        setError(err?.message || 'Failed to start Stripe onboarding')
        setIsSaving(false)
        return
      }
    }

    if (formData.method === 'bank_transfer') {
      if (!formData.accountLocation) {
        setError('Please select an account location')
        setIsSaving(false)
        return
      }

      // Haiti bank transfers use saved bank accounts (payout destinations) instead of re-entering details.
      if (activeProfile === 'haiti') {
        const destinations = bankDestinations || []
        const selected = destinations.find((d) => d.id === selectedBankDestinationId) || null
        if (!selected) {
          setError('Please add a bank account first, then select it.')
          setIsSaving(false)
          const verifyEl = document.getElementById('verify-payouts')
          if (verifyEl) verifyEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      } else {
        if (!formData.bankName) {
          setError('Please select a bank')
          setIsSaving(false)
          return
        }
        if (formData.bankName === 'other' && !formData.customBankName.trim()) {
          setError('Please enter your bank name')
          setIsSaving(false)
          return
        }
        if (!formData.routingNumber.trim()) {
          setError('Please enter a routing number')
          setIsSaving(false)
          return
        }
        if (!formData.accountNumber.trim()) {
          setError('Please enter an account number')
          setIsSaving(false)
          return
        }
        if (!formData.accountName.trim()) {
          setError('Please enter the account holder name')
          setIsSaving(false)
          return
        }
      }
    }
    if (formData.method === 'mobile_money') {
      const hasSavedPhone = Boolean(config?.mobileMoneyDetails?.phoneNumberLast4)
      const needsNewPhone = activeProfile === 'haiti' ? (isChangingMobileNumber || !hasSavedPhone) : true
      if (needsNewPhone && !formData.phoneNumber.trim()) {
        setError('Please enter a phone number')
        setIsSaving(false)
        return
      }

      if (needsNewPhone && isHaiti && !isValidHaitiPhone(formData.phoneNumber)) {
        setError('Please enter a valid Haiti phone number (example: +50912345678)')
        setIsSaving(false)
        return
      }
    }
    
    try {
      const updates: any = {
        accountLocation: normalizedLocation,
        method: formData.method as 'bank_transfer' | 'mobile_money'
      }

      if (formData.method === 'bank_transfer') {
        if (activeProfile !== 'haiti') {
          const finalBankName = formData.bankName === 'other' ? formData.customBankName : formData.bankName

          updates.bankDetails = {
            accountLocation: formData.accountLocation,
            bankName: finalBankName,
            routingNumber: formData.routingNumber,
            accountName: formData.accountName,
            accountNumber: formData.accountNumber,
            swift: formData.swift || null,
            iban: formData.iban || null,
          }
        }
      } else {
        const hasSavedPhone = Boolean(config?.mobileMoneyDetails?.phoneNumberLast4)
        const needsNewPhone = activeProfile === 'haiti' ? (isChangingMobileNumber || !hasSavedPhone) : true

        updates.mobileMoneyDetails = {
          provider: formData.provider,
        }

        if (needsNewPhone) {
          updates.mobileMoneyDetails.phoneNumber = isHaiti ? normalizeHaitiPhone(formData.phoneNumber) : formData.phoneNumber
          updates.mobileMoneyDetails.accountName = formData.accountName || formData.phoneNumber
        }

        updates.payoutProvider = String(formData.provider || '').toLowerCase() === 'natcash' ? 'natcash' : 'moncash'
      }

      const result = await updatePayoutProfileConfig(activeProfile as any, updates)
      if (!result?.success) {
        if (result?.requiresVerification) {
          setPendingSensitiveUpdate({ kind: 'profile_update', updates })
          setPayoutChangeVerificationRequired(true)
          setPayoutChangeMessage('For your security, confirm this payout change with the code we email you.')
          setIsSaving(false)
          return
        }
        throw new Error(result?.error || 'Failed to save payout details. Please try again.')
      }

      setIsEditing(false)
      setIsChangingMobileNumber(false)
      setPayoutChangeVerificationRequired(false)
      setPendingSensitiveUpdate(null)
      setPayoutChangeCode('')
      router.refresh()
    } catch (err) {
      setError('Failed to save payout details. Please try again.')
      console.error('Error saving payout details:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const sendPayoutChangeEmailCode = async () => {
    setPayoutChangeMessage(null)
    setError(null)
    setIsSendingPayoutChangeCode(true)
    try {
      const res = await fetch('/api/organizer/payout-details-change/send-email-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send code')

      const devCode = data?.debugCode
      if (process.env.NODE_ENV === 'development' && devCode) {
        setPayoutChangeMessage(`Code sent. Dev code: ${devCode}`)
      } else {
        setPayoutChangeMessage('Code sent. Check your email.')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send code')
    } finally {
      setIsSendingPayoutChangeCode(false)
    }
  }

  const verifyPayoutChangeEmailCode = async () => {
    setPayoutChangeMessage(null)
    setError(null)
    setIsVerifyingPayoutChangeCode(true)
    try {
      const res = await fetch('/api/organizer/payout-details-change/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: payoutChangeCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to verify code')

      if (pendingSensitiveUpdate) {
        if (pendingSensitiveUpdate.kind === 'profile_update') {
          setPayoutChangeMessage('Verified. Saving your payout details…')
          const result = await updatePayoutProfileConfig(activeProfile as any, pendingSensitiveUpdate.updates)
          if (!result?.success) {
            if (result?.requiresVerification) {
              setPayoutChangeMessage('Verification expired. Please request a new code.')
              return
            }
            throw new Error(result?.error || 'Failed to save payout details. Please try again.')
          }
          setIsEditing(false)
        }

        if (pendingSensitiveUpdate.kind === 'add_bank_destination') {
          setPayoutChangeMessage('Verified. Adding your bank account…')
          const res = await fetch('/api/organizer/payout-destinations/bank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bankDetails: pendingSensitiveUpdate.bankDetails }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            if (data?.requiresVerification || data?.code === 'PAYOUT_CHANGE_VERIFICATION_REQUIRED') {
              setPayoutChangeMessage('Verification expired. Please request a new code.')
              return
            }
            throw new Error(data?.error || data?.message || 'Failed to add bank account')
          }

          setAddBankDestinationMessage('Bank account added. Please submit verification for this account.')
          setNewBankDestination({ bankName: '', customBankName: '', accountNumber: '', accountHolder: '', routingNumber: '', swiftCode: '' })
          setShowAddBankDestination(false)
          try {
            const res2 = await fetch('/api/organizer/payout-destinations/bank', { cache: 'no-store' as any })
            const data2 = await res2.json().catch(() => ({}))
            if (res2.ok) setBankDestinations(Array.isArray(data2?.destinations) ? data2.destinations : [])
            const newId = String(data?.destinationId || '')
            if (newId) setSelectedBankDestinationId(newId)
          } catch {
            // ignore
          }
        }

        setPayoutChangeVerificationRequired(false)
        setPendingSensitiveUpdate(null)
        setPayoutChangeCode('')
        router.refresh()
      } else {
        setPayoutChangeMessage('Verified.')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to verify code')
    } finally {
      setIsVerifyingPayoutChangeCode(false)
    }
  }

  useEffect(() => {
    if (!payoutChangeVerificationRequired) return
    if (isSendingPayoutChangeCode) return
    // Auto-send once when the server requires step-up verification.
    void sendPayoutChangeEmailCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutChangeVerificationRequired])

  const formatCurrency = (amountCents: number, currencyRaw?: string) => {
    const normalized = amountCents / 100
    const currency = String(currencyRaw || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(normalized)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusPill = (status: EventPayoutSummary['payoutStatus']) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      on_hold: 'bg-red-100 text-red-800 border-red-200'
    }

    const icons = {
      paid: <CheckCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      scheduled: <Clock className="w-3 h-3" />,
      on_hold: <Ban className="w-3 h-3" />
    }

    const labels = {
      paid: 'Paid',
      pending: 'Pending',
      scheduled: 'Scheduled',
      on_hold: 'On hold'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    )
  }

  const sendPhoneVerificationCode = async () => {
    setPhoneVerificationMessage(null)
    setError(null)
    setIsSendingPhoneCode(true)
    try {
      const res = await fetch('/api/organizer/send-phone-verification-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to send code')

      const devCode = data?.debugCode
      if (process.env.NODE_ENV === 'development' && devCode) {
        setPhoneVerificationMessage(`Code sent. Dev code: ${devCode}`)
      } else {
        setPhoneVerificationMessage('Code sent. Check your phone.')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to send code')
    } finally {
      setIsSendingPhoneCode(false)
    }
  }

  const submitPhoneVerificationCode = async () => {
    setPhoneVerificationMessage(null)
    setError(null)
    setIsSubmittingPhoneCode(true)
    try {
      const res = await fetch('/api/organizer/submit-phone-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode: phoneVerificationCode.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to verify code')
      setPhoneVerificationMessage('Phone verified successfully.')
      setPhoneVerificationCode('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to verify code')
    } finally {
      setIsSubmittingPhoneCode(false)
    }
  }

  const submitBankVerification = async () => {
    setBankVerificationMessage(null)
    setError(null)
    if (!bankVerificationFile) {
      setError('Please attach a verification document')
      return
    }

    if (activeProfile === 'haiti' && !selectedBankDestinationId) {
      setError('Please select a bank account to verify')
      return
    }

    setIsSubmittingBankVerification(true)
    try {
      const form = new FormData()
      form.append('proofDocument', bankVerificationFile)
      form.append('verificationType', bankVerificationType)
      if (activeProfile === 'haiti') {
        form.append('destinationId', selectedBankDestinationId)
      }

      const res = await fetch('/api/organizer/submit-bank-verification', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to submit bank verification')

      setBankVerificationMessage('Bank verification submitted. Awaiting review.')
      setBankVerificationFile(null)

      // Refresh destination list/status.
      if (activeProfile === 'haiti') {
        try {
          const res2 = await fetch('/api/organizer/payout-destinations/bank', { cache: 'no-store' as any })
          const data2 = await res2.json().catch(() => ({}))
          if (res2.ok) setBankDestinations(Array.isArray(data2?.destinations) ? data2.destinations : [])
        } catch {
          // ignore
        }
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to submit bank verification')
    } finally {
      setIsSubmittingBankVerification(false)
    }
  }

  const addBankDestination = async () => {
    setAddBankDestinationMessage(null)
    setError(null)

    if (!newBankDestination.bankName.trim()) {
      setError('Please choose a bank')
      return
    }

    if (newBankDestination.bankName === 'other' && !newBankDestination.customBankName.trim()) {
      setError('Please enter your bank name')
      return
    }
    if (!newBankDestination.accountNumber.trim()) {
      setError('Please enter an account number')
      return
    }
    if (!newBankDestination.accountHolder.trim()) {
      setError('Please enter the account holder name')
      return
    }

    setIsAddingBankDestination(true)
    try {
      const resolvedBankName =
        newBankDestination.bankName === 'other'
          ? newBankDestination.customBankName.trim()
          : newBankDestination.bankName

      const bankDetails = {
        accountNumber: newBankDestination.accountNumber,
        bankName: resolvedBankName,
        accountHolder: newBankDestination.accountHolder,
        routingNumber: newBankDestination.routingNumber || undefined,
        swiftCode: newBankDestination.swiftCode || undefined,
      }

      const res = await fetch('/api/organizer/payout-destinations/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankDetails }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.requiresVerification || data?.code === 'PAYOUT_CHANGE_VERIFICATION_REQUIRED') {
          setPendingSensitiveUpdate({ kind: 'add_bank_destination', bankDetails })
          setPayoutChangeVerificationRequired(true)
          setPayoutChangeMessage('For your security, confirm this new bank account with the code we email you.')
          return
        }
        throw new Error(data?.error || data?.message || 'Failed to add bank account')
      }

      setAddBankDestinationMessage('Bank account added. Please submit verification for this account.')
      setNewBankDestination({ bankName: '', customBankName: '', accountNumber: '', accountHolder: '', routingNumber: '', swiftCode: '' })
      setShowAddBankDestination(false)

      // Refresh list
      try {
        const res2 = await fetch('/api/organizer/payout-destinations/bank', { cache: 'no-store' as any })
        const data2 = await res2.json().catch(() => ({}))
        if (res2.ok) {
          const destinations = (Array.isArray(data2?.destinations) ? data2.destinations : []) as BankDestination[]
          setBankDestinations(destinations)
          const newId = String(data?.destinationId || '')
          if (newId) setSelectedBankDestinationId(newId)
        }
      } catch {
        // ignore
      }
      router.refresh()
    } catch (e: any) {
      setError(e?.message || 'Failed to add bank account')
    } finally {
      setIsAddingBankDestination(false)
    }
  }

  // Filter earnings by period
  const filteredEarnings = normalizedEventSummaries.filter((event) => {
    const eventDate = new Date(event.date)
    const now = new Date()
    
    if (period === 'this_month') {
      return (
        eventDate.getMonth() === now.getMonth() &&
        eventDate.getFullYear() === now.getFullYear()
      )
    } else if (period === 'last_3_months') {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(now.getMonth() - 3)
      return eventDate >= threeMonthsAgo
    }
    
    return true // all_time
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Link href="/organizer/settings" className="hover:text-gray-900">
              Settings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Payouts</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Payouts
          </h1>
          <p className="text-gray-600">
            {shouldShowEarningsAndPayouts
              ? 'Set up where your money goes and track earnings by event.'
              : 'Set up where your payouts go.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/organizer/settings/payouts"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white"
            >
              Payout profile
            </Link>
            <Link
              href="/organizer/earnings"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
            >
              Earnings
            </Link>
            <Link
              href="/organizer/settings/payouts/history"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
            >
              Payout history
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {payoutChangeVerificationRequired ? (
          <div id="payout-change-stepup" className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-yellow-900">Confirm payout details change</p>
                <p className="text-sm text-yellow-800 mt-1">
                  {payoutChangeMessage ||
                    'For your security, confirm this change with the 6-digit code sent to your email.'}
                </p>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={payoutChangeCode}
                    onChange={(e) => setPayoutChangeCode(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full sm:w-48 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={verifyPayoutChangeEmailCode}
                    disabled={isVerifyingPayoutChangeCode || !/^\d{6}$/.test(payoutChangeCode)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isVerifyingPayoutChangeCode ? 'Verifying…' : 'Verify & continue'}
                  </button>
                  <button
                    type="button"
                    onClick={sendPayoutChangeEmailCode}
                    disabled={isSendingPayoutChangeCode}
                    className="px-4 py-2 bg-white border border-yellow-300 text-yellow-900 rounded-lg font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingPayoutChangeCode ? 'Sending…' : 'Resend code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={
            shouldShowEarningsAndPayouts
              ? 'grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'
              : 'grid grid-cols-1 gap-6 lg:gap-8'
          }
        >
          
          {/* Left Column - Payout Setup + Fees */}
          <div className={shouldShowEarningsAndPayouts ? 'lg:col-span-1 space-y-6' : 'space-y-6'}>

            <div
              className={
                shouldShowEarningsAndPayouts
                  ? 'space-y-6'
                  : 'grid grid-cols-1 lg:grid-cols-2 gap-6'
              }
            >

            {/* Payout Profile Selector */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Payout profile</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Set up where your payouts go. You can add an additional payout profile if you host events in another country.
                </p>

                {showAdditionalProfiles ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveProfile('haiti')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        activeProfile === 'haiti'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Haiti
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProfile('stripe_connect')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        activeProfile === 'stripe_connect'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      US/Canada
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-gray-900">
                        {primaryProfile === 'stripe_connect' ? 'US/Canada' : 'Haiti'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdditionalProfiles(true)}
                        className="text-sm font-medium text-purple-600 hover:text-purple-700"
                      >
                        Add additional profile
                      </button>
                    </div>

                    <div className="text-xs text-gray-600">
                      {primaryProfile === 'haiti'
                        ? `Status: ${haitiConfig ? 'Configured' : 'Not set up'}`
                        : `Status: ${stripeConfig ? 'Configured' : 'Not set up'}`}
                    </div>
                  </div>
                )}

                {showAdditionalProfiles ? (
                  <div className="mt-3 text-xs text-gray-600">
                    Haiti profile: {haitiConfig ? 'Configured' : 'Not set up'} · US/Canada profile: {stripeConfig ? 'Configured' : 'Not set up'}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Verification Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div id="verify-payouts" />
                <h2 className="text-lg font-semibold text-gray-900">Verify payouts</h2>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  After setting up your payout method, complete verification below.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">Organizer identity</div>
                      <div className="text-sm text-gray-600">
                        {organizerIdentityStatus === 'verified'
                          ? 'Verified'
                          : organizerIdentityStatus === 'failed'
                            ? 'Needs attention'
                            : 'Pending'}
                      </div>
                    </div>
                    <Link
                      href="/organizer/verify"
                      className="text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View
                    </Link>
                  </div>

                  {!isStripeConnectAccount && config?.method === 'bank_transfer' && hasPayoutSetup && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Bank account</div>
                          <div className="text-sm text-gray-600">
                            {bankStatus === 'verified'
                              ? 'Verified'
                              : bankStatus === 'failed'
                                ? 'Needs attention'
                                : 'Pending'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {isHaiti ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select bank account</label>
                            <select
                              value={selectedBankDestinationId}
                              onChange={(e) => setSelectedBankDestinationId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              {(bankDestinations || []).map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.bankName} • ****{d.accountNumberLast4}{d.isPrimary ? ' (Primary)' : ''} ({d.verificationStatus || 'not submitted'})
                                </option>
                              ))}
                            </select>
                            {isLoadingBankDestinations ? (
                              <div className="text-xs text-gray-500 mt-1">Loading bank accounts…</div>
                            ) : null}
                            {bankDestinationsError ? (
                              <div className="text-xs text-red-700 mt-1">{bankDestinationsError}</div>
                            ) : null}
                          </div>
                        ) : null}

                        {(() => {
                          const selected = (bankDestinations || []).find((d) => d.id === selectedBankDestinationId) || null
                          const status = (selected?.verificationStatus || null) as
                            | 'pending'
                            | 'verified'
                            | 'failed'
                            | null

                          if (isHaiti && status === 'pending') {
                            return (
                              <div className="text-sm text-gray-600">
                                Verification submitted{selected?.verificationSubmittedAt ? ` on ${new Date(selected.verificationSubmittedAt).toLocaleDateString()}` : ''}. Awaiting review.
                              </div>
                            )
                          }

                          if (!isHaiti) {
                            // Non-Haiti legacy flow still uses the profile-level bank verification.
                            if (bankStatus === 'verified') return null
                          } else {
                            if (!selectedBankDestinationId) return null
                            if (status === 'verified') return null
                          }

                          return (
                            <>
                              {isHaiti && status === 'failed' ? (
                                <div className="text-sm text-red-700">
                                  Verification was rejected. Please upload a new document.
                                </div>
                              ) : null}

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document type</label>
                                <select
                                  value={bankVerificationType}
                                  onChange={(e) => setBankVerificationType(e.target.value as any)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                  <option value="bank_statement">Bank statement</option>
                                  <option value="void_check">Void check</option>
                                  <option value="utility_bill">Utility bill</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload document</label>
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => setBankVerificationFile(e.target.files?.[0] || null)}
                                  className="w-full text-sm"
                                />
                              </div>

                              <button
                                onClick={submitBankVerification}
                                disabled={isSubmittingBankVerification}
                                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSubmittingBankVerification ? 'Submitting…' : 'Submit bank verification'}
                              </button>

                              {bankVerificationMessage && (
                                <div className="text-sm text-gray-600">{bankVerificationMessage}</div>
                              )}
                            </>
                          )
                        })()}

                        {isHaiti ? (
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-gray-900">Additional bank accounts</div>
                              <button
                                type="button"
                                onClick={() => setShowAddBankDestination((v) => !v)}
                                className="text-sm font-medium text-purple-600 hover:text-purple-700"
                              >
                                {showAddBankDestination ? 'Cancel' : 'Add bank account'}
                              </button>
                            </div>

                            {addBankDestinationMessage ? (
                              <div className="text-sm text-gray-600 mt-2">{addBankDestinationMessage}</div>
                            ) : null}

                            {showAddBankDestination ? (
                              <div className="mt-3 space-y-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                                  <select
                                    value={newBankDestination.bankName}
                                    onChange={(e) =>
                                      setNewBankDestination((p) => ({
                                        ...p,
                                        bankName: e.target.value,
                                        customBankName: e.target.value === 'other' ? p.customBankName : '',
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  >
                                    <option value="">Select a bank</option>
                                    {banks.map((bank) => (
                                      <option key={bank.value} value={bank.value}>
                                        {bank.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {newBankDestination.bankName === 'other' ? (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
                                    <input
                                      type="text"
                                      value={newBankDestination.customBankName}
                                      onChange={(e) =>
                                        setNewBankDestination((p) => ({ ...p, customBankName: e.target.value }))
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                      placeholder="Enter your bank name"
                                    />
                                  </div>
                                ) : null}

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
                                  <input
                                    type="text"
                                    value={newBankDestination.accountNumber}
                                    onChange={(e) => setNewBankDestination((p) => ({ ...p, accountNumber: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="1234567890"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Account holder name</label>
                                  <input
                                    type="text"
                                    value={newBankDestination.accountHolder}
                                    onChange={(e) => setNewBankDestination((p) => ({ ...p, accountHolder: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Your legal name"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Routing number (optional)</label>
                                  <input
                                    type="text"
                                    value={newBankDestination.routingNumber}
                                    onChange={(e) => setNewBankDestination((p) => ({ ...p, routingNumber: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder=""
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">SWIFT code (optional)</label>
                                  <input
                                    type="text"
                                    value={newBankDestination.swiftCode}
                                    onChange={(e) => setNewBankDestination((p) => ({ ...p, swiftCode: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder=""
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={addBankDestination}
                                  disabled={isAddingBankDestination}
                                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isAddingBankDestination ? 'Adding…' : 'Add bank account'}
                                </button>

                                <p className="text-xs text-gray-500">
                                  You’ll need to submit a bank statement or void check for each bank account.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {!isStripeConnectAccount && config?.method === 'mobile_money' && hasPayoutSetup && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Phone number</div>
                          <div className="text-sm text-gray-600">
                            {phoneStatus === 'verified'
                              ? 'Verified'
                              : phoneStatus === 'failed'
                                ? 'Needs attention'
                                : 'Pending'}
                          </div>
                        </div>
                      </div>

                      {phoneStatus !== 'verified' && (
                        <div className="space-y-3">
                          <button
                            onClick={sendPhoneVerificationCode}
                            disabled={isSendingPhoneCode}
                            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSendingPhoneCode ? 'Sending…' : 'Send verification code'}
                          </button>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit code</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={phoneVerificationCode}
                              onChange={(e) => setPhoneVerificationCode(e.target.value)}
                              placeholder="123456"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>

                          <button
                            onClick={submitPhoneVerificationCode}
                            disabled={isSubmittingPhoneCode}
                            className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmittingPhoneCode ? 'Verifying…' : 'Verify phone'}
                          </button>

                          {phoneVerificationMessage && (
                            <div className="text-sm text-gray-600">{phoneVerificationMessage}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Verification is required to receive payouts and publish paid events.
                </p>
              </div>
            </div>

            </div>
            
            {/* Payout Setup Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payout setup
                </h2>

                {isStripeConnectSelection ? (
                  <div className="mb-4 border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Stripe Connect</p>
                        <p className="text-[12px] sm:text-sm text-gray-600 mt-1">
                          Connect your Stripe account to receive payouts to your bank.
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStripeBadge().tone}`}>
                        {getStripeBadge().label}
                      </span>
                    </div>

                    {stripeStatusError ? (
                      <div className="mt-3 text-sm text-red-700">{stripeStatusError}</div>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      {!stripeStatus?.connected ? (
                        <button
                          onClick={startStripeOnboarding}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
                        >
                          Connect with Stripe
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={startStripeOnboarding}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            Continue onboarding
                          </button>
                          <button
                            onClick={openStripeDashboard}
                            className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                          >
                            Manage in Stripe
                          </button>
                        </>
                      )}

                      {isLoadingStripeStatus ? (
                        <span className="text-sm text-gray-500 self-center">Loading…</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isHaiti &&
                String(formData.method || '').toLowerCase() === 'mobile_money' &&
                selectedProvider === 'moncash' ? (
                  <div className="mb-4 border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                    <p className="text-sm font-semibold text-gray-900">Instant MonCash (prefunding)</p>
                    <p className="text-[12px] sm:text-sm text-gray-600 mt-1">
                      Instant payouts depend on platform prefunding availability.
                    </p>

                    {prefundingError ? (
                      <div className="mt-2 text-sm text-red-700">{prefundingError}</div>
                    ) : null}

                    {prefunding ? (
                      <div className="mt-2 text-[12px] sm:text-sm text-gray-700">
                        Status: {prefunding.enabled && prefunding.available ? 'Available' : prefunding.enabled ? 'Temporarily unavailable' : 'Disabled'}
                      </div>
                    ) : (
                      <div className="mt-2 text-[12px] sm:text-sm text-gray-500">Loading…</div>
                    )}

                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={Boolean(config?.allowInstantMoncash)}
                        disabled={!prefunding?.enabled || !prefunding?.available}
                        onChange={async (e) => {
                          try {
                            const result = await updatePayoutProfileConfig('haiti' as any, { allowInstantMoncash: e.target.checked } as any)
                            if (!result?.success) {
                              if (result?.requiresVerification) {
                                setPendingSensitiveUpdate({
                                  kind: 'profile_update',
                                  updates: { allowInstantMoncash: e.target.checked },
                                })
                                setPayoutChangeVerificationRequired(true)
                                setPayoutChangeMessage('For your security, confirm this payout change with the code we email you.')
                                return
                              }
                              throw new Error(result?.error || 'Failed to update setting')
                            }
                            router.refresh()
                          } catch {
                            setError('Failed to update prefunding preference')
                          }
                        }}
                        className="w-4 h-4 text-purple-600"
                      />
                      Allow instant MonCash withdrawals when available
                    </label>
                  </div>
                ) : null}

                <div className="mb-4 border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
                  <p className="text-sm font-semibold text-gray-900">Payout options</p>
                  <div className="mt-2 space-y-2 text-[12px] sm:text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>
                        <span className="font-medium text-gray-900">Haiti:</span> Bank transfer or Mobile money (MonCash).
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>
                        <span className="font-medium text-gray-900">US/Canada:</span> Stripe Connect (shows when Account location is set to United States/Canada).
                      </span>
                    </div>
                  </div>

                  {isHaiti ? (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-sm font-medium text-gray-900">Fees (Haiti)</p>
                      <p className="text-[12px] sm:text-sm text-gray-600 mt-1">
                        Mobile money is faster but typically has higher fees than bank payouts.
                      </p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="text-sm font-semibold text-gray-900">MonCash / NatCash</p>
                          <p className="text-[12px] sm:text-sm text-gray-600">Instant (prefunding) · Higher fees</p>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="text-sm font-semibold text-gray-900">Bank payout</p>
                          <p className="text-[12px] sm:text-sm text-gray-600">1–3 days · Lower fees</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Checklist + Setup Guidance */}


                {!isEditing && hasPayoutSetup ? (
                  // Summary View
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Location</div>
                      <div className="text-base text-gray-900">
                        {formatLocationLabel(
                          config?.accountLocation || 
                          config?.bankDetails?.accountLocation || 
                          (activeProfile === 'stripe_connect' ? 'united_states' : 'haiti')
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Method</div>
                      <div className="text-base text-gray-900">
                        {isStripeConnectAccount ? (
                          <>Stripe Connect</>
                        ) : config?.method === 'bank_transfer' ? (
                          (() => {
                            if (isHaiti) {
                              const destinations = bankDestinations || []
                              const primary = destinations.find((d) => d.isPrimary) || destinations[0] || null
                              if (primary) {
                                return (
                                  <>
                                    Bank transfer · {primary.bankName} · <span className="font-mono">****{primary.accountNumberLast4}</span>
                                  </>
                                )
                              }
                            }

                            return (
                              <>
                                Bank transfer · {config?.bankDetails?.bankName || 'Bank'} ·{' '}
                                <span className="font-mono">
                                  ****{config?.bankDetails?.accountNumberLast4 || config?.bankDetails?.accountNumber?.slice(-4) || '----'}
                                </span>
                              </>
                            )
                          })()
                        ) : (
                          <>
                            Mobile money · {config?.mobileMoneyDetails?.provider || 'Provider'} ·{' '}
                            <span className="font-mono">
                              ****{config?.mobileMoneyDetails?.phoneNumberLast4 || config?.mobileMoneyDetails?.phoneNumber?.slice(-4) || '----'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 pt-2">
                      {isStripeConnectAccount
                        ? 'Your payouts are handled through Stripe Connect.'
                        : 'Your payouts will be sent to this account.'}
                    </p>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Edit payout details
                    </button>
                  </div>
                ) : (
                  // Form View
                  <div className="space-y-4">
                    {/* Account Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account location <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.accountLocation}
                        onChange={(e) => {
                          const nextLocation = e.target.value
                          if (activeProfile === 'haiti') {
                            setFormData({
                              ...formData,
                              accountLocation: 'haiti',
                            })
                            return
                          }

                          const wantsStripe = nextLocation === 'united_states' || nextLocation === 'canada'
                          setFormData({
                            ...formData,
                            accountLocation: wantsStripe ? nextLocation : 'united_states',
                            method: 'bank_transfer',
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {activeProfile === 'haiti' ? (
                          <option value="haiti">Haiti</option>
                        ) : (
                          <>
                            <option value="united_states">United States</option>
                            <option value="canada">Canada</option>
                          </>
                        )}
                      </select>

                      {activeProfile === 'stripe_connect' ? (
                        <p className="mt-1 text-xs text-gray-500">
                          US/Canada payouts are handled via Stripe Connect (no bank details required here).
                        </p>
                      ) : null}
                    </div>

                    {/* Payout Method */}
                    {activeProfile === 'haiti' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payout method <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="method"
                              value="bank_transfer"
                              checked={formData.method === 'bank_transfer'}
                              onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-sm font-medium text-gray-900">Bank transfer</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="method"
                              value="mobile_money"
                              checked={formData.method === 'mobile_money'}
                              onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-sm font-medium text-gray-900">Mobile money</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        Stripe Connect will collect your bank details securely. You don&apos;t need to enter any bank information on Eventica.
                      </div>
                    )}

                    {/* Bank Transfer Fields */}
                    {activeProfile === 'haiti' && formData.method === 'bank_transfer' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank account <span className="text-red-500">*</span>
                        </label>

                        {isLoadingBankDestinations ? (
                          <div className="text-sm text-gray-500">Loading saved bank accounts…</div>
                        ) : null}

                        {bankDestinations && bankDestinations.length ? (
                          <select
                            value={selectedBankDestinationId}
                            onChange={(e) => setSelectedBankDestinationId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {bankDestinations.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.bankName} • ****{d.accountNumberLast4}{d.isPrimary ? ' (Primary)' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm text-gray-600">
                            No bank accounts saved yet. Add one in the verification section.
                          </div>
                        )}

                        {bankDestinationsError ? (
                          <div className="text-xs text-red-700 mt-1">{bankDestinationsError}</div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('verify-payouts')
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                          className="mt-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                        >
                          Add / manage bank accounts
                        </button>
                      </div>
                    ) : null}

                    {/* Mobile Money Fields */}
                    {formData.method === 'mobile_money' && activeProfile === 'haiti' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Provider
                          </label>
                          <select
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="moncash">MonCash</option>
                            <option value="natcash">Natcash</option>
                          </select>
                        </div>

                        {Boolean(config?.mobileMoneyDetails?.phoneNumberLast4) && !isChangingMobileNumber ? (
                          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="text-sm text-gray-900 font-medium">Saved phone number</div>
                            <div className="text-sm text-gray-700 mt-1">
                              ****{config?.mobileMoneyDetails?.phoneNumberLast4}
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsChangingMobileNumber(true)}
                              className="mt-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                            >
                              Change number
                            </button>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
                            <input
                              type="tel"
                              value={formData.phoneNumber}
                              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                              placeholder="+50912345678"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            {Boolean(config?.mobileMoneyDetails?.phoneNumberLast4) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsChangingMobileNumber(false)
                                  setFormData((p) => ({ ...p, phoneNumber: '' }))
                                }}
                                className="mt-2 text-sm font-medium text-gray-600 hover:text-gray-700"
                              >
                                Use saved number instead
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSavePayoutDetails}
                        disabled={isSaving || payoutChangeVerificationRequired}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSaving
                          ? (activeProfile === 'stripe_connect' ? 'Opening Stripe…' : 'Saving…')
                          : (activeProfile === 'stripe_connect' ? 'Continue to Stripe' : 'Save payout details')}
                      </button>
                      {hasPayoutSetup && (
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setError(null)
                            setPayoutChangeVerificationRequired(false)
                            setPendingSensitiveUpdate(null)
                            setPayoutChangeCode('')
                            setPayoutChangeMessage(null)
                          }}
                          disabled={isSaving}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fees & Rules Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Link href="/organizer/settings/payouts/fees" className="block p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Fees & rules
                    </h3>
                    <p className="text-sm text-gray-600">
                      Platform and processing fees, payout schedule.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column - Earnings + Payouts */}
          {shouldShowEarningsAndPayouts && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Earnings by Event Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Earnings by event
                  </h2>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="this_month">This month</option>
                    <option value="last_3_months">Last 3 months</option>
                    <option value="all_time">All time</option>
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEarnings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No events found for this period
                        </td>
                      </tr>
                    ) : (
                      filteredEarnings.map((event) => (
                        <tr key={event.eventId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/organizer/events/${event.eventId}/earnings`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-700"
                            >
                              {event.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(event.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {event.ticketsSold}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {formatCurrency(event.grossSales, event.currency)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-right">
                            {formatCurrency(event.fees, event.currency)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(event.netPayout, event.currency)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusPill(event.payoutStatus)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredEarnings.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    No events found for this period
                  </div>
                ) : (
                  filteredEarnings.map((event) => (
                    <Link
                      key={event.eventId}
                      href={`/organizer/events/${event.eventId}/earnings`}
                      className="block p-6 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-purple-600">
                          {event.name}
                        </h3>
                        {getStatusPill(event.payoutStatus)}
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        {formatDate(event.date)} · {event.ticketsSold} tickets
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500">Net payout</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(event.netPayout, event.currency)}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Payouts Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payouts
                </h2>

                {upcomingPayout ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-blue-900">
                          Next payout: {formatCurrency(upcomingPayout.amount, upcomingPayout.currency)} · {formatDate(upcomingPayout.date)}
                        </div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          Includes {upcomingPayout.eventCount} {upcomingPayout.eventCount === 1 ? 'event' : 'events'}
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/organizer/settings/payouts/history"
                      className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View payout history
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="text-sm text-gray-600">
                        No upcoming payouts yet.
                      </div>
                    </div>

                    <Link
                      href="/organizer/settings/payouts/history"
                      className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View payout history
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
