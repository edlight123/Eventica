import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendFetch, backendJson } from '../../lib/api/backend'
import { getVerificationRequest } from '../../lib/verification'
import { useLocaleFormat } from '../../lib/format'
import { RADIUS } from '../../config/brand'
import { Skeleton } from '../../components/Skeleton'
import StatusChip from '../../components/StatusChip'
import EmptyState from '../../components/EmptyState'
import WhitePillCTA from '../../components/WhitePillCTA'
import MoneyText from '../../components/MoneyText'
import InfoNotice from '../../components/organizer/InfoNotice'
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader'
import SegmentedTabs from '../../components/organizer/SegmentedTabs'
import SelectField from '../../components/organizer/SelectField'
import { HAITI_BANKS, OTHER_BANK } from '../../data/haitiBanks'
import { Receipt, Wallet } from 'lucide-react-native'

type VerificationStatus = 'not_started' | 'pending' | 'verified' | 'failed'

type BankDestination = {
  id: string
  type: 'bank'
  bankName: string
  accountName: string
  accountNumberLast4: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  verificationStatus?: VerificationStatus
  verificationSubmittedAt?: string | null
}

type MoncashDestination = {
  id: string
  type: 'moncash'
  provider: string
  phoneNumber: string
  phoneNumberLast4: string
  accountName: string
  verificationStatus?: VerificationStatus
}

type PayoutDestination = BankDestination | MoncashDestination

// Read-only shape returned by GET /api/organizer/payout-history. Amounts are in
// MINOR units (cents) per the payout doc model; currency is optional (HTG default).
type PayoutHistoryItem = {
  id: string
  amount: number
  status: string
  method?: string
  currency?: string
  createdAt: string
  updatedAt?: string
}

type PayoutTab = 'methods' | 'history'

export default function OrganizerPayoutSettingsScreenV2() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { formatDate } = useLocaleFormat()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [destinations, setDestinations] = useState<PayoutDestination[]>([])
  const [identityVerified, setIdentityVerified] = useState(false)

  // Methods vs History toggle (History is an additive, read-only view).
  const [activeTab, setActiveTab] = useState<PayoutTab>('methods')
  const [refreshing, setRefreshing] = useState(false)

  // Payout history (lazily fetched the first time the History tab is shown).
  const [payouts, setPayouts] = useState<PayoutHistoryItem[]>([])
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutsError, setPayoutsError] = useState(false)
  const [payoutsLoaded, setPayoutsLoaded] = useState(false)

  // Add method modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMethodType, setSelectedMethodType] = useState<'bank' | 'moncash' | null>(null)

  // Bank form
  const [showBankForm, setShowBankForm] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [bankForm, setBankForm] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    swift: '',
  })
  // Tracks the bank-name DROPDOWN selection (one of HAITI_BANKS). When it is
  // 'Other', a free-text field is revealed and the typed value is what lands in
  // bankForm.bankName. For a listed bank, the dropdown value IS bankForm.bankName.
  const [bankNameChoice, setBankNameChoice] = useState('')

  // MonCash form
  const [showMoncashForm, setShowMoncashForm] = useState(false)
  const [savingMoncash, setSavingMoncash] = useState(false)
  const [moncashForm, setMoncashForm] = useState({
    provider: 'moncash',
    accountName: '',
    phoneNumber: '',
  })

  // Verification flow for selected destination
  const [selectedDestination, setSelectedDestination] = useState<PayoutDestination | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationType, setVerificationType] = useState<'bank_statement' | 'void_check' | 'utility_bill'>(
    'bank_statement'
  )
  const [verificationAsset, setVerificationAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [submittingVerification, setSubmittingVerification] = useState(false)

  // Phone verification (for MonCash)
  const [phoneCode, setPhoneCode] = useState('')
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false)
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false)

  // Maps a destination's verification status onto the shared StatusChip's locked
  // semantic tones (POSH §2.7) — pending is amber, not teal.
  const statusChip = useCallback((status?: VerificationStatus) => {
    if (status === 'verified') return { status: 'verified', label: 'Verified' }
    if (status === 'pending') return { status: 'pending', label: 'Under Review' }
    if (status === 'failed') return { status: 'error', label: 'Needs Attention' }
    return { status: 'neutral', label: 'Not Verified' }
  }, [])

  const loadDestinations = useCallback(async () => {
    if (!user?.uid) return

    try {
      // Load bank destinations from backend
      const bankRes = await backendFetch('/api/organizer/payout-destinations/bank')
      if (bankRes.ok) {
        const data = await bankRes.json()
        const list = (data?.destinations || []) as BankDestination[]
        setDestinations(list)
        return list
      }
    } catch (e) {
      console.error('Failed to load destinations:', e)
    }
    return [] as PayoutDestination[]
  }, [user?.uid])

  const loadIdentityStatus = useCallback(async () => {
    if (!user?.uid) return

    try {
      const req = await getVerificationRequest(user.uid)
      setIdentityVerified(req?.status === 'approved')
    } catch {
      setIdentityVerified(false)
    }
  }, [user?.uid])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadDestinations(), loadIdentityStatus()])
    } finally {
      setLoading(false)
    }
  }, [loadDestinations, loadIdentityStatus])

  useEffect(() => {
    load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const loadPayouts = useCallback(async () => {
    if (!user?.uid) return
    setPayoutsLoading(true)
    setPayoutsError(false)
    try {
      const data = await backendJson<{ payouts?: PayoutHistoryItem[] }>('/api/organizer/payout-history')
      // Don't rely on the endpoint's ordering — sort newest first by createdAt.
      const list = (data?.payouts || [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPayouts(list)
    } catch (e) {
      console.error('Failed to load payout history:', e)
      setPayoutsError(true)
    } finally {
      setPayoutsLoading(false)
      setPayoutsLoaded(true)
    }
  }, [user?.uid])

  // Fetch history the first time the tab is opened (and whenever a retry resets it).
  useEffect(() => {
    if (activeTab === 'history' && !payoutsLoaded && !payoutsLoading) {
      loadPayouts()
    }
  }, [activeTab, payoutsLoaded, payoutsLoading, loadPayouts])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (activeTab === 'history') {
        await loadPayouts()
      } else {
        await load()
      }
    } finally {
      setRefreshing(false)
    }
  }, [activeTab, load, loadPayouts])

  // Maps a payout status onto the shared StatusChip semantic tones + an i18n label.
  const payoutStatusMeta = useCallback((status: string): { tone: string; labelKey: string | null } => {
    switch (String(status).toLowerCase()) {
      case 'completed':
        return { tone: 'success', labelKey: 'completed' }
      case 'processing':
        return { tone: 'pending', labelKey: 'processing' }
      case 'pending':
        return { tone: 'pending', labelKey: 'pending' }
      case 'failed':
        return { tone: 'error', labelKey: 'failed' }
      case 'cancelled':
        return { tone: 'neutral', labelKey: 'cancelled' }
      default:
        return { tone: 'neutral', labelKey: null }
    }
  }, [])

  const payoutMethodLabel = useCallback((method?: string): string => {
    const key = String(method || '').toLowerCase()
    if (key.includes('mobile') || key.includes('moncash') || key.includes('natcash')) {
      return t('organizerPayoutSettings.payoutHistory.method.moncash')
    }
    if (key.includes('bank')) {
      return t('organizerPayoutSettings.payoutHistory.method.bank')
    }
    return method || ''
  }, [t])

  const handleAddMethodSelect = useCallback((type: 'bank' | 'moncash') => {
    if (!identityVerified) {
      Alert.alert(
        'Identity Verification Required',
        'Please complete identity verification before adding payout methods.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Identity', onPress: () => navigation.navigate('OrganizerVerification') },
        ]
      )
      return
    }

    setSelectedMethodType(type)
    setShowAddModal(false)

    if (type === 'bank') {
      setBankNameChoice('')
      setShowBankForm(true)
    } else {
      setShowMoncashForm(true)
    }
  }, [identityVerified, navigation])

  const handleSaveBank = useCallback(async () => {
    if (!bankForm.accountName || !bankForm.bankName || !bankForm.accountNumber) {
      Alert.alert('Missing Information', 'Please fill in all required bank details.')
      return
    }

    setSavingBank(true)
    try {
      const res = await backendFetch('/api/organizer/payout-destinations/bank', {
        method: 'POST',
        body: JSON.stringify({
          bankDetails: {
            accountHolder: bankForm.accountName.trim(),
            bankName: bankForm.bankName.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            routingNumber: bankForm.routingNumber.trim() || undefined,
            swiftCode: bankForm.swift.trim() || undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle verification requirement
        if (data?.code === 'PAYOUT_CHANGE_VERIFICATION_REQUIRED') {
          Alert.alert(
            'Security Verification Required',
            data.message || 'Please verify this change via email before continuing.',
            [{ text: 'OK' }]
          )
          setShowBankForm(false)
          return
        }
        throw new Error(data?.error || data?.message || 'Failed to add bank account')
      }

      Alert.alert(
        'Bank Account Added',
        'Your bank account has been saved. You must verify it before you can receive payouts.',
        [
          {
            text: 'Verify Now',
            onPress: () => {
              setShowBankForm(false)
              // Use the freshly-loaded list (not the stale `destinations` closure).
              loadDestinations().then((fresh) => {
                const newDest = (fresh || []).find((d) => d.id === data.destinationId)
                if (newDest) {
                  setSelectedDestination(newDest)
                  setShowVerificationModal(true)
                }
              })
            },
          },
          { text: 'Later', onPress: () => setShowBankForm(false) },
        ]
      )

      setBankForm({ accountName: '', bankName: '', accountNumber: '', routingNumber: '', swift: '' })
      await loadDestinations()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save bank account')
    } finally {
      setSavingBank(false)
    }
  }, [bankForm, loadDestinations])

  const handleSaveMoncash = useCallback(async () => {
    if (!moncashForm.accountName.trim() || !moncashForm.phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter the account holder name and phone number.')
      return
    }

    setSavingMoncash(true)
    try {
      // Mobile-money payout lives on the Haiti payout profile (method: mobile_money),
      // which is what the MonCash withdrawal flow reads.
      const res = await backendFetch('/api/organizer/payout-profiles/haiti', {
        method: 'POST',
        body: JSON.stringify({
          method: 'mobile_money',
          mobileMoneyDetails: {
            provider: moncashForm.provider,
            phoneNumber: moncashForm.phoneNumber.trim(),
            accountName: moncashForm.accountName.trim(),
          },
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to save mobile money')
      }

      Alert.alert('Mobile Money Saved', 'Your MonCash payout method has been saved.')
      setMoncashForm({ provider: 'moncash', accountName: '', phoneNumber: '' })
      setShowMoncashForm(false)
      await loadDestinations()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save mobile money')
    } finally {
      setSavingMoncash(false)
    }
  }, [moncashForm, loadDestinations])

  const pickVerificationDocument = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to upload verification documents.')
      return
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    })

    if (!res.canceled && res.assets?.[0]) {
      setVerificationAsset(res.assets[0])
    }
  }, [])

  const handleSubmitVerification = useCallback(async () => {
    if (!verificationAsset || !selectedDestination) {
      Alert.alert('Missing Document', 'Please select a document to upload.')
      return
    }

    setSubmittingVerification(true)
    try {
      const uri = verificationAsset.uri
      const name = verificationAsset.fileName || `verification-${Date.now()}.jpg`
      const type = verificationAsset.mimeType || 'image/jpeg'

      const form = new FormData()
      form.append('verificationType', verificationType)
      form.append('destinationId', selectedDestination.id)
      form.append('proofDocument', { uri, name, type } as any)

      const res = await backendFetch('/api/organizer/submit-bank-verification', {
        method: 'POST',
        body: form as any,
        headers: {},
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Failed to submit verification')
      }

      Alert.alert(
        'Verification Submitted',
        'Your verification document has been submitted and is under review. You will be notified once it is approved.'
      )

      setShowVerificationModal(false)
      setVerificationAsset(null)
      setSelectedDestination(null)
      await loadDestinations()
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit verification')
    } finally {
      setSubmittingVerification(false)
    }
  }, [verificationAsset, selectedDestination, verificationType, loadDestinations])

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader title="Payout Settings" onBack={() => navigation.goBack()} />
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={140} radius={RADIUS.xl} />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader title="Payout Settings" onBack={() => navigation.goBack()} />

      <View style={styles.tabsWrap}>
        <SegmentedTabs
          tabs={[
            { key: 'methods', label: t('organizerPayoutSettings.tabs.methods') },
            { key: 'history', label: t('organizerPayoutSettings.tabs.history') },
          ]}
          value={activeTab}
          onChange={(k) => setActiveTab(k as PayoutTab)}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />
        }
      >
        {activeTab === 'methods' && (
          <>
        {/* Identity Verification Status */}
        {!identityVerified && (
          <View style={styles.identityBlock}>
            <InfoNotice
              icon="shield-checkmark-outline"
              text="Identity verification is required before you can add payout methods and withdraw earnings. Reviewed within 48 hours."
            />
            <WhitePillCTA
              style={styles.identityCta}
              label="Verify Identity"
              onPress={() => navigation.navigate('OrganizerVerification')}
            />
          </View>
        )}

        {/* Destinations List */}
        {destinations.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No Payout Methods"
            subtitle="Add a bank account or mobile money to receive payments from your events."
            actionLabel="Add Payout Method"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payout Methods</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {destinations.map((dest) => {
              const chip = statusChip(dest.verificationStatus)
              const isBank = dest.type === 'bank'

              return (
                <View key={dest.id} style={styles.destinationCard}>
                  <View style={styles.destinationHeader}>
                    <Ionicons
                      name={isBank ? 'card-outline' : 'phone-portrait-outline'}
                      size={24}
                      color={colors.text}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.destinationTitle} numberOfLines={1}>
                        {isBank ? (dest as BankDestination).bankName : (dest as MoncashDestination).provider}
                      </Text>
                      <Text style={styles.destinationSubtitle} numberOfLines={1}>
                        {isBank ? (dest as BankDestination).accountName : (dest as MoncashDestination).accountName}
                      </Text>
                      <Text style={styles.destinationMeta}>
                        ••••{' '}
                        {isBank
                          ? (dest as BankDestination).accountNumberLast4
                          : (dest as MoncashDestination).phoneNumberLast4}
                      </Text>
                    </View>
                    <StatusChip status={chip.status} label={chip.label} />
                  </View>

                  {dest.verificationStatus !== 'verified' && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { marginTop: 12 }]}
                      onPress={() => {
                        setSelectedDestination(dest)
                        if (isBank) {
                          setShowVerificationModal(true)
                        } else {
                          // Phone verification flow for MonCash
                          Alert.alert('Coming Soon', 'MonCash verification will be added soon.')
                        }
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {dest.verificationStatus === 'pending' ? 'View Status' : 'Verify Now'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}
          </>
        )}
          </>
        )}

        {activeTab === 'history' && (
          payoutsLoading && !refreshing ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={72} radius={RADIUS.lg} />
              ))}
            </View>
          ) : payoutsError ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('organizerPayoutSettings.payoutHistory.errorTitle')}</Text>
              <Text style={styles.metaText}>{t('organizerPayoutSettings.payoutHistory.error')}</Text>
              <TouchableOpacity style={[styles.secondaryButton, { marginTop: 12 }]} onPress={loadPayouts}>
                <Text style={styles.secondaryButtonText}>{t('organizerPayoutSettings.payoutHistory.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : payouts.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t('organizerPayoutSettings.payoutHistory.emptyTitle')}
              subtitle={t('organizerPayoutSettings.payoutHistory.empty')}
            />
          ) : (
            payouts.map((p) => {
              const meta = payoutStatusMeta(p.status)
              const label = meta.labelKey
                ? t(`organizerPayoutSettings.payoutHistory.status.${meta.labelKey}`)
                : p.status
              return (
                <View key={p.id} style={styles.payoutRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <MoneyText
                      cents={p.amount}
                      currency={(p.currency as any) || 'HTG'}
                      style={styles.payoutAmount}
                    />
                    <Text style={styles.payoutMeta} numberOfLines={1}>
                      {[payoutMethodLabel(p.method), formatDate(p.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <StatusChip status={meta.tone} label={label} />
                </View>
              )
            })
          )
        )}
      </ScrollView>

      {/* Add Method Modal */}
      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Payout Method</Text>
            <Text style={styles.modalSubtitle}>Choose how you want to receive payments</Text>

            <TouchableOpacity
              style={styles.methodOption}
              onPress={() => handleAddMethodSelect('bank')}
              activeOpacity={0.7}
            >
              <Ionicons name="card-outline" size={32} color={colors.text} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.methodTitle}>Bank Account</Text>
                <Text style={styles.methodDescription}>Receive payments directly to your bank account</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodOption}
              onPress={() => handleAddMethodSelect('moncash')}
              activeOpacity={0.7}
            >
              <Ionicons name="phone-portrait-outline" size={32} color={colors.text} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.methodTitle}>MonCash / NatCash</Text>
                <Text style={styles.methodDescription}>Receive payments to your mobile money account</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 16 }]} onPress={() => setShowAddModal(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Form Modal */}
      <Modal visible={showBankForm} animationType="slide" onRequestClose={() => setShowBankForm(false)}>
        <View style={styles.container}>
          <OrganizerScreenHeader title="Add Bank Account" onBack={() => setShowBankForm(false)} />

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.accountName}
              onChangeText={(v) => setBankForm((s) => ({ ...s, accountName: v }))}
              placeholder="Full legal name"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <SelectField
              label="Bank Name *"
              value={bankNameChoice}
              options={HAITI_BANKS}
              onSelect={(v) => {
                setBankNameChoice(v)
                // A listed bank writes straight into bankForm.bankName; 'Other'
                // clears it so the revealed free-text field supplies the value.
                setBankForm((s) => ({ ...s, bankName: v === OTHER_BANK ? '' : v }))
              }}
              placeholder="Select your bank"
              sheetTitle="Select your bank"
            />
            {bankNameChoice === OTHER_BANK && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={bankForm.bankName}
                onChangeText={(v) => setBankForm((s) => ({ ...s, bankName: v }))}
                placeholder="Enter your bank name"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
              />
            )}

            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.accountNumber}
              onChangeText={(v) => setBankForm((s) => ({ ...s, accountNumber: v }))}
              placeholder="Account number"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Routing Number (optional)</Text>
            <TextInput
              style={styles.input}
              value={bankForm.routingNumber}
              onChangeText={(v) => setBankForm((s) => ({ ...s, routingNumber: v }))}
              placeholder="Routing number"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <Text style={styles.label}>SWIFT Code (optional)</Text>
            <TextInput
              style={styles.input}
              value={bankForm.swift}
              onChangeText={(v) => setBankForm((s) => ({ ...s, swift: v }))}
              placeholder="SWIFT code"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              autoCapitalize="characters"
            />

            <WhitePillCTA
              style={{ marginTop: 24 }}
              label="Save Bank Account"
              onPress={handleSaveBank}
              loading={savingBank}
              disabled={savingBank}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* MonCash Form Modal */}
      <Modal visible={showMoncashForm} animationType="slide" onRequestClose={() => setShowMoncashForm(false)}>
        <View style={styles.container}>
          <OrganizerScreenHeader title="Add Mobile Money" onBack={() => setShowMoncashForm(false)} />

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <Text style={styles.label}>Provider</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, moncashForm.provider === 'moncash' && styles.chipActive]}
                onPress={() => setMoncashForm((s) => ({ ...s, provider: 'moncash' }))}
              >
                <Text style={[styles.chipText, moncashForm.provider === 'moncash' && styles.chipTextActive]}>
                  MonCash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, moncashForm.provider === 'natcash' && styles.chipActive]}
                onPress={() => setMoncashForm((s) => ({ ...s, provider: 'natcash' }))}
              >
                <Text style={[styles.chipText, moncashForm.provider === 'natcash' && styles.chipTextActive]}>
                  NatCash
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Account Name *</Text>
            <TextInput
              style={styles.input}
              value={moncashForm.accountName}
              onChangeText={(v) => setMoncashForm((s) => ({ ...s, accountName: v }))}
              placeholder="Full legal name"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={moncashForm.phoneNumber}
              onChangeText={(v) => setMoncashForm((s) => ({ ...s, phoneNumber: v }))}
              placeholder="+509..."
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
              keyboardType="phone-pad"
            />

            <WhitePillCTA
              style={{ marginTop: 24 }}
              label="Save Mobile Money"
              onPress={handleSaveMoncash}
              loading={savingMoncash}
              disabled={savingMoncash}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Bank Verification Modal */}
      <Modal
        visible={showVerificationModal}
        animationType="slide"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.container}>
          <OrganizerScreenHeader title="Verify Bank Account" onBack={() => setShowVerificationModal(false)} />

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verification Required</Text>
              <Text style={styles.metaText}>
                To receive payouts to this account, upload a document that shows:
              </Text>
              <View style={{ marginTop: 8 }}>
                <Text style={styles.bulletPoint}>• Your account number</Text>
                <Text style={styles.bulletPoint}>• Your name (matching your organizer profile)</Text>
                <Text style={styles.bulletPoint}>• Your bank name</Text>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Document Type</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, verificationType === 'bank_statement' && styles.chipActive]}
                onPress={() => setVerificationType('bank_statement')}
              >
                <Text style={[styles.chipText, verificationType === 'bank_statement' && styles.chipTextActive]}>
                  Bank Statement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, verificationType === 'void_check' && styles.chipActive]}
                onPress={() => setVerificationType('void_check')}
              >
                <Text style={[styles.chipText, verificationType === 'void_check' && styles.chipTextActive]}>
                  Void Check
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, verificationType === 'utility_bill' && styles.chipActive]}
                onPress={() => setVerificationType('utility_bill')}
              >
                <Text style={[styles.chipText, verificationType === 'utility_bill' && styles.chipTextActive]}>
                  Utility Bill
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 16 }]}
              onPress={pickVerificationDocument}
            >
              <Ionicons name="document-attach-outline" size={20} color={colors.text} />
              <Text style={styles.secondaryButtonText}>
                {verificationAsset ? 'Change Document' : 'Choose Document'}
              </Text>
            </TouchableOpacity>

            {verificationAsset && (
              <View style={[styles.card, { marginTop: 12, backgroundColor: `${colors.success}10` }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.metaText, { marginLeft: 10, color: colors.success }]}>
                  Document selected: {verificationAsset.fileName || 'Image'}
                </Text>
              </View>
            )}

            <WhitePillCTA
              style={{ marginTop: 24 }}
              label="Submit for Review"
              onPress={handleSubmitVerification}
              loading={submittingVerification}
              disabled={submittingVerification || !verificationAsset}
            />

            <Text style={[styles.metaHint, { marginTop: 16, textAlign: 'center' }]}>
              Your document will be reviewed by our team within 1-2 business days. You'll receive a notification once
              it's approved.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  identityBlock: {
    marginBottom: 12,
  },
  identityCta: {
    marginTop: 12,
  },
  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    paddingTop: 4,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payoutAmount: {
    fontSize: 17,
  },
  payoutMeta: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metaText: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },
  metaHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  bulletPoint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  addButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  destinationCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  destinationSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  destinationMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS['2xl'],
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surfaceRaised,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  methodDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.textSecondary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: colors.text,
  },
})
