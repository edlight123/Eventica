import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  TextInput,
  Animated,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, MapPin, Search, X, SlidersHorizontal } from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import FeaturedCarousel from '../components/FeaturedCarousel';
import EventFiltersSheet from '../components/EventFiltersSheet';
import EventStatusBadge from '../components/EventStatusBadge';
import { DateChips, DateFilter } from '../components/DateChips';
import { CategoryChips } from '../components/CategoryChips';
import { useFilters } from '../contexts/FiltersContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { isBudgetFriendlyTicketPrice } from '../lib/pricing';
import { applyFilters } from '../utils/filterUtils';
import { DEFAULT_FILTERS } from '../types/filters';
import { getDateRange } from '../utils/filters';

const { width } = Dimensions.get('window');

const HEADER_EXPANDED_HEIGHT = 145;
const HEADER_COLLAPSED_HEIGHT = 70;

export default function DiscoverScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { appliedFilters, openFiltersModal, hasActiveFilters, countActiveFilters, applyFiltersDirectly, resetFilters } = useFilters();
  const { t } = useI18n();
  
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningSoonEvents, setHappeningSoonEvents] = useState<any[]>([]);
  const [budgetEvents, setBudgetEvents] = useState<any[]>([]);
  const [onlineEvents, setOnlineEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateFilter>('any');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Animated header values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Interpolations for collapsing header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT],
    outputRange: [HEADER_EXPANDED_HEIGHT, HEADER_COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const headerShadowOpacity = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 0.15],
    extrapolate: 'clamp',
  });

  const searchBarScale = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.98],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Listen for tab press to scroll to top and reset filters
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Check if we're already on this screen
      const state = navigation.getState();
      const currentRoute = state.routes[state.index];
      if (currentRoute.name === 'Discover') {
        // Scroll to top
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        // Reset filters and search
        resetFilters();
        setSearchQuery('');
        setSelectedDate('any');
        setSelectedCategories([]);
        // Reset route params
        navigation.setParams({ category: undefined, trending: undefined, thisWeek: undefined });
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Handle special navigation params: category, trending, thisWeek, allEvents
  useEffect(() => {
    const { category, trending, thisWeek, allEvents, timestamp } = route?.params || {};
    
    if (category) {
      console.log('[DiscoverScreen] Applying category filter:', category);
      const categoryFilter = {
        ...DEFAULT_FILTERS,
        categories: [category]
      };
      applyFiltersDirectly(categoryFilter);
    } else if (trending) {
      console.log('[DiscoverScreen] Filtering for trending events');
      // Filter trending events in organizeEvents
      setSearchQuery('');
    } else if (thisWeek) {
      console.log('[DiscoverScreen] Filtering for this week events');
      // Filter this week events in organizeEvents
      setSearchQuery('');
    } else if (allEvents) {
      console.log('[DiscoverScreen] Showing all events list');
      // This will skip featured carousels and show full list
      setSearchQuery('');
    }
  }, [route?.params?.category, route?.params?.trending, route?.params?.thisWeek, route?.params?.allEvents, route?.params?.timestamp]);

  // Re-organize events when filters change
  useEffect(() => {
    if (allEvents.length > 0) {
      organizeEvents();
    }
  }, [allEvents, appliedFilters, searchQuery, selectedDate, selectedCategories, route?.params]);

  const fetchEvents = async () => {
    try {
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true)
      );
      
      const snapshot = await getDocs(q);
      console.log('[DiscoverScreen] Fetched', snapshot.docs.length, 'published events');
      
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        
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
          end_datetime: endDate
        };
      });

      // Sort client-side to avoid requiring a composite Firestore index.
      eventsData.sort((a, b) => {
        const aTime = a?.start_datetime ? new Date(a.start_datetime).getTime() : Number.POSITIVE_INFINITY
        const bTime = b?.start_datetime ? new Date(b.start_datetime).getTime() : Number.POSITIVE_INFINITY
        return aTime - bTime
      })
      
      const now = new Date();
      const futureEvents = eventsData.filter((event) => {
        const start = event.start_datetime ? new Date(event.start_datetime) : null
        const end = event.end_datetime ? new Date(event.end_datetime) : null
        const cutoff = end || start
        if (!cutoff) return false
        return cutoff >= now
      });
      
      console.log('[DiscoverScreen] Future events:', futureEvents.length, 'out of', eventsData.length, 'total');
      setAllEvents(futureEvents.length > 0 ? futureEvents : eventsData);
    } catch (error) {
      console.error('[DiscoverScreen] Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const filterBySearch = (events: any[]) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.venue_name?.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    );
  };

  const filterByDate = (events: any[]) => {
    const { start, end } = getDateRange(selectedDate);
    
    // If no date range (filter is 'any'), return all events
    if (!start && !end) return events;
    
    return events.filter(event => {
      const eventDate = new Date(event.start_datetime);
      
      // If event has a start date, check if it falls within the range
      if (start && eventDate < start) return false;
      if (end && eventDate > end) return false;
      
      return true;
    });
  };

  const filterByCategory = (events: any[]) => {
    if (selectedCategories.length === 0) return events;
    return events.filter(event => 
      selectedCategories.includes(event.category)
    );
  };

  const filterByTrending = (events: any[]) => {
    return events.filter(e => (e.tickets_sold || 0) > 10);
  };

  const filterByThisWeek = (events: any[]) => {
    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(now.getDate() + 7);
    return events.filter(e => e.start_datetime && e.start_datetime <= oneWeekFromNow);
  };

  const organizeEvents = () => {
    let events = [...allEvents];
    const { trending, thisWeek } = route?.params || {};
    
    console.log('[DiscoverScreen] Organizing', events.length, 'events');
    console.log('[DiscoverScreen] Route params:', { trending, thisWeek });

    // Apply special filters from navigation
    if (trending) {
      events = filterByTrending(events);
      console.log('[DiscoverScreen] Trending filtered:', events.length, 'events');
    } else if (thisWeek) {
      events = filterByThisWeek(events);
      console.log('[DiscoverScreen] This week filtered:', events.length, 'events');
    }

    // Apply main filters from context
    events = applyFilters(events, appliedFilters);
    console.log('[DiscoverScreen] After context filtering:', events.length, 'events');
    
    // Apply date and category filters
    events = filterByDate(events);
    events = filterByCategory(events);
    console.log('[DiscoverScreen] After date/category filtering:', events.length, 'events');
    
    // Apply search filter
    events = filterBySearch(events);

    const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '' || trending || thisWeek || route?.params?.allEvents || selectedDate !== 'any' || selectedCategories.length > 0;

    if (hasAnyFilters) {
      console.log('[DiscoverScreen] Showing filtered results:', events.length);
      setFilteredEvents(events);
      setFeaturedEvents([]);
      setHappeningSoonEvents([]);
      setBudgetEvents([]);
      setOnlineEvents([]);
    } else {
      setFilteredEvents([]);
      
      const featured = [...events]
        .sort((a, b) => (b.tickets_sold || 0) - (a.tickets_sold || 0))
        .slice(0, 6);
      setFeaturedEvents(featured);

      const happeningSoon = events
        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
        .slice(0, 8);
      setHappeningSoonEvents(happeningSoon);

      const budget = events
        .filter((e) => isBudgetFriendlyTicketPrice(e?.ticket_price, e?.currency))
        .slice(0, 8);
      setBudgetEvents(budget);

      const online = events.filter(e => e.event_type === 'online' || e.venue_name?.toLowerCase().includes('online')).slice(0, 6);
      setOnlineEvents(online);
    }
  };

  const AnimatedEventCard = ({ event, index }: { event: any; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
    const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0;
    const isVIP = (event.ticket_price || 0) > 100;
    const isTrending = (event.tickets_sold || 0) > 10;
    const isFree = !event.ticket_price || event.ticket_price === 0;
    const isNew = new Date(event.start_datetime).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          key={`${event.id}-${index}`}
          style={[
            styles.eventCard,
            (isVIP || isTrending) && styles.eventCardPremium,
          ]}
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          {event.banner_image_url && (
            <Image 
              source={{ uri: event.banner_image_url }} 
              style={styles.eventImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.badgesTopLeft}>
            {event.category && (
              <View style={styles.categoryBadgeOverlay}>
                <Text style={styles.categoryBadgeText}>{getCategoryLabel(t, event.category)}</Text>
              </View>
            )}
            {isVIP && <EventStatusBadge status="VIP" size="small" />}
            {isTrending && <EventStatusBadge status="Trending" size="small" />}
            {isNew && <EventStatusBadge status="New" size="small" />}
          </View>

          {isSoldOut && (
            <View style={styles.badgesTopRight}>
              <EventStatusBadge status="Sold Out" size="small" />
            </View>
          )}

          <View style={styles.eventCardContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
            
            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={styles.eventDetailText}>
                  {event.start_datetime && format(event.start_datetime, 'MMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.eventDetailRow}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={styles.eventDetailText} numberOfLines={1}>
                  {event.venue_name}
                </Text>
              </View>
            </View>
            
            <View style={styles.eventFooter}>
              {!isFree && event.ticket_price > 0 ? (
                <Text style={styles.eventPrice}>
                  {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
                </Text>
              ) : (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeBadgeText}>{t('common.free').toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEventCard = (event: any, index: number) => (
    <AnimatedEventCard event={event} index={index} key={`${event.id}-${index}`} />
  );

  const renderSection = (title: string, subtitle: string, emoji: string, events: any[]) => {
    if (events.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{emoji} {title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScrollView}
          contentContainerStyle={styles.carouselContent}
        >
          {events.slice(0, 8).map((event, index) => renderEventCardHorizontal(event, index))}
        </ScrollView>
      </View>
    );
  };

  const renderEventCardHorizontal = (event: any, index: number) => (
    <TouchableOpacity
      key={`${event.id}-${index}`}
      style={styles.carouselCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.9}
    >
      {event.banner_image_url && (
        <Image 
          source={{ uri: event.banner_image_url }} 
          style={styles.carouselImage}
          resizeMode="cover"
        />
      )}
      
      {event.category && (
        <View style={styles.carouselCategoryBadge}>
          <Text style={styles.categoryBadgeText}>{getCategoryLabel(t, event.category)}</Text>
        </View>
      )}

      <View style={styles.carouselCardContent}>
        <Text style={styles.carouselTitle} numberOfLines={2}>{event.title}</Text>
        
        <View style={styles.carouselDetails}>
          <View style={styles.carouselDetailRow}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={styles.carouselDetailText}>
              {event.start_datetime && format(event.start_datetime, 'MMM dd')}
            </Text>
          </View>
          <View style={styles.carouselDetailRow}>
            <MapPin size={12} color={colors.textSecondary} />
            <Text style={styles.carouselDetailText} numberOfLines={1}>
              {event.city}
            </Text>
          </View>
        </View>
        
        <View style={styles.carouselFooter}>
          {event.ticket_price > 0 ? (
            <Text style={styles.carouselPrice}>
              {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
            </Text>
          ) : (
            <View style={styles.carouselFreeBadge}>
              <Text style={styles.carouselFreeBadgeText}>{t('common.free').toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getFilterTitle = () => {
    const { trending, thisWeek } = route?.params || {};
    if (trending) return t('discover.filterTitles.trending');
    if (thisWeek) return t('discover.filterTitles.thisWeek');
    if (searchQuery.trim()) return t('discover.filterTitles.search');
    if (hasActiveFilters()) return t('discover.filterTitles.filtered');
    return null;
  };

  const getFilterSubtitle = () => {
    const { trending, thisWeek } = route?.params || {};
    if (trending) return t('discover.filterSubtitles.trending');
    if (thisWeek) return t('discover.filterSubtitles.thisWeek');
    return `${filteredEvents.length} ${filteredEvents.length === 1 ? t('discover.eventFound') : t('discover.eventsFound')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '' || route?.params?.trending || route?.params?.thisWeek || route?.params?.allEvents || selectedDate !== 'any' || selectedCategories.length > 0;

  return (
    <View style={styles.container}>
      {/* Animated Collapsing Header */}
      <Animated.View 
        style={[
          styles.animatedHeader,
          {
            height: headerHeight,
            shadowOpacity: headerShadowOpacity,
          }
        ]}
      >
        {/* Title and Subtitle removed per user request */}

        {/* Search Bar - stays visible but scales slightly */}
        <Animated.View 
          style={[
            styles.searchSection,
            {
              transform: [{ scale: searchBarScale }],
              marginTop: 8,
            }
          ]}
        >
          <View style={styles.searchInputContainer}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('discover.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={openFiltersModal}
          >
            <SlidersHorizontal size={20} color={colors.text} />
            {hasActiveFilters() && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {countActiveFilters()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Active Filters Indicator */}
      {(hasActiveFilters() || searchQuery.trim() !== '') && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {searchQuery.trim() !== '' && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>{t('discover.searchActive')}: {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
            {hasActiveFilters() && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {countActiveFilters()} {countActiveFilters() === 1 ? t('discover.filter') : t('discover.filters')} {countActiveFilters() === 1 ? t('discover.appliedSingular') : t('discover.appliedPlural')}
                </Text>
                <TouchableOpacity onPress={openFiltersModal}>
                  <SlidersHorizontal size={14} color={colors.text} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Scrollable Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.content}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* When Chips - Between search and featured */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsSectionTitle}>{t('discover.when').toUpperCase()}</Text>
          <DateChips 
            currentDate={selectedDate} 
            onDateChange={setSelectedDate}
          />
        </View>

        {/* Featured Carousel (only when no filters) */}
        {!hasAnyFilters && featuredEvents.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredHeader}>
              <Text style={styles.sectionTitle}>⭐ {t('discover.featuredWeekendTitle')}</Text>
              <Text style={styles.sectionSubtitle}>{t('discover.featuredWeekendSubtitle')}</Text>
            </View>
            <FeaturedCarousel 
              events={featuredEvents} 
              onEventPress={(eventId) => navigation.navigate('EventDetail', { eventId })} 
            />
          </View>
        )}

        {/* Category Chips - Between featured and happening soon */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsSectionTitle}>{t('discover.categories').toUpperCase()}</Text>
          <CategoryChips 
            selectedCategories={selectedCategories} 
            onCategoryToggle={(category) => {
              setSelectedCategories(prev => 
                prev.includes(category) 
                  ? prev.filter(c => c !== category)
                  : [...prev, category]
              );
            }}
          />
        </View>

        {/* Content Sections */}
        {hasAnyFilters ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{getFilterTitle()}</Text>
              <Text style={styles.sectionSubtitle}>{getFilterSubtitle()}</Text>
            </View>
            {filteredEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>{t('discover.noEventsFound')}</Text>
                <Text style={styles.emptyText}>
                  {t('discover.tryAdjusting')}
                </Text>
              </View>
            ) : (
              filteredEvents.map((event, index) => renderEventCard(event, index))
            )}
          </View>
        ) : (
          <>
            {renderSection(t('discover.sections.happeningSoonTitle'), t('discover.sections.happeningSoonSubtitle'), '🔥', happeningSoonEvents)}
            {renderSection(t('discover.sections.budgetTitle'), t('discover.sections.budgetSubtitle'), '💰', budgetEvents)}
            {renderSection(t('discover.sections.onlineTitle'), t('discover.sections.onlineSubtitle'), '💻', onlineEvents)}
            
            {happeningSoonEvents.length === 0 && budgetEvents.length === 0 && onlineEvents.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyTitle}>{t('discover.noEventsAvailable')}</Text>
                <Text style={styles.emptyText}>{t('discover.checkBackSoon')}</Text>
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      <EventFiltersSheet />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  animatedHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  headerTextContainer: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeFiltersContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  featuredSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  featuredHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  horizontalScrollView: {
    marginHorizontal: -16,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselCard: {
    width: 180,
    marginRight: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.border,
  },
  carouselCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  carouselCardContent: {
    padding: 12,
  },
  carouselTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  carouselDetails: {
    gap: 4,
    marginBottom: 8,
  },
  carouselDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  carouselFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  carouselPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  carouselFreeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  carouselFreeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  eventCardPremium: {
    borderWidth: 1.5,
    borderColor: colors.primaryLight + '30',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.border,
  },
  badgesTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '60%',
  },
  badgesTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  categoryBadgeOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  eventCardContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  freeBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  freeBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
  },
  chipsSection: {
    marginTop: 1,
    marginBottom: 12,
  },
  chipsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
