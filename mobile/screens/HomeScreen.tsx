import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StatusBar,
  Share,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing } from 'react-native';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { filterExploreEvents } from '../lib/api/events';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useFilters } from '../contexts/FiltersContext';
import { BRAND } from '../config/brand';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRY_NAMES } from '../utils/deviceLocation';
import { MapPin, ChevronDown, Inbox } from 'lucide-react-native';
import LocationDetectionBanner from '../components/LocationDetectionBanner';
import LocationPickerSheet from '../components/LocationPickerSheet';
import { DEFAULT_FILTERS } from '../types/filters';

import CategoryRail from '../components/CategoryRail';
import { TikemWordmark } from '../components/TikemWordmark';
import TrendingSection from '../components/TrendingSection';
import ThisWeekSection from '../components/ThisWeekSection';
import AllEventsPreview from '../components/AllEventsPreview';
import EventRail from '../components/EventRail';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import { HomeFeedSkeleton } from '../components/Skeleton';
import { isBudgetFriendlyTicketPrice } from '../lib/pricing';
import { getCategoryLabel } from '../lib/categories';
import { font } from '../theme/tokens';

// Tolerant city matching (accents/case/"City, ST") so the Near You rail lines up
// with whatever string is stored on each event's `city`.
const normalizeCity = (s: any): string =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const cityMatches = (eventCity: any, target: string): boolean => {
  const e = normalizeCity(eventCity);
  const full = normalizeCity(target);
  if (!e || !full) return false;
  const short = normalizeCity(target.split(',')[0]);
  return e === full || e === short || e.includes(short) || short.includes(e);
};

const toMillis = (v: any): number => {
  if (!v) return 0;
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v?.seconds) return v.seconds * 1000;
  const d = new Date(v).getTime();
  return Number.isFinite(d) ? d : 0;
};

export default function HomeScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { userCountry, applyFiltersDirectly } = useFilters();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = useState<any[]>([]);
  const [forYouEvents, setForYouEvents] = useState<any[]>([]);
  const [nearYouEvents, setNearYouEvents] = useState<any[]>([]);
  const [freeEvents, setFreeEvents] = useState<any[]>([]);
  const [newEvents, setNewEvents] = useState<any[]>([]);
  const [categoryRails, setCategoryRails] = useState<{ category: string; events: any[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerSpacerHeight = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHidden = useRef(false);
  const headerHeightRef = useRef(0);
  const lastTabPressRef = useRef(0);

  const fetchEvents = async () => {
    try {
      // Get all published events
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true),
        limit(50)
      );

      const snapshot = await getDocs(q);

      const eventsData: any[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        // Convert Firestore Timestamp to Date
        let startDate = null;
        if (data.start_datetime) {
          if (typeof data.start_datetime.toDate === 'function') {
            startDate = data.start_datetime.toDate();
          } else if (data.start_datetime.seconds) {
            startDate = new Date(data.start_datetime.seconds * 1000);
          } else {
            startDate = new Date(data.start_datetime);
          }
        }

        let endDate = null;
        if (data.end_datetime) {
          if (typeof data.end_datetime.toDate === 'function') {
            endDate = data.end_datetime.toDate();
          } else if (data.end_datetime.seconds) {
            endDate = new Date(data.end_datetime.seconds * 1000);
          } else {
            endDate = new Date(data.end_datetime);
          }
        }

        return {
          id: doc.id,
          ...data,
          start_datetime: startDate,
          end_datetime: endDate,
        };
      });

      // Sort client-side to avoid requiring a composite Firestore index.
      eventsData.sort((a: any, b: any) => {
        const aTime = a?.start_datetime ? new Date(a.start_datetime).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b?.start_datetime ? new Date(b.start_datetime).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

      // Hide events the organizer marked as not shown on Explore (unlisted).
      // Missing field = visible, so existing events are unaffected.
      const exploreEvents = filterExploreEvents(eventsData);

      // Filter out past events (be lenient - show events from past week that could be ongoing)
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const futureEvents: any[] = exploreEvents.filter((e) => {
        const start = e.start_datetime ? new Date(e.start_datetime) : null;
        const end = e.end_datetime ? new Date(e.end_datetime) : null;
        
        // If has end date, check if it's in the future
        if (end) return end >= now;
        // If only start date, show if started within past week
        if (start) return start >= oneWeekAgo;
        // No dates - show anyway
        return true;
      });

      const effectiveEvents = futureEvents.length > 0 ? futureEvents : exploreEvents;
      
      // Apply country filter - only show events from user's country
      const countryFiltered = effectiveEvents.filter((e) => 
        (e.country || 'HT') === userCountry
      );
      
      console.log('[HomeScreen] Events filtered by country:', userCountry, '→', countryFiltered.length, 'of', effectiveEvents.length);
      
      const finalEvents = countryFiltered.length > 0 ? countryFiltered : effectiveEvents;
      setEvents(finalEvents);

      // Featured events (top 5 by tickets sold)
      const featured = [...finalEvents]
        .sort((a: any, b: any) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 5);
      setFeaturedEvents(featured);

      // Trending events (tickets_sold > 10)
      const trending = finalEvents
        .filter((e) => (e.tickets_sold || 0) > 10)
        .slice(0, 6);
      setTrendingEvents(trending);

      // This week events
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(now.getDate() + 7);
      const thisWeek = finalEvents
        .filter((e) => e.start_datetime <= oneWeekFromNow)
        .slice(0, 6);
      setThisWeekEvents(thisWeek);

      // For You — popular picks (most tickets sold), a light personalization proxy.
      const forYou = [...finalEvents]
        .sort((a: any, b: any) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 8);
      setForYouEvents(forYou);

      // Near You — events in the user's chosen / default city.
      const nearCity = selectedLocation || userProfile?.default_city || '';
      const nearYou = nearCity
        ? finalEvents.filter((e) => cityMatches(e.city, nearCity)).slice(0, 8)
        : [];
      setNearYouEvents(nearYou);

      // Free & budget-friendly.
      const free = finalEvents
        .filter((e) => isBudgetFriendlyTicketPrice(e?.ticket_price, e?.currency))
        .slice(0, 8);
      setFreeEvents(free);

      // Just Announced — most recently created events.
      const recentlyAdded = [...finalEvents]
        .sort((a: any, b: any) => toMillis(b.created_at) - toMillis(a.created_at))
        .slice(0, 8);
      setNewEvents(recentlyAdded);

      // One carousel per category that has events.
      const byCategory: Record<string, any[]> = {};
      finalEvents.forEach((e) => {
        const c = e.category;
        if (!c) return;
        (byCategory[c] = byCategory[c] || []).push(e);
      });
      const catRails = Object.keys(byCategory)
        .map((c) => ({ category: c, events: byCategory[c].slice(0, 10) }))
        .filter((r) => r.events.length > 0);
      setCategoryRails(catRails);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `Check out ${event.title}! ${event.description || ''}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userCountry]); // Refetch when country changes

  // Active-tab taps: once = scroll to top, twice (quick) = refresh.
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      const navState = navigation.getState();
      const currentRoute = navState.routes[navState.index];
      if (currentRoute.name !== 'Home') return;
      const now = Date.now();
      if (now - lastTabPressRef.current < 400) {
        setRefreshing(true);
        fetchEvents();
      } else {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
      lastTabPressRef.current = now;
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const animateHeader = (shouldHide: boolean) => {
    const headerHeight = headerHeightRef.current;
    if (!headerHeight) return;

    if (shouldHide && headerHidden.current) return;
    if (!shouldHide && !headerHidden.current) return;

    headerHidden.current = shouldHide;

    Animated.parallel([
      Animated.spring(headerTranslateY, {
        toValue: shouldHide ? -headerHeight : 0,
        useNativeDriver: true,
        tension: 140,
        friction: 22,
      }),
      Animated.timing(headerSpacerHeight, {
        toValue: shouldHide ? 0 : headerHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleScroll = (e: any) => {
    const rawY = e?.nativeEvent?.contentOffset?.y ?? 0;
    const currentY = Math.max(0, rawY);
    const delta = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    // Ignore jitter and don't hide immediately at the top.
    if (Math.abs(delta) < 8) return;

    if (delta > 0 && currentY > 16) {
      animateHeader(true);
    } else if (delta < 0) {
      animateHeader(false);
    }
  };

  const handleCategoryPress = (category: string) => {
    console.log('[HomeScreen] Category pressed:', category);
    navigation.navigate('Discover', { category, timestamp: Date.now() });
  };

  const handleViewAllTrending = () => {
    navigation.navigate('Discover', { trending: true, timestamp: Date.now() });
  };

  const handleViewAllThisWeek = () => {
    navigation.navigate('Discover', { thisWeek: true, timestamp: Date.now() });
  };

  const handleViewAllEvents = () => {
    navigation.navigate('Discover', { allEvents: true, timestamp: Date.now() });
  };

  const handleViewAllNearYou = () => {
    const nearCity = selectedLocation || userProfile?.default_city || '';
    if (nearCity) {
      applyFiltersDirectly({ ...DEFAULT_FILTERS, country: userCountry, city: nearCity });
    }
    navigation.navigate('Discover', { timestamp: Date.now() });
  };

  const locationLabel =
    selectedLocation || userProfile?.default_city || COUNTRY_NAMES[userCountry] || 'Haiti';

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Location Detection Banner */}
      <LocationDetectionBanner />

      {/* Floating brand + location header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            paddingTop: insets.top + 10,
          },
        ]}
        onLayout={(e) => {
          const h = e?.nativeEvent?.layout?.height ?? 0;
          if (!h) return;
          if (headerHeightRef.current === h) return;
          headerHeightRef.current = h;
          headerSpacerHeight.setValue(h);
        }}
      >
        <View style={styles.headerLeft}>
          <TikemWordmark fontSize={32} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => setLocationSheetOpen(true)}
            activeOpacity={0.7}
          >
            <MapPin size={13} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <ChevronDown size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
      >
        <Animated.View style={{ height: headerSpacerHeight }} />
        {loading ? (
          <HomeFeedSkeleton />
        ) : (
          <>
            {/* Oversized editorial masthead (POSH §2.5) — scaled-up serif,
                wraps up to 2 lines. Keeps the serif title identity. */}
            <Text style={styles.headline} numberOfLines={2}>
              {t('home.headline')}
            </Text>

            {/* For You */}
            {forYouEvents.length > 0 && (
              <View style={styles.firstSection}>
                <EventRail
                  title={t('home.forYouTitle')}
                  subtitle={t('home.forYouSubtitle')}
                  events={forYouEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllEvents}
                />
              </View>
            )}

            {/* Trending Now */}
            {trendingEvents.length > 0 && (
              <View style={styles.section}>
                <TrendingSection
                  events={trendingEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllTrending}
                />
              </View>
            )}

            {/* Near You */}
            {nearYouEvents.length > 0 && (
              <View style={styles.section}>
                <EventRail
                  title={t('home.nearYouTitle')}
                  subtitle={t('home.nearYouSubtitle')}
                  events={nearYouEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllNearYou}
                />
              </View>
            )}

            {/* This Week */}
            {thisWeekEvents.length > 0 && (
              <View style={styles.section}>
                <ThisWeekSection
                  events={thisWeekEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllThisWeek}
                />
              </View>
            )}

            {/* Free & Budget-Friendly */}
            {freeEvents.length > 0 && (
              <View style={styles.section}>
                <EventRail
                  title={t('home.freeTitle')}
                  subtitle={t('home.freeSubtitle')}
                  events={freeEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllEvents}
                />
              </View>
            )}

            {/* One carousel per category */}
            {categoryRails.map((rail) => (
              <View key={rail.category} style={styles.section}>
                <EventRail
                  title={getCategoryLabel(t, rail.category)}
                  events={rail.events}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={() => navigation.navigate('CategoryEvents', { category: rail.category, title: getCategoryLabel(t, rail.category) })}
                />
              </View>
            ))}

            {/* Just Announced */}
            {newEvents.length > 0 && (
              <View style={styles.section}>
                <EventRail
                  title={t('home.newTitle')}
                  subtitle={t('home.newSubtitle')}
                  events={newEvents}
                  badge="New"
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllEvents}
                />
              </View>
            )}

            {/* All Events Preview */}
            {events.length > 0 && (
              <View style={styles.section}>
                <AllEventsPreview
                  events={events}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                  onViewAll={handleViewAllEvents}
                />
              </View>
            )}

            {events.length === 0 && (
              <EmptyState
                icon={Inbox}
                title={t('home.emptyTitle')}
                subtitle={t('home.emptySubtitle')}
              />
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 32 + insets.bottom }} />
          </>
        )}
      </ScrollView>

      <LocationPickerSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        selectedCity={selectedLocation || ''}
        onSelect={(city) => {
          setSelectedLocation(city || null);
          setLocationSheetOpen(false);
          if (city) {
            applyFiltersDirectly({ ...DEFAULT_FILTERS, country: userCountry, city });
            navigation.navigate('Discover', { timestamp: Date.now() });
          }
        }}
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    maxWidth: 150,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    height: 38,
    aspectRatio: 2.298,
    alignSelf: 'flex-start',
    tintColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: colors.text,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  firstSection: {
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  sectionTitleBase: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  sectionTitleGradient1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3a3a3a',
    letterSpacing: 0.3,
  },
  sectionTitleGradient2: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d5f5d',
    letterSpacing: 0.3,
  },
  sectionTitleGradient3: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20847e',
    letterSpacing: 0.3,
  },
  sectionTitleGradient4: {
    fontSize: 22,
    fontWeight: '700',
    color: '#14a89e',
    letterSpacing: 0.3,
  },
  sectionTitleGradient5: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0d9488',
    letterSpacing: 0.3,
  },
  sectionTitleGradient6: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f766e',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    paddingHorizontal: 16,
    marginBottom: -2,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
