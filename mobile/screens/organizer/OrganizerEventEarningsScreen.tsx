import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendFetch, backendJson } from '../../lib/api/backend'
import { getEventById } from '../../lib/api/organizer'
import { getRequiredPayoutProfileIdForEventCountry, normalizeCountryCode } from '../../lib/payment-provider'

type RouteParams = {
  OrganizerEventEarnings: {
    eventId: string
  }
}

type BankDestination = {
  id: string
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary: boolean
}

type EventEarnings = {
  availableToWithdraw: number
  currency?: 'HTG' | 'USD'
  settlementStatus?: 'pending' | 'ready' | 'locked' | string
  settlementReadyDate?: string | null
  lastCalculatedAt?: string | null
  dataSource?: string
  grossSales?: number
  netAmount?: number
  ticketsSold?: number
  totalEarned?: number
  withdrawnAmount?: number
}

export default function OrganizerEventEarningsScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'OrganizerEventEarnings'>>()
  const navigation = useNavigation<any>()
  const { eventId } = route.params

  const { user } = useAuth()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [eventTitle, setEventTitle] = useState<string>('')
  const [eventCountry, setEventCountry] = useState<string>('')
  const [earnings, setEarnings] = useState<EventEarnings | null>(null)

  const [isStripeConnectAccount, setIsStripeConnectAccount] = useState(false)
  const [accountLocation, setAccountLocation] = useState<string>('')

  const requiresStripeConnect = useMemo(() => {
    const normalized = normalizeCountryCode(eventCountry)
    if (normalized) {
      return getRequiredPayoutProfileIdForEventCountry(normalized) === 'stripe_connect'
    }
    // Fallback for legacy events missing a country: infer from organizer payout config.
    return isStripeConnectAccount
  }, [eventCountry, isStripeConnectAccount])

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [method, setMethod] = useState<'moncash' | 'bank' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // MonCash
  const [moncashNumber, setMoncashNumber] = useState('')
  const [prefunding, setPrefunding] = useState<{ enabled: boolean; available: boolean } | null>(null)
  const [allowInstantMoncash, setAllowInstantMoncash] = useState(false)

  // Bank
  const [bankDestinations, setBankDestinations] = useState<BankDestination[] | null>(null)
  const [bankMode, setBankMode] = useState<'on_file' | 'saved' | 'new'>('new')
  const [selectedBankDestinationId, setSelectedBankDestinationId] = useState('')
  const [saveNewBankDestination, setSaveNewBankDestination] = useState(true)
  const [bankDetails, setBankDetails] = useState({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
  })

  // OTP step-up
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [pendingEndpoint, setPendingEndpoint] = useState<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<any | null>(null)

  const currency = (earnings?.currency || 'HTG') as 'HTG' | 'USD'
  const availableToWithdraw = useMemo(() => {
    if (!earnings) return 0
    if (earnings?.settlementStatus !== 'ready') return 0

    const net = typeof earnings.netAmount === 'number' && Number.isFinite(earnings.netAmount) ? earnings.netAmount : null
    const withdrawn = typeof earnings.withdrawnAmount === 'number' && Number.isFinite(earnings.withdrawnAmount) ? earnings.withdrawnAmount : 0

    if (net != null) {
      return Math.max(0, net - withdrawn)
    }

    // Backwards-compatible fallback if API doesn't provide netAmount.
    return Math.max(0, Number(earnings.availableToWithdraw || 0))
  }, [earnings])

  const instantPreview = useMemo(() => {
    if (!prefunding?.enabled || !prefunding?.available) return null
    if (!allowInstantMoncash) return null
    if (currency !== 'HTG') return null

    const feeCents = Math.round(availableToWithdraw * 0.03)
    const payoutAmountCents = Math.max(0, availableToWithdraw - feeCents)
    return { feeCents, payoutAmountCents }
  }, [allowInstantMoncash, availableToWithdraw, currency, prefunding?.available, prefunding?.enabled])

  const formatCurrency = (cents: number, curr: string) => {
    const symbol = String(curr).toUpperCase() === 'USD' ? '$' : 'G'
    return `${symbol}${(cents / 100).toFixed(2)}`
  }

  const webBaseUrl = process.env.EXPO_PUBLIC_WEB_URL || 'https://joineventica.com'

  const loadPayoutRail = useCallback(async () => {
    if (!user?.uid) {
      setIsStripeConnectAccount(false)
      setAccountLocation('')
      return
    }

    try {
      // Prefer backend payout profile (supports legacy fallback server-side).
      try {
        const res = await backendJson<{ profile: any | null }>('/api/organizer/payout-profiles/stripe-connect')
        const profile = res?.profile

        const loc = String(profile?.accountLocation || '').toLowerCase()
        const provider = String(profile?.payoutProvider || '').toLowerCase()
        const stripeAccountId = String(profile?.stripeAccountId || '')

        const stripe = Boolean(stripeAccountId) || provider === 'stripe_connect' || loc === 'united_states' || loc === 'canada'

        setIsStripeConnectAccount(stripe)
        setAccountLocation(loc)
        return
      } catch {
        // Fall back to Firestore read if API host is missing the endpoint.
      }

      const payoutRef = doc(db, 'organizers', user.uid, 'payoutConfig', 'main')
      const snap = await getDoc(payoutRef)
      const data = snap.exists() ? (snap.data() as any) : null

      const loc = String(data?.accountLocation || data?.bankDetails?.accountLocation || '').toLowerCase()
      const provider = String(data?.payoutProvider || '').toLowerCase()
      const stripe = provider === 'stripe_connect' || loc === 'united_states' || loc === 'canada'

      setIsStripeConnectAccount(stripe)
      setAccountLocation(loc)
    } catch (e) {
      // Default to Haiti rails if we can't read payout config.
      setIsStripeConnectAccount(false)
      setAccountLocation('')
    }
  }, [user?.uid])

  const loadEarnings = useCallback(async () => {
    setLoading(true)
    try {
      const event = await getEventById(eventId)
      setEventTitle(event?.title || '')
      const rawCountry = (event as any)?.country
      setEventCountry(normalizeCountryCode(rawCountry) || '')

      try {
        const res = await backendJson<{ earnings: EventEarnings | null }>(
          `/api/organizer/events/${eventId}/earnings`
        )
        setEarnings(res?.earnings || null)
        return
      } catch (e: any) {
        const message = String(e?.message || '')
        const isMissingEndpoint = message.includes('(404)') && message.includes(`/api/organizer/events/${eventId}/earnings`)

        if (!isMissingEndpoint) {
          throw e
        }

        // Fallback: the deployed API host doesn't have the per-event earnings endpoint.
        // We can still load the screen by computing total revenue from tickets.
        // NOTE: availableToWithdraw/withdrawnAmount/settlementStatus remain server-managed.
        const ticketsSnap = await getDocs(
          query(
            collection(db, 'tickets'),
            where('event_id', '==', eventId),
            where('status', 'in', ['active', 'checked_in', 'confirmed', 'valid'])
          )
        )

        const prices = ticketsSnap.docs
          .map((d) => (d.data() as any)?.price_paid)
          .filter((v) => typeof v === 'number' && isFinite(v)) as number[]

        const looksLikeDollars = prices.some((v) => Math.abs(v - Math.round(v)) > 1e-6) || prices.every((v) => v < 500)
        const totalCents = prices.reduce((sum, v) => sum + (looksLikeDollars ? Math.round(v * 100) : Math.round(v)), 0)

        const curr = String((event as any)?.currency || '').toUpperCase()
        const currency: 'HTG' | 'USD' = curr === 'HTG' ? 'HTG' : 'USD'

        setEarnings({
          totalEarned: totalCents,
          availableToWithdraw: 0,
          withdrawnAmount: 0,
          settlementStatus: 'pending',
          currency,
        })

        console.warn(
          '[OrganizerEventEarnings] Per-event earnings endpoint missing on API host; showing estimated total revenue only.'
        )
      }
    } catch (e: any) {
      console.error('Error loading earnings:', e)
      Alert.alert(t('common.error'), e?.message || t('organizerEarnings.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [eventId, t])

  useEffect(() => {
    loadEarnings()
    loadPayoutRail()
  }, [loadEarnings])

  useFocusEffect(
    useCallback(() => {
      loadEarnings()
      loadPayoutRail()
    }, [loadEarnings, loadPayoutRail])
  )

  const openWithdraw = async (nextMethod: 'moncash' | 'bank') => {
    if (!earnings) {
      Alert.alert(t('organizerEarnings.validation.unavailableTitle'), t('organizerEarnings.validation.unavailableBody'))
      return
    }

    if (earnings?.settlementStatus !== 'ready') {
      Alert.alert(t('organizerEarnings.validation.notReadyTitle'), t('organizerEarnings.validation.notReadyBody'))
      return
    }

    if (availableToWithdraw <= 0) {
      Alert.alert(t('organizerEarnings.validation.nothingToWithdrawTitle'), t('organizerEarnings.validation.nothingToWithdrawBody'))
      return
    }

    if (requiresStripeConnect) {
      Alert.alert(
        t('organizerEarnings.stripeConnectRequired.title'),
        t('organizerEarnings.stripeConnectRequired.body')
      )
      return
    }

    setMethod(nextMethod)
    setShowWithdraw(true)
    setVerificationRequired(false)
    setPendingEndpoint(null)
    setPendingPayload(null)
    setVerificationCode('')

    if (nextMethod === 'moncash') {
      try {
        const [prefRaw, cfg] = await Promise.all([
          backendJson<any>('/api/organizer/payout-prefunding-status'),
          backendJson<{ allowInstantMoncash?: boolean }>('/api/organizer/payout-config-summary'),
        ])

        const prefundingPayload = (prefRaw as any)?.prefunding ?? prefRaw
        setPrefunding({
          enabled: Boolean(prefundingPayload?.enabled),
          available: Boolean(prefundingPayload?.available),
        })
        setAllowInstantMoncash(!!cfg?.allowInstantMoncash)
      } catch {
        setPrefunding(null)
        setAllowInstantMoncash(false)
      }
    }

    if (nextMethod === 'bank') {
      try {
        const res = await backendFetch('/api/organizer/payout-destinations/bank')
        const raw = await res.text().catch(() => '')
        const data = (() => {
          try {
            return raw ? (JSON.parse(raw) as any) : {}
          } catch {
            return {}
          }
        })()

        if (!res.ok) {
          const msg = String(data?.error || data?.message || `Request failed (${res.status})`)
          throw new Error(msg)
        }

        const destinations = (data?.destinations || []) as BankDestination[]
        setBankDestinations(destinations)

        const primary = destinations.find((d) => d.isPrimary)
        if (primary) {
          setBankMode('on_file')
          setSelectedBankDestinationId(primary.id)
        } else if (destinations.length > 0) {
          setBankMode('saved')
          setSelectedBankDestinationId(destinations[0].id)
        } else {
          setBankMode('new')
          setSelectedBankDestinationId('')
        }
      } catch (e: any) {
        const msg = String(e?.message || '')
        if (/payout profile required/i.test(msg) || /payout profile not active/i.test(msg) || /not configured/i.test(msg)) {
          Alert.alert(
            t('common.error'),
            msg || 'Payout setup is required before using bank withdrawals.',
            [
              {
                text: t('organizerEarnings.openPayoutSettings'),
                onPress: () => navigation.navigate('OrganizerPayoutSettings'),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ]
          )
        }
        setBankDestinations(null)
        setBankMode('new')
        setSelectedBankDestinationId('')
      }
    }
  }

  const sendOtp = async () => {
    setIsSendingCode(true)
    try {
      await backendJson('/api/organizer/payout-details-change/send-email-code', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      Alert.alert(t('organizerEarnings.otp.codeSentTitle'), t('organizerEarnings.otp.codeSentBody'))
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('organizerEarnings.errors.sendCodeFailed'))
    } finally {
      setIsSendingCode(false)
    }
  }

  const verifyOtpThenRetry = async () => {
    if (!verificationCode.trim()) {
      Alert.alert(t('organizerEarnings.otp.enterCodeTitle'), t('organizerEarnings.otp.enterCodeBody'))
      return
    }

    setIsVerifyingCode(true)
    try {
      await backendJson('/api/organizer/payout-details-change/verify-email-code', {
        method: 'POST',
        body: JSON.stringify({ code: verificationCode.trim() }),
      })

      setVerificationRequired(false)

      if (pendingEndpoint && pendingPayload) {
        await attemptWithdrawal(pendingEndpoint, pendingPayload)
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('organizerEarnings.errors.verificationFailed'))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const attemptWithdrawal = async (endpoint: string, payload: any) => {
    setSubmitting(true)
    try {
      const res = await backendJson<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // Success
      if (method === 'moncash' && res?.instant) {
        Alert.alert(
          t('organizerEarnings.success.instantTitle'),
          `${t('organizerEarnings.success.feeLabel')}${formatCurrency(res?.feeCents || 0, currency)}\n${t('organizerEarnings.success.youReceivedLabel')}${formatCurrency(
            res?.payoutAmountCents || 0,
            currency
          )}`
        )
      } else {
        Alert.alert(t('organizerEarnings.success.requestSubmittedTitle'), t('organizerEarnings.success.requestSubmittedBody'))
      }

      setShowWithdraw(false)
      setMethod(null)
      await loadEarnings()
    } catch (e: any) {
      const message = e?.message || 'Failed to submit withdrawal'
      const requires = /verify|verification/i.test(message)

      if (/payout profile required/i.test(message) || /payout profile not active/i.test(message) || /not configured/i.test(message)) {
        Alert.alert(
          t('common.error'),
          message,
          [
            {
              text: t('organizerEarnings.openPayoutSettings'),
              onPress: () => navigation.navigate('OrganizerPayoutSettings'),
            },
            { text: t('common.ok'), style: 'cancel' },
          ]
        )
        return
      }

      if (requires) {
        setVerificationRequired(true)
        setPendingEndpoint(endpoint)
        setPendingPayload(payload)
        Alert.alert(t('organizerEarnings.otp.verificationRequiredTitle'), t('organizerEarnings.otp.verificationRequiredBody'))
        return
      }

      Alert.alert(t('common.error'), message)
    } finally {
      setSubmitting(false)
    }
  }

  const submit = async () => {
    if (!method) return

    if (!earnings) {
      Alert.alert(t('organizerEarnings.validation.unavailableTitle'), t('organizerEarnings.validation.unavailableBody'))
      return
    }

    if (earnings?.settlementStatus !== 'ready') {
      Alert.alert(t('organizerEarnings.validation.notReadyTitle'), t('organizerEarnings.validation.notReadyBody'))
      return
    }

    if (availableToWithdraw <= 0) {
      Alert.alert(t('organizerEarnings.validation.nothingToWithdrawTitle'), t('organizerEarnings.validation.nothingToWithdrawBody'))
      return
    }

    if (method === 'moncash') {
      if (!moncashNumber.trim()) {
        Alert.alert(t('organizerEarnings.validation.missingPhoneTitle'), t('organizerEarnings.validation.missingPhoneBody'))
        return
      }
      await attemptWithdrawal('/api/organizer/withdraw-moncash', {
        eventId,
        amount: availableToWithdraw,
        moncashNumber: moncashNumber.trim(),
      })
      return
    }

    // bank
    if (bankMode === 'new') {
      if (!bankDetails.accountHolder.trim() || !bankDetails.bankName.trim() || !bankDetails.accountNumber.trim()) {
        Alert.alert(t('organizerEarnings.validation.missingBankDetailsTitle'), t('organizerEarnings.validation.missingBankDetailsBody'))
        return
      }

      await attemptWithdrawal('/api/organizer/withdraw-bank', {
        eventId,
        amount: availableToWithdraw,
        bankDetails: {
          accountHolder: bankDetails.accountHolder.trim(),
          bankName: bankDetails.bankName.trim(),
          accountNumber: bankDetails.accountNumber.trim(),
          routingNumber: bankDetails.routingNumber.trim() || undefined,
          swiftCode: bankDetails.swiftCode.trim() || undefined,
        },
        saveDestination: saveNewBankDestination,
      })
      return
    }

    if (!selectedBankDestinationId) {
      Alert.alert(t('organizerEarnings.validation.selectAccountTitle'), t('organizerEarnings.validation.selectAccountBody'))
      return
    }

    await attemptWithdrawal('/api/organizer/withdraw-bank', {
      eventId,
      amount: availableToWithdraw,
      bankDestinationId: selectedBankDestinationId,
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerEarnings.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{t('organizerEarnings.headerTitle')}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {eventTitle || eventId}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('organizerEarnings.availableToWithdraw')}</Text>
          <Text style={styles.amountText}>{formatCurrency(availableToWithdraw, currency)}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.metaText}>{t('organizerEarnings.settlement')}</Text>
            <Text style={styles.metaText}>{String(earnings?.settlementStatus || 'pending')}</Text>
          </View>
        </View>

        <View style={{ height: 12 }} />

        {requiresStripeConnect ? (
          <View style={styles.notice}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeText}>
                {t('organizerEarnings.stripeNotice')}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrganizerPayoutSettings')}
                style={[styles.actionButton, { backgroundColor: colors.primary, marginTop: 10 }]}
              >
                <Ionicons name="settings-outline" size={20} color={colors.white} />
                <Text style={styles.actionButtonText}>{t('organizerEarnings.openPayoutSettings')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => openWithdraw('moncash')}
              activeOpacity={0.85}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>{t('organizerEarnings.withdrawViaMoncash')}</Text>
            </TouchableOpacity>

            <View style={{ height: 12 }} />

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.text }]}
              onPress={() => openWithdraw('bank')}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>{t('organizerEarnings.withdrawToBank')}</Text>
            </TouchableOpacity>
          </>
        )}

        {!earnings ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.noticeText}>{t('organizerEarnings.notices.noEarnings')}</Text>
          </View>
        ) : earnings?.settlementStatus !== 'ready' ? (
          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.noticeText}>{t('organizerEarnings.notices.notReady')}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={() => setShowWithdraw(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {method === 'moncash'
                  ? t('organizerEarnings.modal.titleMoncash')
                  : t('organizerEarnings.modal.titleBank')}
              </Text>
              <TouchableOpacity onPress={() => setShowWithdraw(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <View style={styles.rowBetween}>
                <Text style={styles.metaText}>{t('organizerEarnings.modal.amount')}</Text>
                <Text style={styles.metaText}>{formatCurrency(availableToWithdraw, currency)}</Text>
              </View>
              {method === 'moncash' && instantPreview ? (
                <>
                  <View style={styles.rowBetween}>
                    <Text style={styles.metaText}>{t('organizerEarnings.modal.instantFee')}</Text>
                    <Text style={styles.metaText}>{formatCurrency(instantPreview.feeCents, currency)}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.metaText}>{t('organizerEarnings.modal.youReceive')}</Text>
                    <Text style={styles.metaText}>{formatCurrency(instantPreview.payoutAmountCents, currency)}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {verificationRequired ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>{t('organizerEarnings.otp.verifyTitle')}</Text>
                  <Text style={styles.sectionHelp}>
                    {t('organizerEarnings.otp.verifyHelp')}
                  </Text>
                  <View style={styles.rowBetween}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={sendOtp} disabled={isSendingCode}>
                      <Text style={styles.secondaryButtonText}>
                        {isSendingCode ? t('organizerEarnings.otp.sending') : t('organizerEarnings.otp.sendCode')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    placeholder={t('organizerEarnings.otp.enterCodePlaceholder')}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, submitting || isVerifyingCode ? styles.buttonDisabled : null]}
                    onPress={verifyOtpThenRetry}
                    disabled={submitting || isVerifyingCode}
                  >
                    <Text style={styles.primaryButtonText}>
                      {isVerifyingCode ? t('organizerEarnings.otp.verifying') : t('organizerEarnings.otp.verifyAndContinue')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : method === 'moncash' ? (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>{t('organizerEarnings.moncash.title')}</Text>
                  <TextInput
                    value={moncashNumber}
                    onChangeText={setMoncashNumber}
                    placeholder={t('organizerEarnings.moncash.placeholder')}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                  {instantPreview ? (
                    <Text style={styles.sectionHelp}>{t('organizerEarnings.moncash.instantAvailable')}</Text>
                  ) : (
                    <Text style={styles.sectionHelp}>{t('organizerEarnings.moncash.processedWithin24')}</Text>
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.sectionTitle}>{t('organizerEarnings.bank.title')}</Text>

                  <View style={styles.radioRow}>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'on_file' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('on_file')}
                      disabled={!bankDestinations?.some((d) => d.isPrimary)}
                    >
                      <Text style={styles.radioChipText}>{t('organizerEarnings.bank.modes.onFile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'saved' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('saved')}
                      disabled={!bankDestinations || bankDestinations.length === 0}
                    >
                      <Text style={styles.radioChipText}>{t('organizerEarnings.bank.modes.saved')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioChip, bankMode === 'new' ? styles.radioChipActive : null]}
                      onPress={() => setBankMode('new')}
                    >
                      <Text style={styles.radioChipText}>{t('organizerEarnings.bank.modes.new')}</Text>
                    </TouchableOpacity>
                  </View>

                  {bankMode !== 'new' ? (
                    <View style={{ marginTop: 10 }}>
                      {(bankDestinations || []).map((d) => (
                        <TouchableOpacity
                          key={d.id}
                          style={[styles.destinationRow, selectedBankDestinationId === d.id ? styles.destinationRowActive : null]}
                          onPress={() => setSelectedBankDestinationId(d.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.destinationTitle}>
                              {d.bankName} ••••{d.accountNumberLast4}{d.isPrimary ? ` ${t('organizerEarnings.bank.primarySuffix')}` : ''}
                            </Text>
                            <Text style={styles.destinationSubtitle}>{d.accountName}</Text>
                          </View>
                          <Ionicons
                            name={selectedBankDestinationId === d.id ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={selectedBankDestinationId === d.id ? colors.primary : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      <TextInput
                        value={bankDetails.accountHolder}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, accountHolder: v }))}
                        placeholder={t('organizerEarnings.bank.placeholders.accountHolder')}
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.bankName}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, bankName: v }))}
                        placeholder={t('organizerEarnings.bank.placeholders.bankName')}
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.accountNumber}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, accountNumber: v }))}
                        placeholder={t('organizerEarnings.bank.placeholders.accountNumber')}
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.routingNumber}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, routingNumber: v }))}
                        placeholder={t('organizerEarnings.bank.placeholders.routingNumberOptional')}
                        style={styles.input}
                      />
                      <TextInput
                        value={bankDetails.swiftCode}
                        onChangeText={(v) => setBankDetails((s) => ({ ...s, swiftCode: v }))}
                        placeholder={t('organizerEarnings.bank.placeholders.swiftOptional')}
                        style={styles.input}
                      />

                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setSaveNewBankDestination((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={saveNewBankDestination ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={saveNewBankDestination ? colors.primary : colors.textSecondary}
                        />
                        <Text style={styles.checkboxText}>{t('organizerEarnings.bank.saveSecondAccount')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.sectionHelp}>
                    {t('organizerEarnings.bank.verificationHint')}
                  </Text>
                </View>
              )}
            </ScrollView>

            {!verificationRequired ? (
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowWithdraw(false)} disabled={submitting}>
                  <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
                  onPress={submit}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitting ? t('organizerEarnings.submitting') : t('common.confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 6,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  amountText: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  notice: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    color: colors.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  summaryBox: {
    marginTop: 12,
    backgroundColor: '#F5F6F8',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  sectionHelp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E4E8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#EEF1F4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radioChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#EEF1F4',
  },
  radioChipActive: {
    backgroundColor: '#D9F2EF',
  },
  radioChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E4E8',
    marginBottom: 8,
  },
  destinationRowActive: {
    borderColor: colors.primary,
    backgroundColor: '#F2FBFA',
  },
  destinationTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  destinationSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkboxText: {
    color: colors.text,
    fontWeight: '600',
  },
})
