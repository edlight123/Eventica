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
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'

import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase'
import { backendJson } from '../../lib/api/backend'
import { useI18n } from '../../contexts/I18nContext'
import { SPACING, RADIUS } from '../../config/brand'
import { Skeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { Users, Mail } from 'lucide-react-native'
import { useAuth } from '../../contexts/AuthContext'
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader'
import StaffEventCard from '../../components/organizer/StaffEventCard'
import StatusChip from '../../components/StatusChip'
import WhitePillCTA from '../../components/WhitePillCTA'
import { SecondaryPill } from '../../components/auth/SecondaryPill'

type RouteParams = {
  OrganizerEventStaff: {
    eventId: string
  }
}

type InviteMethod = 'link' | 'email' | 'phone'

type ApiInvite = {
  id: string
  method: InviteMethod
  targetEmail: string | null
  targetPhone: string | null
  expiresAt: string | null
  revokedAt: string | null
  usedAt: string | null
  usedBy: string | null
  createdAt: string | null
}

type ApiMember = {
  id: string
  role: string
  permissions: { checkin?: boolean; viewAttendees?: boolean }
  createdAt: string | null
  profile: { email: string | null; full_name: string | null }
}

export default function OrganizerEventStaffScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<RouteProp<RouteParams, 'OrganizerEventStaff'>>()
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { eventId } = route.params

  const { t } = useI18n()
  const { loading: authLoading, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [invites, setInvites] = useState<ApiInvite[]>([])
  const [members, setMembers] = useState<ApiMember[]>([])

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [method, setMethod] = useState<InviteMethod>('link')
  const [targetEmail, setTargetEmail] = useState('')
  const [targetPhone, setTargetPhone] = useState('')
  const [viewAttendees, setViewAttendees] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Single header only: use the in-body OrganizerScreenHeader (serif) and hide
  // the native navigation header to avoid a duplicate title bar.
  useEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  const tsToIso = (value: any): string | null => {
    if (!value) return null
    try {
      if (typeof value === 'string') return value
      if (typeof value?.toDate === 'function') return value.toDate().toISOString()
      if (value instanceof Date) return value.toISOString()
    } catch {
      // ignore
    }
    return null
  }

  const safeGetDocs = async (q: any, fallbackCol: any) => {
    try {
      return await getDocs(q)
    } catch {
      return await getDocs(fallbackCol)
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const invitesCol = collection(db, 'events', eventId, 'invites')
      const membersCol = collection(db, 'events', eventId, 'members')

      const [invitesSnap, membersSnap] = await Promise.all([
        safeGetDocs(query(invitesCol, orderBy('createdAt', 'desc')), invitesCol),
        safeGetDocs(query(membersCol, orderBy('createdAt', 'desc')), membersCol),
      ])

      const nextInvites: ApiInvite[] = invitesSnap.docs.map((d) => {
        const data = d.data() as any
        const rawMethod = String(data?.method || 'link')
        const method: InviteMethod = rawMethod === 'email' ? 'email' : rawMethod === 'phone' ? 'phone' : 'link'

        return {
          id: d.id,
          method,
          targetEmail: data?.targetEmail ? String(data.targetEmail) : null,
          targetPhone: data?.targetPhone ? String(data.targetPhone) : null,
          expiresAt: tsToIso(data?.expiresAt),
          revokedAt: tsToIso(data?.revokedAt),
          usedAt: tsToIso(data?.usedAt),
          usedBy: data?.usedBy ? String(data.usedBy) : null,
          createdAt: tsToIso(data?.createdAt),
        }
      })

      const memberDocs = membersSnap.docs
      const profileSnaps = await Promise.all(
        memberDocs.map((d) => getDoc(doc(db, 'users', d.id)))
      )

      const profileById: Record<string, { email: string | null; full_name: string | null }> = {}
      profileSnaps.forEach((snap) => {
        if (!snap.exists()) return
        const data = snap.data() as any
        profileById[snap.id] = {
          email: data?.email ? String(data.email) : null,
          full_name: data?.full_name ? String(data.full_name) : null,
        }
      })

      const nextMembers: ApiMember[] = memberDocs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          role: String(data?.role || 'staff'),
          permissions: (data?.permissions && typeof data.permissions === 'object' ? data.permissions : {}) as any,
          createdAt: tsToIso(data?.createdAt),
          profile: profileById[d.id] || { email: null, full_name: null },
        }
      })

      setInvites(nextInvites)
      setMembers(nextMembers)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('organizerStaff.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [eventId, t])

  useEffect(() => {
    refresh()
  }, [refresh])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const canSubmit = useMemo(() => {
    if (method === 'email') return Boolean(targetEmail.trim())
    if (method === 'phone') return Boolean(targetPhone.trim())
    return true
  }, [method, targetEmail, targetPhone])

  const createInvite = async () => {
    if (authLoading || !user) return
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const res = await backendJson<{ inviteUrl?: string }>(`/api/staff/invites/create`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          method,
          ...(method === 'email' ? { targetEmail: targetEmail.trim() } : {}),
          ...(method === 'phone' ? { targetPhone: targetPhone.trim() } : {}),
          permissions: { viewAttendees },
        }),
      })

      setShowInviteModal(false)
      setTargetEmail('')
      setTargetPhone('')
      setViewAttendees(false)
      setMethod('link')

      if (res?.inviteUrl) {
        Alert.alert(t('organizerStaff.inviteCreatedTitle'), res.inviteUrl)
      } else {
        Alert.alert(t('organizerStaff.inviteCreatedTitle'), t('organizerStaff.inviteCreatedBody'))
      }

      refresh()
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('organizerStaff.errors.inviteFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    if (authLoading || !user) return
    Alert.alert(t('organizerStaff.revoke.title'), t('organizerStaff.revoke.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('organizerStaff.revoke.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await backendJson(`/api/staff/invites/revoke`, {
              method: 'POST',
              body: JSON.stringify({ eventId, inviteId }),
            })
            refresh()
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('organizerStaff.errors.revokeFailed'))
          }
        },
      },
    ])
  }

  const removeMember = async (memberId: string) => {
    if (authLoading || !user) return
    Alert.alert(t('organizerStaff.removeMember.title'), t('organizerStaff.removeMember.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('organizerStaff.removeMember.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await backendJson(`/api/staff/members/remove`, {
              method: 'POST',
              body: JSON.stringify({ eventId, memberId }),
            })
            refresh()
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('organizerStaff.errors.removeFailed'))
          }
        },
      },
    ])
  }

  const renderInviteStatus = (invite: ApiInvite) => {
    if (invite.revokedAt) return t('organizerStaff.inviteStatus.revoked')
    if (invite.usedAt) return t('organizerStaff.inviteStatus.used')
    return t('organizerStaff.inviteStatus.active')
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader
          title={t('organizerStaff.headerTitle')}
          right={<Skeleton width={96} height={36} radius={RADIUS.md} />}
        />
        <View style={styles.content}>
          <Skeleton width={120} height={18} radius={6} style={{ marginTop: 4, marginBottom: 10 }} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={64} radius={RADIUS.lg} style={{ marginBottom: 10 }} />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader
        title={t('organizerStaff.headerTitle')}
        right={
          <TouchableOpacity
            style={[styles.inviteButton, authLoading ? styles.buttonDisabled : null]}
            onPress={() => setShowInviteModal(true)}
            disabled={authLoading}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={styles.inviteButtonText}>{t('organizerStaff.inviteButton')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('organizerStaff.membersTitle')}</Text>
          {members.length === 0 ? (
            <EmptyState icon={Users} title={t('organizerStaff.emptyMembers')} compact />
          ) : (
            members.map((m) => {
              const name = m.profile?.full_name || m.profile?.email || m.id
              const detail = m.profile?.email || ''

              return (
                <View key={m.id} style={styles.cardWrap}>
                  <StaffEventCard
                    title={name}
                    subtitle={detail || undefined}
                    right={
                      <TouchableOpacity
                        onPress={() => removeMember(m.id)}
                        style={[styles.dangerButton, authLoading ? styles.buttonDisabled : null]}
                        disabled={authLoading}
                      >
                        <Text style={styles.dangerButtonText}>{t('organizerStaff.remove')}</Text>
                      </TouchableOpacity>
                    }
                  />
                </View>
              )
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('organizerStaff.invitesTitle')}</Text>
          {invites.length === 0 ? (
            <EmptyState icon={Mail} title={t('organizerStaff.emptyInvites')} compact />
          ) : (
            invites.map((inv) => {
              const target = inv.method === 'email' ? inv.targetEmail : inv.method === 'phone' ? inv.targetPhone : null
              const label = target || t('organizerStaff.linkInvite')
              const statusKey = inv.revokedAt ? 'error' : inv.usedAt ? 'neutral' : 'live'

              return (
                <View key={inv.id} style={styles.cardWrap}>
                  <StaffEventCard
                    title={label}
                    right={
                      <View style={styles.inviteRight}>
                        <StatusChip status={statusKey} label={renderInviteStatus(inv)} />
                        {!inv.revokedAt && !inv.usedAt ? (
                          <TouchableOpacity
                            onPress={() => revokeInvite(inv.id)}
                            style={[styles.dangerButton, authLoading ? styles.buttonDisabled : null]}
                            disabled={authLoading}
                          >
                            <Text style={styles.dangerButtonText}>{t('organizerStaff.revokeShort')}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    }
                  />
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={showInviteModal} animationType="slide" transparent onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('organizerStaff.createInviteTitle')}</Text>
              <TouchableOpacity
                onPress={() => setShowInviteModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('organizerStaff.methodLabel')}</Text>
            <View style={styles.methodRow}>
              {(['link', 'email', 'phone'] as InviteMethod[]).map((m) => {
                const active = m === method
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodPill, active ? styles.methodPillActive : null]}
                    onPress={() => setMethod(m)}
                  >
                    <Text style={[styles.methodText, active ? styles.methodTextActive : null]}>
                      {t(`organizerStaff.methods.${m}` as any)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {method === 'email' ? (
              <>
                <Text style={styles.label}>{t('organizerStaff.emailLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={targetEmail}
                  onChangeText={setTargetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={t('organizerStaff.emailPlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  selectionColor={colors.primary}
                />
              </>
            ) : null}

            {method === 'phone' ? (
              <>
                <Text style={styles.label}>{t('organizerStaff.phoneLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={targetPhone}
                  onChangeText={setTargetPhone}
                  keyboardType="phone-pad"
                  placeholder={t('organizerStaff.phonePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                  selectionColor={colors.primary}
                />
              </>
            ) : null}

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setViewAttendees((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={viewAttendees ? 'checkbox' : 'square-outline'}
                size={22}
                color={viewAttendees ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.checkboxText}>{t('organizerStaff.viewAttendees')}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <WhitePillCTA
                label={t('organizerStaff.create')}
                onPress={createInvite}
                disabled={!canSubmit || submitting || authLoading}
                loading={submitting}
              />
              <SecondaryPill label={t('common.cancel')} onPress={() => setShowInviteModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },

  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  inviteButtonText: { color: colors.text, fontWeight: '700' },

  buttonDisabled: { opacity: 0.6 },

  section: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },

  cardWrap: { marginBottom: SPACING.md },
  inviteRight: { alignItems: 'flex-end', gap: 8 },

  dangerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: colors.errorLight,
  },
  dangerButtonText: { color: colors.error, fontWeight: '700', fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  label: { marginTop: 12, marginBottom: 6, fontWeight: '700', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
  },

  methodRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  methodPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  methodPillActive: { borderColor: colors.primary, backgroundColor: colors.infoLight },
  methodText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  methodTextActive: { color: colors.primary },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkboxText: { color: colors.text, fontWeight: '600' },

  modalActions: { gap: 10, marginTop: 16 },
})
