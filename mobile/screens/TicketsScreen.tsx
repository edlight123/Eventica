import React, { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Ticket, ChevronRight } from 'lucide-react-native';
import { collection, query, where, getDocs, orderBy, documentId } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { Skeleton } from '../components/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { resolvePosterTheme } from '../lib/posterGradient';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';
import WhitePillCTA from '../components/WhitePillCTA';
import { format } from 'date-fns';
import { safeFormatForLanguage } from '../lib/dates';
import { useFocusEffect } from '@react-navigation/native';
import { consumeTicketsRefreshHint } from '../lib/ticketsRefreshHint';
import { font } from '../theme/tokens';

// Offline-first cache: the door-scan moment is exactly when signal is worst, so
// we persist the resolved upcoming/past event lists per user and hydrate them
// instantly on launch. Dates are stored as ISO strings (JSON-safe) and revived
// on read. The individual QR still renders offline from TicketDetail's own cache.
const ticketsCacheKey = (uid: string) => `tickets_cache_${uid}`;

const serializeEvents = (events: any[]) =>
  events.map((e) => ({
    ...e,
    start_datetime: e.start_datetime ? new Date(e.start_datetime).toISOString() : null,
    end_datetime: e.end_datetime ? new Date(e.end_datetime).toISOString() : null,
  }));

const reviveEvents = (events: any[]) =>
  (events || []).map((e) => ({
    ...e,
    start_datetime: e.start_datetime ? new Date(e.start_datetime) : null,
    end_datetime: e.end_datetime ? new Date(e.end_datetime) : null,
  }));

/** Placeholder rows that mirror the ticket-card layout (thumb + text lines). */
function TicketsListSkeleton({ styles }: { styles: ReturnType<typeof getStyles> }) {
  return (
    <View>
      <Skeleton width={120} height={12} radius={5} style={styles.skeletonSectionHeader} />
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.ticketCard}>
          <Skeleton width={64} height={64} radius={12} />
          <View style={styles.ticketBody}>
            <Skeleton width={70} height={18} radius={9} />
            <Skeleton width={'82%'} height={16} radius={6} style={{ marginTop: 2 }} />
            <Skeleton width={'60%'} height={12} radius={5} style={{ marginTop: 4 }} />
            <Skeleton width={'45%'} height={12} radius={5} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TicketsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const [upcomingTickets, setUpcomingTickets] = useState<any[]>([]);
  const [pastTickets, setPastTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickets = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch tickets. Paid tickets are stamped with `attendee_id` while
      // free/legacy tickets use `user_id`, so query BOTH fields and merge the
      // results de-duplicated by doc id (a ticket may carry both fields).
      const [byUserId, byAttendeeId] = await Promise.all([
        getDocs(query(collection(db, 'tickets'), where('user_id', '==', user.uid))),
        getDocs(query(collection(db, 'tickets'), where('attendee_id', '==', user.uid))),
      ]);
      const ticketDocsById = new Map<string, any>();
      [...byUserId.docs, ...byAttendeeId.docs].forEach(doc => {
        if (!ticketDocsById.has(doc.id)) ticketDocsById.set(doc.id, doc);
      });
      const ticketsData = Array.from(ticketDocsById.values()).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          event_id: data.event_id,
          ...data,
          event_date: data.event_date?.toDate ? data.event_date.toDate() : data.event_date ? new Date(data.event_date) : null,
          purchase_date: data.purchase_date?.toDate ? data.purchase_date.toDate() : data.purchase_date ? new Date(data.purchase_date) : null
        } as any;
      });
      
      // Group tickets by event
      const ticketsByEvent = new Map();
      ticketsData.forEach(ticket => {
        if (!ticketsByEvent.has(ticket.event_id)) {
          ticketsByEvent.set(ticket.event_id, []);
        }
        ticketsByEvent.get(ticket.event_id).push(ticket);
      });
      
      // Fetch event details for all events with tickets in one batched pass.
      // Firestore's `in` query accepts up to 30 values, so chunk the ids and
      // issue one query per chunk instead of a getDocs per event (N+1).
      const eventIds = Array.from(ticketsByEvent.keys());
      const eventsData: any[] = [];

      for (let i = 0; i < eventIds.length; i += 30) {
        const chunk = eventIds.slice(i, i + 30);
        const eventsQuery = query(
          collection(db, 'events'),
          where(documentId(), 'in', chunk)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.docs.forEach(eventDoc => {
          const eventData = eventDoc.data();
          eventsData.push({
            id: eventDoc.id,
            ...eventData,
            start_datetime: eventData.start_datetime?.toDate ? eventData.start_datetime.toDate() : eventData.start_datetime ? new Date(eventData.start_datetime) : null,
            end_datetime: eventData.end_datetime?.toDate ? eventData.end_datetime.toDate() : eventData.end_datetime ? new Date(eventData.end_datetime) : null,
            ticketCount: ticketsByEvent.get(eventDoc.id).length
          });
        });
      }
      
      // Separate upcoming and past events
      const now = new Date();
      const upcoming = eventsData
        .filter((e: any) => {
          const cutoff = e.end_datetime || e.start_datetime;
          return cutoff && new Date(cutoff) >= now;
        })
        .sort((a: any, b: any) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      
      const past = eventsData
        .filter((e: any) => {
          const cutoff = e.end_datetime || e.start_datetime;
          return cutoff && new Date(cutoff) < now;
        })
        .sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
      
      setUpcomingTickets(upcoming);
      setPastTickets(past);

      // Persist for offline-first launch next time (see ticketsCacheKey note).
      try {
        await AsyncStorage.setItem(
          ticketsCacheKey(user.uid),
          JSON.stringify({ upcoming: serializeEvents(upcoming), past: serializeEvents(past) }),
        );
      } catch {}
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Offline-first: paint cached tickets instantly (no blank/spinner gap, and
      // the list is available with no signal), then refresh from the network.
      if (user) {
        try {
          const raw = await AsyncStorage.getItem(ticketsCacheKey(user.uid));
          if (raw && !cancelled) {
            const c = JSON.parse(raw);
            setUpcomingTickets(reviveEvents(c.upcoming));
            setPastTickets(reviveEvents(c.past));
            setLoading(false);
          }
        } catch {}
      }
      if (!cancelled) fetchTickets();
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let t1: any = null;
      let t2: any = null;

      const run = async () => {
        await fetchTickets();

        // If we just completed a payment, tickets might not be mirrored yet.
        // Retry a couple times with small delays.
        const hint = await consumeTicketsRefreshHint(2 * 60 * 1000);
        if (hint?.reason === 'payment') {
          t1 = setTimeout(() => {
            fetchTickets();
          }, 2000);
          t2 = setTimeout(() => {
            fetchTickets();
          }, 6000);
        }
      };

      run();

      return () => {
        if (t1) clearTimeout(t1);
        if (t2) clearTimeout(t2);
      };
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon={Ticket}
          title={t('auth.loginRequiredTitle')}
          subtitle={t('tickets.loginRequiredBody')}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{t('tickets.title')}</Text>
        </View>
        <View style={styles.tabs}>
          <View style={[styles.tab, styles.tabActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>{t('tickets.upcoming')}</Text>
          </View>
          <View style={styles.tab}>
            <Text style={styles.tabText}>{t('tickets.past')}</Text>
          </View>
        </View>
        <TicketsListSkeleton styles={styles} />
      </View>
    );
  }

  const displayedTickets = activeTab === 'upcoming' ? upcomingTickets : pastTickets;

  // Group events into date sections (by month) for a tidy, scannable list.
  const sections = (() => {
    const groups: { key: string; label: string; items: any[] }[] = [];
    const indexByKey = new Map<string, number>();
    for (const event of displayedTickets) {
      const d = event.start_datetime ? new Date(event.start_datetime) : null;
      const valid = d && !Number.isNaN(d.getTime());
      const key = valid ? format(d as Date, 'yyyy-MM') : 'undated';
      const label = valid ? safeFormatForLanguage(d as Date, 'MMMM yyyy', language) : t('tickets.undated') || 'Undated';
      if (!indexByKey.has(key)) {
        indexByKey.set(key, groups.length);
        groups.push({ key, label, items: [] });
      }
      groups[indexByKey.get(key)!].items.push(event);
    }
    return groups;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('tickets.title')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            {t('tickets.upcoming')} ({upcomingTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            {t('tickets.past')} ({pastTickets.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {displayedTickets.length === 0 ? (
          <View style={styles.emptyWrap}>
            {/* Just the ticket mark on the canvas — no ring, no gradient disc
                (beta feedback: the circle was too much). */}
            <Ticket size={40} color={colors.primary} strokeWidth={1.5} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming' ? t('tickets.emptyUpcomingTitle') : t('tickets.emptyPastTitle')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming' ? t('tickets.emptyUpcomingBody') : t('tickets.emptyPastBody')}
            </Text>
            {activeTab === 'upcoming' && (
              <WhitePillCTA
                label={t('favorites.explore')}
                onPress={() => navigation.navigate('Discover')}
                style={styles.emptyCta}
              />
            )}
          </View>
        ) : (
          sections.map(section => (
            <View key={section.key}>
              <Text style={styles.sectionHeader}>{section.label}</Text>
              {section.items.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.ticketCard}
                  onPress={() => navigation.navigate('EventTickets', { eventId: event.id })}
                  activeOpacity={0.9}
                >
                  <View style={styles.ticketThumb}>
                    <LinearGradient
                      colors={resolvePosterTheme(event, event.id || event.title, event.category).colors}
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {(event.banner_image_url || event.cover_image_url) && (
                      <Image
                        source={{ uri: event.banner_image_url || event.cover_image_url }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        recyclingKey={event.id ? String(event.id) : undefined}
                      />
                    )}
                  </View>

                  <View style={styles.ticketBody}>
                    <View style={styles.ticketTopRow}>
                      <StatusChip status={activeTab === 'upcoming' ? 'upcoming' : 'used'} />
                    </View>
                    <Text style={styles.ticketTitle} numberOfLines={2}>{event.title}</Text>

                    <View style={styles.ticketMetaRow}>
                      <Calendar size={13} color={colors.textSecondary} />
                      <Text style={styles.ticketMetaText} numberOfLines={1}>
                        {event.start_datetime && safeFormatForLanguage(event.start_datetime, 'EEE, MMM d • h:mm a', language)}
                      </Text>
                    </View>

                    <View style={styles.ticketMetaRow}>
                      <MapPin size={13} color={colors.textSecondary} />
                      <Text style={styles.ticketMetaText} numberOfLines={1}>
                        {event.venue_name}, {event.city}
                      </Text>
                    </View>

                    <View style={styles.ticketCountBadge}>
                      <Ticket size={11} color={colors.textSecondary} />
                      <Text style={styles.ticketCountText}>
                        {event.ticketCount} {event.ticketCount === 1 ? t('tickets.ticketSingular') : t('tickets.ticketPlural')}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          ))
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  skeletonSectionHeader: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  ticketCard: {
    // Elevation, not a border (POSH §1): the card separates from the canvas by
    // being a brighter surface, not by a 1px outline.
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
  },
  ticketThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  ticketBody: {
    flex: 1,
    gap: 5,
  },
  ticketTopRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ticketHeader: {
    marginBottom: 14,
  },
  ticketTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  ticketTitle: {
    fontFamily: font.serif,
    fontSize: 18,
    color: colors.text,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketMetaText: {
    flex: 1,
    fontFamily: font.monoRegular,
    fontSize: 11.5,
    letterSpacing: 0.3,
    color: colors.textSecondary,
  },
  ticketCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  ticketCountText: {
    fontFamily: font.mono,
    color: colors.textSecondary,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ticketDate: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  ticketVenue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  ticketFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewTicketsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: font.serif,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCta: {
    minWidth: 200,
  },
});
