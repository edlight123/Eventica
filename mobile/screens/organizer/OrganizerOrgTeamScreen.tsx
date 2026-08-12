import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAppAlert } from '../../components/AppAlert'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Users, ClipboardList } from 'lucide-react-native'

import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useI18n } from '../../contexts/I18nContext'
import { backendJson } from '../../lib/api/backend'
import { SPACING, RADIUS } from '../../config/brand'
import { Skeleton } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader'
import { useOverlayHeaderInset } from '../../components/OverlayHeader'
import StaffEventCard from '../../components/organizer/StaffEventCard'
import StatusChip from '../../components/StatusChip'
import InfoNotice from '../../components/organizer/InfoNotice'
import SegmentedTabs from '../../components/organizer/SegmentedTabs'
import SelectField from '../../components/organizer/SelectField'
import WhitePillCTA from '../../components/WhitePillCTA'
import { SecondaryPill } from '../../components/auth/SecondaryPill'

type TeamRole = 'admin' | 'manager' | 'staff'
type MemberStatus = 'active' | 'invited'
type TaskStatus = 'todo' | 'in_progress' | 'done'

type TeamMember = {
  id: string
  uid?: string | null
  email: string
  name?: string | null
  role: TeamRole
  status: MemberStatus
  joined_at?: string | null
}

type OrgTask = {
  id: string
  title: string
  notes?: string | null
  assignee_id?: string | null
  assignee_name?: string | null
  status: TaskStatus
  due?: string | null
  created_at?: string | null
}

const ROLE_KEYS: TeamRole[] = ['admin', 'manager', 'staff']
const TASK_STATUS_KEYS: TaskStatus[] = ['todo', 'in_progress', 'done']

// Role → semantic StatusChip status (never a teal fill; see StatusChip map):
//   admin → live · manager → pending · staff → neutral.
const roleChipStatus = (role: TeamRole): string =>
  role === 'admin' ? 'live' : role === 'manager' ? 'pending' : 'neutral'

// Task status → semantic StatusChip status:
//   todo → neutral · in_progress → pending · done → success.
const taskChipStatus = (status: TaskStatus): string =>
  status === 'done' ? 'success' : status === 'in_progress' ? 'pending' : 'neutral'

export default function OrganizerOrgTeamScreen() {
  const { colors } = useTheme()
  const styles = getStyles(colors)
  const navigation = useNavigation<any>()
  const insets = useSafeAreaInsets()
  const { height: headerH, onHeight } = useOverlayHeaderInset()
  const { t } = useI18n()
  const showAlert = useAppAlert();
  const { user, userProfile } = useAuth()

  const [tab, setTab] = useState<'team' | 'tasks'>('team')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<OrgTask[]>([])

  // Add-member form state.
  const [showAddMember, setShowAddMember] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<TeamRole>('staff')

  // Member-actions sheet state.
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null)

  // New-task form state.
  const [showNewTask, setShowNewTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('')
  const [taskDue, setTaskDue] = useState('')

  // Task-actions sheet state.
  const [activeTask, setActiveTask] = useState<OrgTask | null>(null)

  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [teamRes, tasksRes] = await Promise.all([
        backendJson<{ members: TeamMember[] }>(`/api/organizer/team`),
        backendJson<{ tasks: OrgTask[] }>(`/api/organizer/tasks`),
      ])
      setMembers(Array.isArray(teamRes?.members) ? teamRes.members : [])
      setTasks(Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [])
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || t('organizerOrgTeam.errors.loadFailed'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    refresh()
  }, [refresh])

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh])
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    refresh()
  }, [refresh])

  const roleLabel = useCallback((role: TeamRole) => t(`organizerOrgTeam.roles.${role}` as any), [t])
  const taskStatusLabel = useCallback(
    (status: TaskStatus) =>
      t(`organizerOrgTeam.status.${status === 'in_progress' ? 'inProgress' : status}` as any),
    [t]
  )

  const roleFromLabel = useCallback(
    (label: string): TeamRole => ROLE_KEYS.find((k) => roleLabel(k) === label) || 'staff',
    [roleLabel]
  )

  const memberDisplay = useCallback(
    (m: TeamMember) => (m.name && m.name.trim()) || m.email || m.id,
    []
  )

  // The current signed-in user's own row is not editable.
  const currentEmail = (userProfile?.email || user?.email || '').toLowerCase()
  const isSelf = useCallback(
    (m: TeamMember) =>
      Boolean(currentEmail) &&
      (m.email?.toLowerCase() === currentEmail || (!!m.uid && m.uid === user?.uid)),
    [currentEmail, user?.uid]
  )

  const openAddMember = () => {
    setNewEmail('')
    setNewName('')
    setNewRole('staff')
    setShowAddMember(true)
  }

  const submitAddMember = async () => {
    const email = newEmail.trim()
    if (!email) return
    setSubmitting(true)
    try {
      await backendJson(`/api/organizer/team`, {
        method: 'POST',
        body: JSON.stringify({ email, name: newName.trim() || undefined, role: newRole }),
      })
      setShowAddMember(false)
      await refresh()
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || t('organizerOrgTeam.errors.addMemberFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const changeMemberRole = async (member: TeamMember, role: TeamRole) => {
    if (role === member.role) return
    setSubmitting(true)
    try {
      await backendJson(`/api/organizer/team`, {
        method: 'PATCH',
        body: JSON.stringify({ memberId: member.id, role }),
      })
      setActiveMember((prev) => (prev && prev.id === member.id ? { ...prev, role } : prev))
      await refresh()
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || t('organizerOrgTeam.errors.updateMemberFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const removeMember = (member: TeamMember) => {
    showAlert(
      t('organizerOrgTeam.removeMember'),
      t('organizerOrgTeam.removeMemberConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await backendJson(`/api/organizer/team?memberId=${encodeURIComponent(member.id)}`, {
                method: 'DELETE',
              })
              setActiveMember(null)
              await refresh()
            } catch (e: any) {
              showAlert(
                t('common.error'),
                e?.message || t('organizerOrgTeam.errors.removeMemberFailed')
              )
            }
          },
        },
      ]
    )
  }

  const openNewTask = () => {
    setTaskTitle('')
    setTaskNotes('')
    setTaskAssigneeId('')
    setTaskDue('')
    setShowNewTask(true)
  }

  const submitNewTask = async () => {
    const title = taskTitle.trim()
    if (!title) return
    const assignee = members.find((m) => m.id === taskAssigneeId)
    setSubmitting(true)
    try {
      await backendJson(`/api/organizer/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          notes: taskNotes.trim() || undefined,
          assignee_id: assignee?.id || undefined,
          assignee_name: assignee ? memberDisplay(assignee) : undefined,
          due: taskDue.trim() || undefined,
          status: 'todo',
        }),
      })
      setShowNewTask(false)
      await refresh()
    } catch (e: any) {
      showAlert(t('common.error'), e?.message || t('organizerOrgTeam.errors.addTaskFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const changeTaskStatus = async (task: OrgTask, status: TaskStatus) => {
    if (status === task.status) return
    // Optimistic: the status flip is trivial to revert on failure.
    const previous = task.status
    setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, status } : x)))
    setActiveTask((prev) => (prev && prev.id === task.id ? { ...prev, status } : prev))
    try {
      await backendJson(`/api/organizer/tasks`, {
        method: 'PATCH',
        body: JSON.stringify({ taskId: task.id, status }),
      })
    } catch (e: any) {
      setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, status: previous } : x)))
      setActiveTask((prev) => (prev && prev.id === task.id ? { ...prev, status: previous } : prev))
      showAlert(t('common.error'), e?.message || t('organizerOrgTeam.errors.updateTaskFailed'))
    }
  }

  const removeTask = (task: OrgTask) => {
    showAlert(t('organizerOrgTeam.removeTask'), t('organizerOrgTeam.removeTaskConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await backendJson(`/api/organizer/tasks?taskId=${encodeURIComponent(task.id)}`, {
              method: 'DELETE',
            })
            setActiveTask(null)
            await refresh()
          } catch (e: any) {
            showAlert(
              t('common.error'),
              e?.message || t('organizerOrgTeam.errors.removeTaskFailed')
            )
          }
        },
      },
    ])
  }

  const addButton = (
    <TouchableOpacity
      style={styles.addButton}
      onPress={tab === 'team' ? openAddMember : openNewTask}
      accessibilityRole="button"
      accessibilityLabel={tab === 'team' ? t('organizerOrgTeam.addMember') : t('organizerOrgTeam.newTask')}
    >
      <Ionicons name="add" size={18} color={colors.text} />
      <Text style={styles.addButtonText}>
        {tab === 'team' ? t('organizerOrgTeam.addMember') : t('organizerOrgTeam.newTask')}
      </Text>
    </TouchableOpacity>
  )

  const tabs = useMemo(
    () => [
      { key: 'team', label: t('organizerOrgTeam.tabs.team'), count: members.length },
      { key: 'tasks', label: t('organizerOrgTeam.tabs.tasks'), count: tasks.length },
    ],
    [t, members.length, tasks.length]
  )

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Identical header to the loaded branch — no in-flow -> overlay flash. */}
        <OrganizerScreenHeader
          title={t('organizerOrgTeam.title')}
          onBack={() => navigation.goBack()}
          overlay
          onHeight={onHeight}
        />
        <View style={[styles.content, { marginTop: headerH }]}>
          <Skeleton width="100%" height={56} radius={RADIUS.md} style={{ marginBottom: 20 }} />
          {[0, 1, 2].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={72}
              radius={RADIUS.lg}
              style={{ marginBottom: SPACING.md }}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader
        title={t('organizerOrgTeam.title')}
        onBack={() => navigation.goBack()}
        right={addButton}
        overlay
        onHeight={onHeight}
      />

      {/* The tabs sit statically between the floating header and the list, so
          they reserve the header's height instead of the scroll view. */}
      <View style={[styles.tabsWrap, { marginTop: headerH }]}>
        <SegmentedTabs tabs={tabs} value={tab} onChange={(k) => setTab(k as 'team' | 'tasks')} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {tab === 'team' ? (
          <>
            <View style={styles.notice}>
              <InfoNotice icon="people-outline" text={t('organizerOrgTeam.infoNotice')} />
            </View>

            {members.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('organizerOrgTeam.emptyTeamTitle')}
                subtitle={t('organizerOrgTeam.emptyTeamSubtitle')}
                actionLabel={t('organizerOrgTeam.addMember')}
                onAction={openAddMember}
              />
            ) : (
              members.map((m) => {
                const self = isSelf(m)
                const email = m.email || ''
                const name = memberDisplay(m)
                const subtitle = email && email !== name ? email : undefined
                return (
                  <View key={m.id} style={styles.cardWrap}>
                    <StaffEventCard
                      title={name}
                      subtitle={subtitle}
                      meta={self ? t('organizerOrgTeam.you') : undefined}
                      onPress={self ? undefined : () => setActiveMember(m)}
                      right={
                        <View style={styles.rightCol}>
                          <StatusChip status={roleChipStatus(m.role)} label={roleLabel(m.role)} />
                          {m.status === 'invited' ? (
                            <StatusChip status="pending" label={t('organizerOrgTeam.invited')} />
                          ) : null}
                        </View>
                      }
                    />
                  </View>
                )
              })
            )}
          </>
        ) : (
          <>
            <View style={styles.notice}>
              <InfoNotice icon="checkmark-done-outline" text={t('organizerOrgTeam.tasksInfoNotice')} />
            </View>

            {tasks.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t('organizerOrgTeam.emptyTasksTitle')}
                subtitle={t('organizerOrgTeam.emptyTasksSubtitle')}
                actionLabel={t('organizerOrgTeam.newTask')}
                onAction={openNewTask}
              />
            ) : (
              tasks.map((task) => {
                const metaParts = [
                  task.assignee_name || t('organizerOrgTeam.unassigned'),
                  task.due ? `${t('organizerOrgTeam.due')}: ${task.due}` : null,
                ].filter(Boolean)
                return (
                  <View key={task.id} style={styles.cardWrap}>
                    <StaffEventCard
                      title={task.title}
                      subtitle={task.notes || undefined}
                      meta={metaParts.join('  ·  ')}
                      onPress={() => setActiveTask(task)}
                      right={
                        <StatusChip
                          status={taskChipStatus(task.status)}
                          label={taskStatusLabel(task.status)}
                        />
                      }
                    />
                  </View>
                )
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Add-member form */}
      <Modal
        visible={showAddMember}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddMember(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('organizerOrgTeam.addMember')}</Text>
              <TouchableOpacity
                onPress={() => setShowAddMember(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('organizerOrgTeam.memberEmail')}</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('organizerOrgTeam.memberEmailPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <Text style={styles.label}>{t('organizerOrgTeam.memberName')}</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('organizerOrgTeam.memberNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <SelectField
              label={t('organizerOrgTeam.role')}
              value={roleLabel(newRole)}
              options={ROLE_KEYS.map(roleLabel)}
              onSelect={(label) => setNewRole(roleFromLabel(label))}
              sheetTitle={t('organizerOrgTeam.role')}
            />

            <View style={styles.modalActions}>
              <WhitePillCTA
                label={t('organizerOrgTeam.addMember')}
                onPress={submitAddMember}
                disabled={!newEmail.trim() || submitting}
                loading={submitting}
              />
              <SecondaryPill label={t('common.cancel')} onPress={() => setShowAddMember(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Member actions */}
      <Modal
        visible={!!activeMember}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {activeMember ? memberDisplay(activeMember) : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveMember(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {activeMember?.email ? (
              <Text style={styles.modalSubtitle}>{activeMember.email}</Text>
            ) : null}

            <SelectField
              label={t('organizerOrgTeam.role')}
              value={activeMember ? roleLabel(activeMember.role) : ''}
              options={ROLE_KEYS.map(roleLabel)}
              onSelect={(label) =>
                activeMember && changeMemberRole(activeMember, roleFromLabel(label))
              }
              sheetTitle={t('organizerOrgTeam.role')}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={() => activeMember && removeMember(activeMember)}
                accessibilityRole="button"
                accessibilityLabel={t('organizerOrgTeam.removeMember')}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.dangerRowText}>{t('organizerOrgTeam.removeMember')}</Text>
              </TouchableOpacity>
              <SecondaryPill label={t('common.done')} onPress={() => setActiveMember(null)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* New-task form */}
      <Modal
        visible={showNewTask}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewTask(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('organizerOrgTeam.newTask')}</Text>
              <TouchableOpacity
                onPress={() => setShowNewTask(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('organizerOrgTeam.taskTitle')}</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder={t('organizerOrgTeam.taskTitlePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <Text style={styles.label}>{t('organizerOrgTeam.taskNotes')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={taskNotes}
              onChangeText={setTaskNotes}
              multiline
              placeholder={t('organizerOrgTeam.taskNotesPlaceholder')}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <SelectField
              label={t('organizerOrgTeam.assignee')}
              value={
                members.find((m) => m.id === taskAssigneeId)
                  ? memberDisplay(members.find((m) => m.id === taskAssigneeId)!)
                  : t('organizerOrgTeam.unassigned')
              }
              options={[t('organizerOrgTeam.unassigned'), ...members.map(memberDisplay)]}
              onSelect={(label) => {
                const match = members.find((m) => memberDisplay(m) === label)
                setTaskAssigneeId(match?.id || '')
              }}
              sheetTitle={t('organizerOrgTeam.assignee')}
            />

            <Text style={styles.label}>{t('organizerOrgTeam.due')}</Text>
            <TextInput
              style={styles.input}
              value={taskDue}
              onChangeText={setTaskDue}
              placeholder={t('organizerOrgTeam.duePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />

            <View style={styles.modalActions}>
              <WhitePillCTA
                label={t('organizerOrgTeam.newTask')}
                onPress={submitNewTask}
                disabled={!taskTitle.trim() || submitting}
                loading={submitting}
              />
              <SecondaryPill label={t('common.cancel')} onPress={() => setShowNewTask(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Task actions */}
      <Modal
        visible={!!activeTask}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {activeTask?.title || ''}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTask(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {activeTask?.assignee_name ? (
              <Text style={styles.modalSubtitle}>{activeTask.assignee_name}</Text>
            ) : null}

            <Text style={styles.label}>{t('organizerOrgTeam.taskStatusLabel')}</Text>
            <View style={styles.statusTabs}>
              <SegmentedTabs
                tabs={TASK_STATUS_KEYS.map((s) => ({ key: s, label: taskStatusLabel(s) }))}
                value={activeTask?.status || 'todo'}
                onChange={(k) => activeTask && changeTaskStatus(activeTask, k as TaskStatus)}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.dangerRow}
                onPress={() => activeTask && removeTask(activeTask)}
                accessibilityRole="button"
                accessibilityLabel={t('organizerOrgTeam.removeTask')}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.dangerRowText}>{t('organizerOrgTeam.removeTask')}</Text>
              </TouchableOpacity>
              <SecondaryPill label={t('common.done')} onPress={() => setActiveTask(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },

    tabsWrap: {
      marginHorizontal: -16,
      paddingTop: 8,
      paddingBottom: 2,
    },

    addButton: {
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
    addButtonText: { color: colors.text, fontWeight: '700', fontSize: 13 },

    notice: { marginBottom: SPACING.md },
    cardWrap: { marginBottom: SPACING.md },
    rightCol: { alignItems: 'flex-end', gap: 8 },

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
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    modalTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
    modalSubtitle: { marginTop: 6, fontSize: 13, color: colors.textSecondary },

    label: { marginTop: 14, marginBottom: 6, fontWeight: '700', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
    },
    inputMultiline: { minHeight: 72, textAlignVertical: 'top' },

    // SegmentedTabs pads itself horizontally; pull it back to the card edge.
    statusTabs: { marginHorizontal: -16, marginTop: 2 },

    modalActions: { gap: 10, marginTop: 16 },
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: RADIUS.md,
      backgroundColor: colors.errorLight,
    },
    dangerRowText: { color: colors.error, fontWeight: '700', fontSize: 14 },
  })
