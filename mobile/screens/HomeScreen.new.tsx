import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BRAND } from ''../config/brand'';
import { useTheme } from '../contexts/ThemeContext';
import { Bell, Settings } from 'lucide-react-native';
import FeaturedCarousel from '../components/FeaturedCarousel';
import PremiumSearchBar from '../components/PremiumSearchBar';
import CategoryGrid from '../components/CategoryGrid';
import TrendingSection from '../components/TrendingSection';
import ThisWeekSection from '../components/ThisWeekSection';
import AllEventsPreview from '../components/AllEventsPreview';

export default function HomeScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<any[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async () => {
    try {
      // Get all published events
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true),
        orderBy('start_datetime', 'asc'),
        limit(50)
      );

      const snapshot = await getDocs(q);

      const eventsData = snapshot.docs.map((doc) => {
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

        return {
          id: doc.id,
          ...data,
          start_datetime: startDate,
        };
      });

      // Filter out past events
      const now = new Date();
      const futureEvents = eventsData.filter((e) => e.start_datetime >= now);

      setEvents(futureEvents);

      // Featured events (top 5 by tickets sold)
      const featured = [...futureEvents]
        .sort((a: any, b: any) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 5);
      setFeaturedEvents(featured);

      // Trending events (tickets_sold > 10)
      const trending = futureEvents
        .filter((e) => (e.tickets_sold || 0) > 10)
        .slice(0, 6);
      setTrendingEvents(trending);

      // This week events
      const oneWeekFromNow = new Date(now);
      oneWeekFromNow.setDate(now.getDate() + 7);
      const thisWeek = futureEvents
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

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCategoryPress = (category: string) => {
    navigation.navigate('Discover', { category });
  };

  const handleSearchPress = () => {
    navigation.navigate('Discover');
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleViewAllTrending = () => {
    navigation.navigate('Discover', { sort: 'popular' });
  };

  const handleViewAllThisWeek = () => {
    navigation.navigate('Discover', { date: 'week' });
  };

  const handleViewAllEvents = () => {
    navigation.navigate('Discover');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>{BRAND.logoText}</Text>
          <Text style={styles.greeting}>
            {userProfile?.full_name
              ? `Hi, ${userProfile.full_name.split(' ')[0]}!`
              : 'Welcome!'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Bell size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Settings size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <PremiumSearchBar onPress={handleSearchPress} />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Hero Carousel */}
        {!loading && featuredEvents.length > 0 && (
          <View style={styles.section}>
            <FeaturedCarousel events={featuredEvents} onEventPress={handleEventPress} />
          </View>
        )}

        {/* Browse by Category */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <Text style={styles.sectionSubtitle}>Find events that interest you</Text>
          </View>
          <CategoryGrid onCategoryPress={handleCategoryPress} />
        </View>

        {/* Trending Now */}
        {trendingEvents.length > 0 && (
          <TrendingSection
            events={trendingEvents}
            onEventPress={handleEventPress}
            onViewAll={handleViewAllTrending}
          />
        )}

        {/* This Week */}
        {thisWeekEvents.length > 0 && (
          <ThisWeekSection
            events={thisWeekEvents}
            onEventPress={handleEventPress}
            onViewAll={handleViewAllThisWeek}
          />
        )}

        {/* All Events Preview */}
        {events.length > 0 && (
          <AllEventsPreview
            events={events}
            onEventPress={handleEventPress}
            onViewAll={handleViewAllEvents}
          />
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading amazing events...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && events.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No Events Available</Text>
            <Text style={styles.emptyText}>Check back soon for exciting events!</Text>
          </View>
        )}

        {/* Bottom Spacing for Tab Bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 32,
  },
});
