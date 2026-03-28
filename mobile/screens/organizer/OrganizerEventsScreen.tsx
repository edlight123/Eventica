import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { getOrganizerEvents, OrganizerEvent } from '../../lib/api/organizer';

type EventStatus = 'draft' | 'published' | 'sold_out' | 'completed' | 'cancelled';

export default function OrganizerEventsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [eventTab, setEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [allEvents, setAllEvents] = useState<OrganizerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const eventsData = await getOrganizerEvents(userProfile.id, 100);
      setAllEvents(eventsData);
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

  // Reload events when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const now = new Date();

  const upcomingEvents = allEvents.filter((e) => {
    const cutoff = (e as any).end_datetime || e.start_datetime;
    if (!cutoff) return false;
    return new Date(cutoff) > now;
  });

  const pastEvents = allEvents.filter((e) => {
    const cutoff = (e as any).end_datetime || e.start_datetime;
    if (!cutoff) return false;
    return new Date(cutoff) <= now;
  });

  const events = eventTab === 'upcoming' ? upcomingEvents : pastEvents;

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'draft':
        return colors.warning;
      case 'published':
        return colors.success;
      case 'sold_out':
        return colors.error;
      case 'completed':
        return colors.textSecondary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: EventStatus) => {
    switch (status) {
      case 'draft':
        return t('organizerEvents.status.draft');
      case 'published':
        return t('organizerEvents.status.published');
      case 'sold_out':
        return t('organizerEvents.status.soldOut');
      case 'completed':
        return t('organizerEvents.status.completed');
      case 'cancelled':
        return t('organizerEvents.status.cancelled');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerEvents.loading')}</Text>
      </View>
    );
  }

  // Match the rest of the app: light background -> dark status bar text
  // Header padding is safe-area aware.

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('organizerEvents.title')}</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => (navigation as any).navigate('CreateEvent')}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary} />
          <Text style={styles.createButtonText}>{t('organizerEvents.create')}</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, eventTab === 'upcoming' && styles.segmentActive]}
          onPress={() => setEventTab('upcoming')}
        >
          <Text style={[styles.segmentText, eventTab === 'upcoming' && styles.segmentTextActive]}>
            {t('organizerEvents.upcoming')} ({upcomingEvents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, eventTab === 'past' && styles.segmentActive]}
          onPress={() => setEventTab('past')}
        >
          <Text style={[styles.segmentText, eventTab === 'past' && styles.segmentTextActive]}>
            {t('organizerEvents.past')} ({pastEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {eventTab === 'upcoming' ? t('organizerEvents.emptyUpcomingTitle') : t('organizerEvents.emptyPastTitle')}
            </Text>
            <Text style={styles.emptyText}>
              {eventTab === 'upcoming'
                ? t('organizerEvents.emptyUpcomingBody')
                : t('organizerEvents.emptyPastBody')}
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const eventDate = new Date(event.start_datetime);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            // Determine event status
            let displayStatus: EventStatus = event.status as EventStatus;
            if (event.is_published && event.tickets_sold >= event.total_tickets) {
              displayStatus = 'sold_out';
            } else if (event.is_published) {
              displayStatus = 'published';
            } else if (!event.is_published && event.status === 'draft') {
              displayStatus = 'draft';
            }

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
              >
                {event.cover_image_url && (
                  <Image source={{ uri: event.cover_image_url }} style={styles.eventImage} />
                )}
                {!event.cover_image_url && (
                  <View style={[styles.eventImage, styles.placeholderImage]}>
                    <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.eventContent}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: getStatusColor(displayStatus) }]}>
                      <Text style={styles.statusText}>{getStatusLabel(displayStatus)}</Text>
                    </View>
                  </View>

                  <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{formattedDate}</Text>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                      <Text style={styles.detailText}>{formattedTime}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {event.location}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.eventFooter}>
                    <View style={styles.ticketInfo}>
                      <Ionicons name="ticket-outline" size={16} color={colors.primary} />
                      <Text style={styles.ticketText}>
                        {event.tickets_sold || 0} / {event.total_tickets || 0} {t('common.sold')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.manageButton}
                      onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
                    >
                      <Text style={styles.manageButtonText}>{t('organizerEvents.manage')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  eventContent: {
    padding: 16,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    marginLeft: 12,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
});
