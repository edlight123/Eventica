import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Users } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useLocaleFormat } from '../../lib/format';
import { getOrganizerEvents, OrganizerEvent } from '../../lib/api/organizer';
import { backendJson } from '../../lib/api/backend';
import { RADIUS, SPACING } from '../../config/brand';
import { font } from '../../theme/tokens';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import StatusChip from '../../components/StatusChip';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import StaffEventCard from '../../components/organizer/StaffEventCard';
import InfoNotice from '../../components/organizer/InfoNotice';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TeamRole = 'admin' | 'manager' | 'staff';

type TeamMember = {
  id: string;
  email: string;
  name?: string | null;
  role: TeamRole;
  status: 'active' | 'invited';
};

// Role → semantic StatusChip status (same mapping as OrganizerOrgTeamScreen).
const roleChipStatus = (role: TeamRole): string =>
  role === 'admin' ? 'live' : role === 'manager' ? 'pending' : 'neutral';

/**
 * Top-level Team hub. Leads with the organization's roster (people + roles —
 * per beta feedback: "it should show me the list of the team and their roles
 * rather than the events"), then lists events for per-event staff assignment
 * (data model: events/{id}/members). The 'staff' role already exists on the
 * org roster; full management (invite, role changes, tasks) lives in
 * OrganizerOrgTeam.
 */
export default function OrganizerTeamHubScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { formatDate } = useLocaleFormat();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Description collapsed by default for a clean page; tap the info affordance
  // to reveal the full per-event staffing explainer.
  const [showInfo, setShowInfo] = useState(false);

  const load = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [eventsData, teamData] = await Promise.all([
        getOrganizerEvents(userProfile.id, 100),
        backendJson<{ members: TeamMember[] }>(`/api/organizer/team`).catch(() => ({ members: [] })),
      ]);
      setEvents(eventsData);
      setMembers(teamData?.members || []);
    } catch (error) {
      console.error('Error loading team hub:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on focus so invites/role changes made in OrganizerOrgTeam show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const roleLabel = (role: TeamRole) => t(`organizerOrgTeam.roles.${role}` as any);

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader title={t('organizerTeamHub.title')} onBack={() => navigation.goBack()} />
        <View style={styles.content}>
          <Skeleton width={120} height={12} radius={5} style={{ marginBottom: 14 }} />
          {[0, 1].map((i) => (
            <Skeleton key={i} width="100%" height={52} radius={RADIUS.md} style={{ marginBottom: 10 }} />
          ))}
          <Skeleton width={140} height={12} radius={5} style={{ marginTop: 16, marginBottom: 14 }} />
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
    );
  }

  return (
    <View style={styles.container}>
      {/* Pushed from the dashboard — without onBack this screen was a dead end
          (no chevron, and the tab bar is covered by the push). */}
      <OrganizerScreenHeader title={t('organizerTeamHub.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Org roster — people + roles first. */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('organizerTeamHub.teamSection')}</Text>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('OrganizerOrgTeam')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('organizerTeamHub.manageTeam')}
          >
            <Ionicons name="person-add-outline" size={15} color={colors.text} />
            <Text style={styles.manageButtonText}>{t('organizerTeamHub.manageTeam')}</Text>
          </TouchableOpacity>
        </View>

        {members.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyTeamRow}
            onPress={() => navigation.navigate('OrganizerOrgTeam')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.emptyTeamText}>{t('organizerTeamHub.emptyTeam')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          members.map((m, i) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.memberRow, i > 0 && styles.memberRowDivider]}
              onPress={() => navigation.navigate('OrganizerOrgTeam')}
              activeOpacity={0.7}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {(m.name || m.email || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberBody}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {m.name || m.email}
                </Text>
                {m.status === 'invited' && (
                  <Text style={styles.memberInvited} numberOfLines={1}>
                    {t('organizerTeamHub.invited')}
                  </Text>
                )}
              </View>
              <StatusChip status={roleChipStatus(m.role)} label={roleLabel(m.role)} />
            </TouchableOpacity>
          ))
        )}

        {/* Per-event staffing (scanning / check-in access). */}
        <Text style={[styles.sectionTitle, styles.staffingTitle]}>
          {t('organizerTeamHub.eventStaffingSection')}
        </Text>

        <View style={styles.notice}>
          <TouchableOpacity
            style={styles.infoToggle}
            onPress={() => setShowInfo((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: showInfo }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoToggleText}>{t('organizerTeamHub.infoToggle')}</Text>
            <Ionicons
              name={showInfo ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {showInfo && (
            <View style={styles.infoBody}>
              <InfoNotice icon="people-outline" text={t('organizerTeamHub.infoNotice')} />
            </View>
          )}
        </View>

        {events.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('organizerTeamHub.emptyTitle')}
            subtitle={t('organizerTeamHub.emptySubtitle')}
            actionLabel={t('organizerDashboard.createEventCta')}
            onAction={() => navigation.navigate('CreateEvent')}
          />
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.cardWrap}>
              <StaffEventCard
                title={event.title}
                subtitle={formatDate(event.start_datetime)}
                posterUri={event.banner_image_url || event.cover_image_url || null}
                onPress={() =>
                  navigation.navigate('OrganizerEventStaff', { eventId: event.id })
                }
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    sectionTitle: {
      fontFamily: font.mono,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.textSecondary,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    manageButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 14,
    },
    manageButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 13,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    memberRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    memberAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberAvatarText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },
    memberBody: { flex: 1 },
    memberName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    memberInvited: {
      marginTop: 2,
      fontFamily: font.monoRegular,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyTeamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
    },
    emptyTeamText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
    },
    staffingTitle: {
      marginTop: 22,
      marginBottom: 6,
    },
    notice: { marginBottom: SPACING.sm },
    infoToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingVertical: 6,
    },
    infoToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    infoBody: { marginTop: SPACING.sm },
    cardWrap: { marginBottom: SPACING.md },
  });
