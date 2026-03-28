import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import { collection, getDocs } from 'firebase/firestore'

import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendFetch, backendJson } from '../../lib/api/backend'
import { getVerificationRequest } from '../../lib/verification'

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

  const statusPill = useCallback((status?: VerificationStatus) => {
    if (status === 'verified') {
      return { backgroundColor: `${colors.success}20`, textColor: colors.success, label: 'Verified', icon: 'checkmark-circle' }
    }
    if (status === 'pending') {
      return { backgroundColor: `${colors.primary}20`, textColor: colors.primary, label: 'Under Review', icon: 'time' }
    }
    if (status === 'failed') {
      return { backgroundColor: `${colors.error}20`, textColor: colors.error, label: 'Needs Attention', icon: 'alert-circle' }
    }
    return { backgroundColor: `${colors.textSecondary}20`, textColor: colors.textSecondary, label: 'Not Verified', icon: 'close-circle' }
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payout settings...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Identity Verification Status */}
        {!identityVerified && (
          <View style={[styles.card, { backgroundColor: `${colors.primary}10` }]}>
            <View style={styles.row}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>Identity Verification Required</Text>
                <Text style={styles.metaText}>Complete identity verification to add payout methods.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={() => navigation.navigate('OrganizerVerification')}
            >
              <Text style={styles.primaryButtonText}>Verify Identity</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Destinations List */}
        {destinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Payout Methods</Text>
            <Text style={styles.emptyText}>
              Add a bank account or mobile money to receive payments from your events.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Add Payout Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payout Methods</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {destinations.map((dest) => {
              const pill = statusPill(dest.verificationStatus)
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
                      <Text style={styles.destinationTitle}>
                        {isBank ? (dest as BankDestination).bankName : (dest as MoncashDestination).provider}
                      </Text>
                      <Text style={styles.destinationSubtitle}>
                        {isBank ? (dest as BankDestination).accountName : (dest as MoncashDestination).accountName}
                      </Text>
                      <Text style={styles.destinationMeta}>
                        ••••{' '}
                        {isBank
                          ? (dest as BankDestination).accountNumberLast4
                          : (dest as MoncashDestination).phoneNumberLast4}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: pill.backgroundColor }]}>
                      <Ionicons name={pill.icon as any} size={14} color={pill.textColor} />
                      <Text style={[styles.statusPillText, { color: pill.textColor }]}>{pill.label}</Text>
                    </View>
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
              <Ionicons name="card-outline" size={32} color={colors.primary} />
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
              <Ionicons name="phone-portrait-outline" size={32} color={colors.primary} />
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
            <TouchableOpacity onPress={() => setShowBankForm(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Bank Account</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.accountName}
              onChangeText={(v) => setBankForm((s) => ({ ...s, accountName: v }))}
              placeholder="Full legal name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.bankName}
              onChangeText={(v) => setBankForm((s) => ({ ...s, bankName: v }))}
              placeholder="Your bank name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              value={bankForm.accountNumber}
              onChangeText={(v) => setBankForm((s) => ({ ...s, accountNumber: v }))}
              placeholder="Account number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Routing Number (optional)</Text>
            <TextInput
              style={styles.input}
              value={bankForm.routingNumber}
              onChangeText={(v) => setBankForm((s) => ({ ...s, routingNumber: v }))}
              placeholder="Routing number"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>SWIFT Code (optional)</Text>
            <TextInput
              style={styles.input}
              value={bankForm.swift}
              onChangeText={(v) => setBankForm((s) => ({ ...s, swift: v }))}
              placeholder="SWIFT code"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 24 }, savingBank && styles.primaryButtonDisabled]}
              onPress={handleSaveBank}
              disabled={savingBank}
            >
              {savingBank ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Bank Account</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MonCash Form Modal */}
      <Modal visible={showMoncashForm} animationType="slide" onRequestClose={() => setShowMoncashForm(false)}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowMoncashForm(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Mobile Money</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
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
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={moncashForm.phoneNumber}
              onChangeText={(v) => setMoncashForm((s) => ({ ...s, phoneNumber: v }))}
              placeholder="+509..."
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 24 }, savingMoncash && styles.primaryButtonDisabled]}
              onPress={handleSaveMoncash}
              disabled={savingMoncash}
            >
              {savingMoncash ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Save Mobile Money</Text>
              )}
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => setShowVerificationModal(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify Bank Account</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={[styles.card, { backgroundColor: `${colors.primary}10` }]}>
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

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { marginTop: 24 },
                (submittingVerification || !verificationAsset) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmitVerification}
              disabled={submittingVerification || !verificationAsset}
            >
              {submittingVerification ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Submit for Review</Text>
              )}
            </TouchableOpacity>

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    marginTop: 8,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
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
    backgroundColor: `${colors.primary}15`,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  destinationCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.borderLight,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 12,
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: colors.white,
  },
})
