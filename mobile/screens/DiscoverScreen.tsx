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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, MapPin, Search, X, SlidersHorizontal, Users } from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import FeaturedCarousel from '../components/FeaturedCarousel';
import EventFiltersSheet from '../components/EventFiltersSheet';
import EventStatusBadge from '../components/EventStatusBadge';
import PosterEventCard from '../components/PosterEventCard';
import EmptyState from '../components/EmptyState';
import { PosterRailSkeleton } from '../components/Skeleton';
import { DateFilter } from '../components/DateChips';
import FilterPill from '../components/FilterPill';
import WhenPickerSheet from '../components/WhenPickerSheet';
import LocationPickerSheet from '../components/LocationPickerSheet';
import { useFilters } from '../contexts/FiltersContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import DiscoverEventCard from '../components/DiscoverEventCard';
import { getCategoryLabel } from '../lib/categories';
import { isBudgetFriendlyTicketPrice } from '../lib/pricing';
import { applyFilters } from '../utils/filterUtils';
import { DEFAULT_FILTERS, getFeaturedCities } from '../types/filters';
import { getDateRange } from '../utils/filters';
import { fetchFriendsGoingCounts } from '../lib/api/social';

const { width } = Dimensions.get('window');
const GRID_GAP = 16;
const COLUMN_WIDTH = (width - 32 - GRID_GAP) / 2;
const RAIL_WIDTH = Math.min(248, width * 0.62);

const HEADER_EXPANDED_HEIGHT = 145;
const HEADER_COLLAPSED_HEIGHT = 70;

// Location matching tolerant to accents, case and "City, ST" suffixes so the
// town rails line up with whatever string is stored on each event's `city`.
const normalizeCity = (s: any): string =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const cityMatches = (eventCity: any, target: string): boolean => {
  const e = normalizeCity(eventCity);
  if (!e) return false;
  const full = normalizeCity(target);
  const short = normalizeCity(target.split(',')[0]);
  return e === full || e === short || e.includes(short) || short.includes(e);
};

export default function DiscoverScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  // Keep the original content heights but base the top padding on the real
  // device inset so the search bar never sits under the status bar. The
  // expanded→collapsed delta stays 75, so the scroll input range is unchanged.
  const expandedHeaderHeight = HEADER_EXPANDED_HEIGHT - 50 + insets.top;
  const collapsedHeaderHeight = HEADER_COLLAPSED_HEIGHT - 50 + insets.top;
  const { appliedFilters, openFiltersModal, hasActiveFilters, countActiveFilters, applyFiltersDirectly, resetFilters, userCountry } = useFilters();
  const { user } = useAuth();
  const { t } = useI18n();
  
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningSoonEvents, setHappeningSoonEvents] = useState<any[]>([]);
  const [budgetEvents, setBudgetEvents] = useState<any[]>([]);
  const [onlineEvents, setOnlineEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [friendsGoingCounts, setFriendsGoingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateFilter>('any');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [cityRails, setCityRails] = useState<{ city: string; events: any[] }[]>([]);
  const [whereSheetOpen, setWhereSheetOpen] = useState(false);
  const [whenSheetOpen, setWhenSheetOpen] = useState(false);
  // Posh-style Discover: a focused feed with For You / Following / Saved tabs.
  const [feedEvents, setFeedEvents] = useState<any[]>([]);
  const [discoverTab, setDiscoverTab] = useState<'forYou' | 'following' | 'saved'>('forYou');
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState(false);

  const DATE_LABEL_KEYS: Record<DateFilter, string> = {
    'any': 'filters.dateOptions.any',
    'today': 'filters.dateOptions.today',
    'tomorrow': 'filters.dateOptions.tomorrow',
    'this-week': 'filters.dateOptions.thisWeek',
    'this-weekend': 'filters.dateOptions.thisWeekend',
  };
  const whenPillValue = selectedDate !== 'any' ? t(DATE_LABEL_KEYS[selectedDate]) : null;
  
  // Animated header values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Interpolations for collapsing header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_EXPANDED_HEIGHT - HEADER_COLLAPSED_HEIGHT],
    outputRange: [expandedHeaderHeight, collapsedHeaderHeight],
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
        setSelectedCity('');
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
  }, [allEvents, appliedFilters, searchQuery, selectedDate, selectedCategories, selectedCity, route?.params]);

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

  // Saved tab — the user's favorited events, matched against the loaded set.
  useEffect(() => {
    if (discoverTab !== 'saved' || !user) return;
    let active = true;
    (async () => {
      try {
        const favs = await getDocs(
          query(collection(db, 'event_favorites'), where('user_id', '==', user.uid))
        );
        const ids = new Set(favs.docs.map((d) => d.data().event_id));
        if (active) setSavedEvents(allEvents.filter((e) => ids.has(e.id)));
      } catch (e) {
        console.error('[DiscoverScreen] Error loading saved events:', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [discoverTab, user, allEvents]);

  // Load "friends going" counts whenever the visible event set changes.
  useEffect(() => {
    const ids = allEvents.map((e) => e?.id).filter(Boolean);
    if (ids.length === 0) {
      setFriendsGoingCounts({});
      return;
    }
    let active = true;
    fetchFriendsGoingCounts(ids)
      .then((counts) => {
        if (active) setFriendsGoingCounts(counts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [allEvents]);

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

  const filterByCity = (events: any[]) => {
    if (!selectedCity) return events;
    return events.filter(event => cityMatches(event.city, selectedCity));
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

    // Graceful fallback: the auto-detected device country (e.g. "US") must never
    // hide every event. If context filtering empties the list and the user hasn't
    // explicitly chosen any filters, drop the silent country default and show all.
    if (events.length === 0 && !hasActiveFilters()) {
      events = applyFilters([...allEvents], { ...appliedFilters, country: '', city: '' });
      console.log('[DiscoverScreen] Country fallback applied:', events.length, 'events');
    }
    
    // Apply date and category filters
    events = filterByDate(events);
    events = filterByCategory(events);
    events = filterByCity(events);
    console.log('[DiscoverScreen] After date/category filtering:', events.length, 'events');
    
    // Apply search filter
    events = filterBySearch(events);

    // The single, filtered + chronologically sorted feed used by the "For You" tab.
    const feed = [...events].sort(
      (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );
    setFeedEvents(feed);

    const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '' || trending || thisWeek || route?.params?.allEvents || selectedDate !== 'any' || selectedCategories.length > 0 || selectedCity !== '';

    if (hasAnyFilters) {
      console.log('[DiscoverScreen] Showing filtered results:', events.length);
      setFilteredEvents(events);
      setFeaturedEvents([]);
      setHappeningSoonEvents([]);
      setBudgetEvents([]);
      setOnlineEvents([]);
      setCityRails([]);
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

      // Location-first browsing: one horizontal rail per featured town that
      // actually has events, ordered by the user's country (Haiti-first).
      const featuredCities = getFeaturedCities(userCountry);
      const rails = featuredCities
        .map((city) => ({
          city,
          events: events.filter((e) => cityMatches(e.city, city)).slice(0, 8),
        }))
        .filter((rail) => rail.events.length > 0);
      setCityRails(rails);
    }
  };

  const renderEventCard = (event: any, index: number) => (
    <PosterEventCard
      key={`${event.id}-${index}`}
      event={event}
      width={COLUMN_WIDTH}
      friendsGoing={friendsGoingCounts[event.id]}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
    />
  );

  const renderSection = (title: string, subtitle: string, _emoji: string, events: any[], onSeeAll?: () => void) => {
    if (events.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>{title.toLowerCase()}</Text>
          </View>
          {onSeeAll && (
            <TouchableOpacity
              onPress={onSeeAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAllText}>{t('discover.seeAll').toLowerCase()}</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScrollView}
          contentContainerStyle={styles.carouselContent}
          snapToInterval={RAIL_WIDTH + 16}
          decelerationRate="fast"
        >
          {events.slice(0, 8).map((event, index) => (
            <PosterEventCard
              key={`${event.id}-${index}`}
              event={event}
              width={RAIL_WIDTH}
              friendsGoing={friendsGoingCounts[event.id]}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const getFilterTitle = () => {
    const { trending, thisWeek } = route?.params || {};
    if (trending) return t('discover.filterTitles.trending');
    if (thisWeek) return t('discover.filterTitles.thisWeek');
    if (selectedCity) return `${t('discover.inArea')} ${selectedCity}`;
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
      <View style={[styles.container, { paddingTop: insets.top + 70 }]}>
        <PosterRailSkeleton />
        <View style={{ height: 28 }} />
        <PosterRailSkeleton />
      </View>
    );
  }

  const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '' || route?.params?.trending || route?.params?.thisWeek || route?.params?.allEvents || selectedDate !== 'any' || selectedCategories.length > 0 || selectedCity !== '';

  const dateSummary = selectedDate !== 'any' ? whenPillValue : t('filters.dateOptions.any');
  const locationSummary = selectedCity || t('discover.allCities');

  const renderFeed = (list: any[], emptyTitle: string, emptySubtitle: string) =>
    list.length === 0 ? (
      <EmptyState icon={Search} title={emptyTitle} subtitle={emptySubtitle} />
    ) : (
      list.map((event) => (
        <DiscoverEventCard
          key={event.id}
          event={event}
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
        />
      ))
    );

  return (
    <View style={styles.container}>
      {/* Posh-style header: filter/search pill + segmented tabs */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchPill}>
          {searchMode ? (
            <>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('discover.searchPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchMode(false); }} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setSearchMode(true)} hitSlop={8}>
                <Search size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.pillCenter} onPress={openFiltersModal} activeOpacity={0.7}>
                <Text style={styles.pillText} numberOfLines={1}>
                  <Text style={styles.pillTextStrong}>{dateSummary}</Text>
                  <Text>  {locationSummary}</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openFiltersModal} hitSlop={8}>
                <SlidersHorizontal size={20} color={colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.tabsRow}>
          {([
            { key: 'forYou', label: t('discover.tabs.forYou') },
            { key: 'following', label: t('discover.tabs.following') },
            { key: 'saved', label: t('discover.tabs.saved') },
          ] as const).map((tab) => (
            <TouchableOpacity key={tab.key} onPress={() => setDiscoverTab(tab.key)} hitSlop={8}>
              <Text style={[styles.tabText, discoverTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {discoverTab === 'forYou' &&
          renderFeed(feedEvents, t('discover.noEventsFound'), t('discover.tryAdjusting'))}

        {discoverTab === 'following' && (
          <EmptyState
            icon={Users}
            title={t('discover.following.emptyTitle')}
            subtitle={t('discover.following.emptySubtitle')}
            actionLabel={t('discover.following.syncContacts')}
            onAction={() => navigation.navigate('Connections')}
          />
        )}

        {discoverTab === 'saved' &&
          renderFeed(savedEvents, t('discover.saved.emptyTitle'), t('discover.saved.emptySubtitle'))}
      </ScrollView>

      <EventFiltersSheet />

      <LocationPickerSheet
        visible={whereSheetOpen}
        onClose={() => setWhereSheetOpen(false)}
        selectedCity={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city);
          setWhereSheetOpen(false);
        }}
      />

      <WhenPickerSheet
        visible={whenSheetOpen}
        onClose={() => setWhenSheetOpen(false)}
        value={selectedDate}
        onSelect={setSelectedDate}
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  animatedHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
  filterPillsBar: {
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 9,
  },
  filterPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
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
    borderRadius: 8,
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
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pillText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  pillTextStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    paddingTop: 16,
    paddingBottom: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.text,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 12,
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
    gap: 16,
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
