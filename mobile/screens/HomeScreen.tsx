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
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useFilters } from '../contexts/FiltersContext';
import { BRAND } from '../config/brand';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRY_NAMES } from '../utils/deviceLocation';
import { Bell, Users, MapPin, ChevronDown } from 'lucide-react-native';
import FeaturedCarousel from '../components/FeaturedCarousel';
import LocationDetectionBanner from '../components/LocationDetectionBanner';
import LocationPickerSheet from '../components/LocationPickerSheet';
import { DEFAULT_FILTERS } from '../types/filters';

import CategoryRail from '../components/CategoryRail';
import TrendingSection from '../components/TrendingSection';
import ThisWeekSection from '../components/ThisWeekSection';
import AllEventsPreview from '../components/AllEventsPreview';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import { Skeleton, PosterRailSkeleton } from '../components/Skeleton';

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

      // Filter out past events (be lenient - show events from past week that could be ongoing)
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const futureEvents: any[] = eventsData.filter((e) => {
        const start = e.start_datetime ? new Date(e.start_datetime) : null;
        const end = e.end_datetime ? new Date(e.end_datetime) : null;
        
        // If has end date, check if it's in the future
        if (end) return end >= now;
        // If only start date, show if started within past week
        if (start) return start >= oneWeekAgo;
        // No dates - show anyway
        return true;
      });

      const effectiveEvents = futureEvents.length > 0 ? futureEvents : eventsData;
      
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

  // Listen for tab press to scroll to top
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Check if we're already on this screen
      const state = navigation.getState();
      const currentRoute = state.routes[state.index];
      if (currentRoute.name === 'Home') {
        // Scroll to top
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
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
          <Image
            source={
              isDark
                ? require('../assets/tikem_wordmark_dark.png')
                : require('../assets/tikem_wordmark_light.png')
            }
            style={styles.wordmark}
            resizeMode="contain"
          />
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
        <View style={styles.headerRight}>
          {user ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Connections')}
              activeOpacity={0.7}
            >
              <Users size={21} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications', { userId: user?.uid || '' })}
            activeOpacity={0.7}
          >
            <Bell size={21} color={colors.text} />
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
          <View style={{ paddingTop: 16 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <Skeleton height={300} radius={20} />
            </View>
            <View style={{ height: 28 }} />
            <PosterRailSkeleton />
            <View style={{ height: 28 }} />
            <PosterRailSkeleton />
          </View>
        ) : (
          <>
            {/* Featured hero */}
            {featuredEvents.length > 0 && (
              <View style={styles.firstSection}>
                <FeaturedCarousel
                  events={featuredEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
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

            {/* Browse by Category — slim pills keep events the focus */}
            <View style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <SectionHeader title={t('home.browseTitle')} />
              </View>
              <CategoryRail onCategoryPress={handleCategoryPress} />
            </View>

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
                emoji="📭"
                title={t('home.emptyTitle')}
                subtitle={t('home.emptySubtitle')}
              />
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 32 }} />
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
    marginTop: 5,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    maxWidth: 200,
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
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  firstSection: {
    marginTop: 16,
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
