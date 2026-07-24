import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  getOrganizerStats,
  getTodayEvents,
  OrganizerStats,
  TodayEvent,
} from '../../lib/api/organizer';
import { SPACING, RADIUS } from '../../config/brand';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import StatTriplet from '../../components/StatTriplet';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import { Calendar } from 'lucide-react-native';

export default function OrganizerDashboardScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const [eventsData, statsData] = await Promise.all([
        getTodayEvents(userProfile.id),
        getOrganizerStats(userProfile.id, '7d'),
      ]);

      setTodayEvents(eventsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading organizer dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus (e.g., after editing an event)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const headerSubtitle = `${t('organizerDashboard.welcomeBack')}, ${userProfile?.full_name || t('organizerDashboard.organizerFallback')}`;

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader title={t('organizerDashboard.title')} subtitle={headerSubtitle} />
        <View style={styles.section}>
          <Skeleton width={150} height={22} radius={7} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={148} radius={RADIUS.lg} style={{ marginBottom: 24 }} />
          <Skeleton width={120} height={22} radius={7} style={{ marginBottom: 16 }} />
          <StatTriplet
            items={[
              { label: t('organizerDashboard.revenue'), value: null },
              { label: t('organizerDashboard.ticketsSold'), value: null },
              { label: t('organizerDashboard.upcomingEvents'), value: null },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <OrganizerScreenHeader title={t('organizerDashboard.title')} subtitle={headerSubtitle} />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Today's Events */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerDashboard.todaysEvents')}</Text>
        {todayEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={t('organizerDashboard.noEventsToday')}
            compact
          />
        ) : (
          todayEvents.map((event) => {
            const eventTime = new Date(event.start_datetime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity 
                key={event.id} 
                style={styles.eventCard}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
                activeOpacity={0.7}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <TouchableOpacity
                    style={styles.scanButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      navigation.navigate('TicketScanner', { eventId: event.id });
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={20} color={colors.text} />
                    <Text style={styles.scanButtonText}>{t('tabs.scan')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.eventDetailText}>{eventTime}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.eventDetailText} numberOfLines={1}>{event.location}</Text>
                  </View>
                </View>

                <View style={styles.eventStatsWrap}>
                  <StatTriplet
                    columns={2}
                    items={[
                      { label: t('organizerDashboard.ticketsSold'), value: `${event.ticketsSold}/${event.capacity}` },
                      { label: t('organizerDashboard.checkedIn'), value: event.ticketsCheckedIn },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* This Week Stats — the reusable POSH metric triplet (§2.3).
          Revenue / Tickets Sold / Upcoming, three across. `null` renders •••
          while loading; zero-states ($0.00 / 0) render with confidence. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerDashboard.thisWeek')}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OrganizerAnalytics')}
        >
          <StatTriplet
            items={[
              { label: t('organizerDashboard.revenue'), value: stats ? `$${(stats.revenue || 0).toFixed(2)}` : null },
              { label: t('organizerDashboard.ticketsSold'), value: stats ? (stats.ticketsSold || 0) : null },
              { label: t('organizerDashboard.upcomingEvents'), value: stats ? (stats.upcomingEvents || 0) : null },
            ]}
          />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerDashboard.quickActions') || 'Quick Actions'}</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('OrganizerAnalytics')}
          >
            <Ionicons name="bar-chart-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('organizerDashboard.analytics') || 'Analytics'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('OrganizerRefunds')}
          >
            <Ionicons name="refresh-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('organizerDashboard.refunds') || 'Refunds'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('OrganizerPayoutSettings')}
          >
            <Ionicons name="wallet-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('organizerDashboard.payouts') || 'Payouts'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('OrganizerTeamHub')}
          >
            <Ionicons name="people-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('organizerDashboard.team') || 'Team'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Ionicons name="qr-code-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('tabs.scan') || 'Scan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.text} />
            <Text style={styles.quickActionText}>{t('organizerDashboard.createEvent') || 'Create'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanButtonText: {
    color: colors.text,
    fontWeight: '600',
    marginLeft: 4,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  eventStatsWrap: {
    marginTop: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.md,
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
});
