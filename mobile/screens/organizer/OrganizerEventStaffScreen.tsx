import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
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
import InfoNotice from '../../components/organizer/InfoNotice'
import SegmentedTabs from '../../components/organizer/SegmentedTabs'
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

  const openInviteModal = () => {
    setTargetEmail('')
    setTargetPhone('')
    setViewAttendees(false)
    setMethod('link')
    setShowInviteModal(true)
  }

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

  // Presentational: map an invite to a semantic StatusChip status + label.
  //   revoked → error · used → neutral · email/phone awaiting acceptance →
  //   pending (action needed) · link ready to share → live/active.
  const inviteState = (invite: ApiInvite): { key: string; label: string } => {
    if (invite.revokedAt) return { key: 'error', label: t('organizerStaff.inviteStatus.revoked') }
    if (invite.usedAt) return { key: 'neutral', label: t('organizerStaff.inviteStatus.used') }
    if (invite.method === 'email' || invite.method === 'phone') {
      return { key: 'pending', label: t('organizerStaff.inviteStatus.pending') }
    }
    return { key: 'live', label: t('organizerStaff.inviteStatus.active') }
  }

  const inviteButton = (
    <TouchableOpacity
      style={[styles.inviteButton, authLoading ? styles.buttonDisabled : null]}
      onPress={openInviteModal}
      disabled={authLoading}
      accessibilityRole="button"
      accessibilityLabel={t('organizerStaff.inviteButton')}
    >
      <Ionicons name="add" size={18} color={colors.text} />
      <Text style={styles.inviteButtonText}>{t('organizerStaff.inviteButton')}</Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader
          title={t('organizerStaff.headerTitle')}
          right={<Skeleton width={96} height={36} radius={RADIUS.md} />}
        />
        <View style={styles.content}>
          <Skeleton width="100%" height={56} radius={RADIUS.md} style={{ marginBottom: 20 }} />
          {[0, 1].map((section) => (
            <View key={section} style={{ marginBottom: 12 }}>
              <Skeleton width={140} height={18} radius={6} style={{ marginBottom: 12 }} />
              {[0, 1].map((i) => (
                <Skeleton key={i} width="100%" height={72} radius={RADIUS.lg} style={{ marginBottom: 12 }} />
              ))}
            </View>
          ))}
        </View>
      </View>
    )
  }

  const isEmpty = members.length === 0 && invites.length === 0

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader title={t('organizerStaff.headerTitle')} right={inviteButton} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <View style={styles.notice}>
          <InfoNotice icon="people-outline" text={t('organizerStaff.staffInfo')} />
        </View>

        {isEmpty ? (
          <EmptyState
            icon={Users}
            title={t('organizerStaff.emptyAllTitle')}
            subtitle={t('organizerStaff.emptyAllSubtitle')}
            actionLabel={t('organizerStaff.inviteButton')}
            onAction={openInviteModal}
          />
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('organizerStaff.membersTitle')}</Text>
                {members.length > 0 ? <Text style={styles.sectionCount}>{members.length}</Text> : null}
              </View>
              {members.length === 0 ? (
                <EmptyState icon={Users} title={t('organizerStaff.emptyMembers')} compact />
              ) : (
                members.map((m) => {
                  const name = m.profile?.full_name || m.profile?.email || m.id
                  const email = m.profile?.email || ''
                  const subtitle = email && email !== name ? email : undefined
                  const permission = m.permissions?.viewAttendees
                    ? t('organizerStaff.memberPermissionFull')
                    : t('organizerStaff.memberPermissionBasic')

                  return (
                    <View key={m.id} style={styles.cardWrap}>
                      <StaffEventCard
                        title={name}
                        subtitle={subtitle}
                        meta={permission}
                        right={
                          <View style={styles.rightCol}>
                            <StatusChip status="live" label={t('organizerStaff.inviteStatus.active')} />
                            <TouchableOpacity
                              onPress={() => removeMember(m.id)}
                              style={[styles.dangerButton, authLoading ? styles.buttonDisabled : null]}
                              disabled={authLoading}
                              accessibilityRole="button"
                              accessibilityLabel={t('organizerStaff.remove')}
                            >
                              <Text style={styles.dangerButtonText}>{t('organizerStaff.remove')}</Text>
                            </TouchableOpacity>
                          </View>
                        }
                      />
                    </View>
                  )
                })
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('organizerStaff.invitesTitle')}</Text>
                {invites.length > 0 ? <Text style={styles.sectionCount}>{invites.length}</Text> : null}
              </View>
              {invites.length === 0 ? (
                <EmptyState icon={Mail} title={t('organizerStaff.emptyInvites')} compact />
              ) : (
                invites.map((inv) => {
                  const target = inv.method === 'email' ? inv.targetEmail : inv.method === 'phone' ? inv.targetPhone : null
                  const label = target || t('organizerStaff.linkInvite')
                  const state = inviteState(inv)
                  const canRevoke = !inv.revokedAt && !inv.usedAt

                  return (
                    <View key={inv.id} style={styles.cardWrap}>
                      <StaffEventCard
                        title={label}
                        meta={t(`organizerStaff.methods.${inv.method}` as any)}
                        right={
                          <View style={styles.rightCol}>
                            <StatusChip status={state.key} label={state.label} />
                            {canRevoke ? (
                              <TouchableOpacity
                                onPress={() => revokeInvite(inv.id)}
                                style={[styles.dangerButton, authLoading ? styles.buttonDisabled : null]}
                                disabled={authLoading}
                                accessibilityRole="button"
                                accessibilityLabel={t('organizerStaff.revokeShort')}
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
          </>
        )}
      </ScrollView>

      <Modal visible={showInviteModal} animationType="slide" transparent onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('organizerStaff.createInviteTitle')}</Text>
              <TouchableOpacity
                onPress={() => setShowInviteModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('organizerStaff.methodLabel')}</Text>
            <View style={styles.methodTabs}>
              <SegmentedTabs
                tabs={(['link', 'email', 'phone'] as InviteMethod[]).map((m) => ({
                  key: m,
                  label: t(`organizerStaff.methods.${m}` as any),
                }))}
                value={method}
                onChange={(key: string) => setMethod(key as InviteMethod)}
              />
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

            <View style={styles.toggleCard}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>{t('organizerStaff.viewAttendees')}</Text>
                <Text style={styles.toggleHelp}>{t('organizerStaff.viewAttendeesHelp')}</Text>
              </View>
              <Switch
                value={viewAttendees}
                onValueChange={setViewAttendees}
                trackColor={{ false: colors.border, true: colors.text }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.border}
              />
            </View>

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

  notice: { marginBottom: 4 },

  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    minWidth: 22,
    textAlign: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },

  cardWrap: { marginBottom: SPACING.md },
  rightCol: { alignItems: 'flex-end', gap: 8 },

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

  // SegmentedTabs pads itself horizontally; pull it back to the card edge.
  methodTabs: { marginHorizontal: -16, marginTop: 2 },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  toggleText: { flex: 1 },
  toggleTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  toggleHelp: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },

  modalActions: { gap: 10, marginTop: 16 },
})
