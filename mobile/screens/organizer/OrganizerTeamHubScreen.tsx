import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Users } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useLocaleFormat } from '../../lib/format';
import { getOrganizerEvents, OrganizerEvent } from '../../lib/api/organizer';
import { RADIUS, SPACING } from '../../config/brand';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import StaffEventCard from '../../components/organizer/StaffEventCard';
import InfoNotice from '../../components/organizer/InfoNotice';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Top-level Team hub. Staff access is inherently per-event (data model:
 * events/{id}/members), so this hub lists the organizer's events and taps into
 * each event's existing team screen (OrganizerEventStaff).
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Description collapsed by default for a clean page; tap the info affordance
  // to reveal the full per-event staffing explainer.
  const [showInfo, setShowInfo] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const eventsData = await getOrganizerEvents(userProfile.id, 100);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading organizer events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader title={t('organizerTeamHub.title')} />
        <View style={styles.content}>
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
    );
  }

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader title={t('organizerTeamHub.title')} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.cardWrap}>
          <StaffEventCard
            title={t('organizerTeamHub.orgTeamEntry')}
            subtitle={t('organizerTeamHub.orgTeamEntrySubtitle')}
            onPress={() => navigation.navigate('OrganizerOrgTeam')}
            right={<Users size={20} color={colors.textSecondary} strokeWidth={1.75} />}
          />
        </View>

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
    notice: { marginBottom: SPACING.md },
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
