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
import { BRAND } from ''../config/brand'';
import { useTheme } from '../contexts/ThemeContext';
import { Bell } from 'lucide-react-native';
import FeaturedCarousel from '../components/FeaturedCarousel';
import LocationDetectionBanner from '../components/LocationDetectionBanner';

import CategoryGrid from '../components/CategoryGrid';
import TrendingSection from '../components/TrendingSection';
import ThisWeekSection from '../components/ThisWeekSection';
import AllEventsPreview from '../components/AllEventsPreview';

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { userCountry } = useFilters();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Location Detection Banner */}
      <LocationDetectionBanner />

      {/* Compact Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            paddingTop: insets.top + 8,
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
            source={require('../assets/eventica_logo_white.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Eventica</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications', { userId: user?.uid || '' })}
            activeOpacity={0.7}
          >
            <Bell size={24} color="white" />
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
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('home.loading')}</Text>
          </View>
        ) : (
          <>
            {/* Featured Carousel */}
            {featuredEvents.length > 0 && (
              <View style={styles.firstSection}>
                <FeaturedCarousel
                  events={featuredEvents}
                  onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })}
                />
              </View>
            )}

            {/* Browse by Category */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitleBase}>{t('home.browseTitle')}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>{t('home.browseSubtitle')}</Text>
              </View>
              <View style={styles.categoryContainer}>
                <CategoryGrid onCategoryPress={handleCategoryPress} />
              </View>
            </View>

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
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>📭</Text>
                <Text style={styles.emptyTitle}>{t('home.emptyTitle')}</Text>
                <Text style={styles.emptySubtitle}>{t('home.emptySubtitle')}</Text>
              </View>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: 32 }} />
          </>
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
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
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
  categoryContainer: {
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.borderLight,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 1,
  },
  categoryText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
    marginRight: 8,
  },
  shareButton: {
    padding: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  eventPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  eventFree: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  ticketsSold: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
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
