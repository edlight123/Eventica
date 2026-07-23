import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
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
import { backendFetch } from '../../lib/api/backend'
import { getVerificationRequest } from '../../lib/verification'
import { RADIUS } from '../../config/brand'
import { Skeleton } from '../../components/Skeleton'
import StatusChip from '../../components/StatusChip'
import EmptyState from '../../components/EmptyState'
import WhitePillCTA from '../../components/WhitePillCTA'
import InfoNotice from '../../components/organizer/InfoNotice'
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader'
import { Wallet } from 'lucide-react-native'

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

export default function OrganizerPayoutSettingsScreenV2() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [destinations, setDestinations] = useState<PayoutDestination[]>([])
  const [identityVerified, setIdentityVerified] = useState(false)

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
        setDestinations((data?.destinations || []) as BankDestination[])
      }

      // TODO: Load MonCash destinations once backend endpoint exists
      // For now we can read from Firestore verificationDocuments/phone if needed

    } catch (e) {
      console.error('Failed to load destinations:', e)
    }
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
              loadDestinations().then(() => {
                const newDest = destinations.find((d) => d.id === data.destinationId)
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
  }, [bankForm, destinations, loadDestinations])

  const handleSaveMoncash = useCallback(async () => {
    // TODO: Implement MonCash destination save once backend endpoint exists
    Alert.alert('Coming Soon', 'MonCash support will be added soon.')
    setShowMoncashForm(false)
  }, [])

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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowBankForm(false)} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Bank Account</Text>
            <View style={{ width: 40 }} />
          </View>

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

            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.bankName}
              onChangeText={(v) => setBankForm((s) => ({ ...s, bankName: v }))}
              placeholder="Your bank name"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowMoncashForm(false)} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Mobile Money</Text>
            <View style={{ width: 40 }} />
          </View>

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowVerificationModal(false)} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify Bank Account</Text>
            <View style={{ width: 40 }} />
          </View>

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
