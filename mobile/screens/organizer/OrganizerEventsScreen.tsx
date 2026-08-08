import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useTabBarSpace } from '../../hooks/useTabBarSpace';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { getOrganizerEvents, OrganizerEvent } from '../../lib/api/organizer';
import { resolvePosterTheme } from '../../lib/posterGradient';
import { RADIUS } from '../../config/brand';
import { font } from '../../theme/tokens';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import StatusChip from '../../components/StatusChip';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import SegmentedTabs from '../../components/organizer/SegmentedTabs';
import { TikemWordmark } from '../../components/TikemWordmark';

type EventStatus = 'draft' | 'published' | 'sold_out' | 'completed' | 'cancelled';

export default function OrganizerEventsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const { t, language } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';
  // The tab bar is a translucent overlay, so reserve its height here or the
  // last row ends up sitting behind it.
  const tabBarSpace = useTabBarSpace();
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

  const createButton = (
    <TouchableOpacity
      style={styles.createButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => navigation.navigate('CreateEvent')}
    >
      <Ionicons name="add" size={18} color={colors.text} />
      <Text style={styles.createButtonText}>{t('organizerEvents.create')}</Text>
    </TouchableOpacity>
  );

  // Map an event status to the locked StatusChip semantic (POSH §2.7):
  //   published → live (teal) · draft → action-needed (amber) ·
  //   sold_out/cancelled → error (red) · completed → used (grey).
  const getChipStatus = (status: EventStatus): string => {
    switch (status) {
      case 'draft':
        return 'actionNeeded';
      case 'published':
        return 'live';
      case 'sold_out':
        return 'soldOut';
      case 'completed':
        return 'used';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
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
      <View style={styles.container}>
        <OrganizerScreenHeader title={t('organizerEvents.title')} right={createButton} />
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={140} radius={RADIUS.lg} style={{ marginBottom: 16 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <OrganizerScreenHeader title={t('organizerEvents.title')} right={createButton} />

      {/* Segmented Control */}
      <View style={styles.segmentedWrap}>
        <SegmentedTabs
          value={eventTab}
          onChange={(key) => setEventTab(key as 'upcoming' | 'past')}
          tabs={[
            { key: 'upcoming', label: t('organizerEvents.upcoming'), count: upcomingEvents.length },
            { key: 'past', label: t('organizerEvents.past'), count: pastEvents.length },
          ]}
        />
      </View>

      {/* Events List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarSpace + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={eventTab === 'upcoming' ? t('organizerEvents.emptyUpcomingTitle') : t('organizerEvents.emptyPastTitle')}
            subtitle={eventTab === 'upcoming'
              ? t('organizerEvents.emptyUpcomingBody')
              : t('organizerEvents.emptyPastBody')}
            actionLabel={eventTab === 'upcoming' ? t('organizerDashboard.createEventCta') : undefined}
            onAction={eventTab === 'upcoming' ? () => navigation.navigate('CreateEvent') : undefined}
          />
        ) : (
          events.map((event) => {
            const eventDate = new Date(event.start_datetime);
            const formattedDate = eventDate.toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString(locale, {
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

            // Attendee-side reads banner first, then cover. Match that so the
            // real poster shows on the organizer list too.
            const posterUri = event.banner_image_url || event.cover_image_url;

            // `location` is often empty; fall back to venue_name/city/commune/
            // address (same fields the attendee card composes) so the pin row
            // isn't a lonely icon with no text.
            const locationLabel =
              (event.location && event.location.trim()) ||
              [event.venue_name, (event as any).city, event.commune, event.address]
                .filter((s) => s && String(s).trim())
                .join(', ');

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id, event })}
              >
                {/* Vertical poster thumbnail on the left. Real image when we have
                    one; otherwise the poster gradient with a small centered
                    wordmark (branded-strip treatment adapted to a portrait thumb). */}
                <View style={styles.eventThumb}>
                  <LinearGradient
                    colors={resolvePosterTheme(event, event.id || event.title, event.category).colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {posterUri ? (
                    // expo-image: cached posters paint instantly (no green-gradient
                    // flash before load), new ones fade in over the gradient.
                    <Image
                      source={{ uri: posterUri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                      recyclingKey={event.id ? String(event.id) : undefined}
                    />
                  ) : (
                    <View style={styles.eventThumbBrand}>
                      <TikemWordmark fontSize={16} />
                    </View>
                  )}
                </View>
                <View style={styles.eventContent}>
                  <View style={styles.eventHeaderRow}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    <StatusChip status={getChipStatus(displayStatus)} label={getStatusLabel(displayStatus)} />
                  </View>

                  <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{formattedDate}</Text>
                      <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.detailIcon} />
                      <Text style={styles.detailText}>{formattedTime}</Text>
                    </View>
                    {locationLabel ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText} numberOfLines={1}>
                          {locationLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.eventFooter}>
                    <View style={styles.ticketInfo}>
                      <Ionicons name="ticket-outline" size={16} color={colors.primary} />
                      <Text style={styles.ticketText}>
                        {event.tickets_sold || 0} / {event.total_tickets || 0} {t('common.sold')}
                      </Text>
                    </View>
                    <View style={styles.manageButton}>
                      <Text style={styles.manageButtonText}>{t('organizerEvents.manage')}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
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

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  segmentedWrap: {
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // No card background (POSH poster-forward): the poster + text sit directly on
  // the canvas, so the artwork carries the card, not a grey container.
  eventCard: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  // Vertical poster thumbnail on the left (portrait ~4:5). Rounded here since
  // the card no longer clips it.
  eventThumb: {
    width: 104,
    aspectRatio: 4 / 5,
    // ~10% max roundness per beta feedback (104px * 0.10 ≈ 10).
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  eventThumbBrand: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
    paddingHorizontal: 8,
  },
  eventContent: {
    flex: 1,
    paddingVertical: 2,
    justifyContent: 'space-between',
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontFamily: font.serif,
    fontSize: 20,
    color: colors.text,
    flex: 1,
    marginRight: 10,
    lineHeight: 24,
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
