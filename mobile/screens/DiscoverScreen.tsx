import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
    Image,
  Dimensions,
  RefreshControl,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../hooks/useTabBarSpace';
import { Search, SlidersHorizontal, Users, CloudOff } from 'lucide-react-native';
import { collection, query, where, getDocs, limit, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { filterExploreEvents } from '../lib/api/events';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../theme/tokens';
import EventFiltersSheet from '../components/EventFiltersSheet';
import PosterEventCard from '../components/PosterEventCard';
import EmptyState from '../components/EmptyState';
import { Skeleton, DiscoverFeedSkeleton } from '../components/Skeleton';
import { DateFilter } from '../components/DateChips';
import WhenPickerSheet from '../components/WhenPickerSheet';
import LocationPickerSheet from '../components/LocationPickerSheet';
import { useFilters } from '../contexts/FiltersContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import DiscoverEventCard from '../components/DiscoverEventCard';
import { useAppAlert } from '../components/AppAlert';
import { isBudgetFriendlyTicketPrice } from '../lib/pricing';
import { applyFilters } from '../utils/filterUtils';
import { DEFAULT_FILTERS, getFeaturedCities } from '../types/filters';
import { getDateRange } from '../utils/filters';
import { fetchFriendsGoingCounts } from '../lib/api/social';
import { shareEvent } from '../lib/share';

const { width } = Dimensions.get('window');
const GRID_GAP = 16;
const COLUMN_WIDTH = (width - 32 - GRID_GAP) / 2;
// Match the Home rail poster exactly (Home uses CARD_WIDTH = min(248, width*0.62), no inset).
// Keep a side inset on Discover by widening the card by 2x the inset so the poster
// itself ends up the same width AND height as Home, with gutters on the sides.
const HOME_CARD_WIDTH = Math.min(248, width * 0.62);
const RAIL_INSET = 12;
const RAIL_WIDTH = HOME_CARD_WIDTH + RAIL_INSET * 2;

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
  // The tab bar is a translucent overlay, so reserve its height here or the
  // last row ends up sitting behind it.
  const tabBarSpace = useTabBarSpace();
  const { appliedFilters, openFiltersModal, hasActiveFilters, countActiveFilters, applyFiltersDirectly, resetFilters, userCountry } = useFilters();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const showAlert = useAppAlert();
  
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [happeningSoonEvents, setHappeningSoonEvents] = useState<any[]>([]);
  const [budgetEvents, setBudgetEvents] = useState<any[]>([]);
  const [onlineEvents, setOnlineEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [friendsGoingCounts, setFriendsGoingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
  // Which events the user has bookmarked — drives the card's save icon state
  // across all tabs (loaded once per user, updated optimistically on toggle).
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);
  // Full header height — the feed's top padding, so content scrolls UP behind
  // the transparent header instead of starting below a solid strip. Measured
  // once at rest; a sane default until then.
  const [headerH, setHeaderH] = useState(160);
  const headerMeasured = useRef(false);

  // Header collapse-on-scroll: as the feed scrolls down we crossfade the full
  // search pill + tabs out and a compact search/filter icon row in, so the
  // poster fills the screen. Layout/opacity animation → useNativeDriver:false.
  const scrollY = useRef(new Animated.Value(0)).current;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const COLLAPSE_AT = 72;

  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      setIsCollapsed((prev) => {
        if (!prev && value > COLLAPSE_AT) return true;
        // Hysteresis so it doesn't flicker right at the threshold.
        if (prev && value < COLLAPSE_AT - 20) return false;
        return prev;
      });
    });
    return () => scrollY.removeListener(id);
  }, [scrollY]);

  const expandedOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_AT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const collapsedOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_AT * 0.5, COLLAPSE_AT],
    outputRange: [0, 1],
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
    setError(false);
    try {
      const q = query(
        collection(db, 'events'),
        where('is_published', '==', true),
        limit(50)
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
      
      // Hide moderator-rejected events (client-side so we don't need a new
      // composite index). Missing field = not rejected, so existing events show.
      const notRejected = (eventsData as any[]).filter((e) => e.rejected !== true);

      // Hide events the organizer marked as not shown on Explore (unlisted).
      // Missing field = visible, so existing events are unaffected.
      const exploreEvents = filterExploreEvents(notRejected);

      const now = new Date();
      const futureEvents = exploreEvents.filter((event) => {
        const start = event.start_datetime ? new Date(event.start_datetime) : null
        const end = event.end_datetime ? new Date(event.end_datetime) : null
        const cutoff = end || start
        if (!cutoff) return false
        return cutoff >= now
      });

      console.log('[DiscoverScreen] Future events:', futureEvents.length, 'out of', exploreEvents.length, 'total');
      setAllEvents(futureEvents.length > 0 ? futureEvents : exploreEvents);
    } catch (err) {
      console.error('[DiscoverScreen] Error fetching events:', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  // Load the user's saved (favorited) event ids once so the bookmark icon shows
  // the right state on every card, not just the Saved tab.
  const loadSavedIds = useCallback(async () => {
    if (!user) { setSavedIds(new Set()); return; }
    try {
      const favs = await getDocs(
        query(collection(db, 'event_favorites'), where('user_id', '==', user.uid))
      );
      setSavedIds(new Set(favs.docs.map((d) => d.data().event_id)));
    } catch (e) {
      console.warn('[DiscoverScreen] Error loading saved ids:', e);
    }
  }, [user]);

  useEffect(() => { loadSavedIds(); }, [loadSavedIds]);

  // Share an event (native share sheet) via the shared, localized helper.
  const handleShareEvent = useCallback((event: any) => shareEvent(event, language), [language]);

  // Clear every active filter (context + local) so the "Clear filters" CTA on an
  // empty feed brings the full list back.
  const handleClearFilters = useCallback(() => {
    resetFilters();
    setSearchQuery('');
    setSelectedDate('any');
    setSelectedCategories([]);
    setSelectedCity('');
  }, [resetFilters]);

  // Toggle bookmark: optimistic UI + event_favorites write (add/remove).
  const toggleSaveEvent = useCallback(async (event: any) => {
    if (!user) {
      showAlert(t('auth.loginRequiredTitle'), t('eventDetail.favorites.loginBody'));
      return;
    }
    const id = event.id;
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id); else next.add(id);
      return next;
    });
    try {
      if (wasSaved) {
        const snap = await getDocs(query(
          collection(db, 'event_favorites'),
          where('user_id', '==', user.uid),
          where('event_id', '==', id),
        ));
        await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, 'event_favorites', d.id))));
        setSavedEvents((prev) => prev.filter((e) => e.id !== id));
      } else {
        await addDoc(collection(db, 'event_favorites'), {
          user_id: user.uid,
          event_id: id,
          created_at: Timestamp.now(),
        });
      }
    } catch (e) {
      console.warn('[DiscoverScreen] Toggle save failed:', e);
      // Roll back the optimistic change on failure.
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(id); else next.delete(id);
        return next;
      });
    }
  }, [user, savedIds, t]);

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
      posterInsetX={0}
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
              posterInsetX={RAIL_INSET}
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
      <View style={styles.container}>
        <View
          style={[styles.header, { paddingTop: insets.top + 8 }]}
          onLayout={(e) => {
            const h = e?.nativeEvent?.layout?.height ?? 0;
            if (h) setHeaderH(h);
          }}
        >
          <Skeleton height={44} radius={22} style={{ width: '100%' }} />
          <View style={styles.tabsRow}>
            <Skeleton width={64} height={16} radius={6} />
            <Skeleton width={78} height={16} radius={6} />
            <Skeleton width={52} height={16} radius={6} />
          </View>
        </View>
        {/* The header above is position: absolute — without this inset the
            skeleton cards rendered UNDERNEATH the search bar. Same reservation
            the loaded feed uses. */}
        <View style={{ paddingTop: headerH + 8 }}>
          <DiscoverFeedSkeleton />
        </View>
      </View>
    );
  }

  const hasAnyFilters = hasActiveFilters() || searchQuery.trim() !== '' || route?.params?.trending || route?.params?.thisWeek || route?.params?.allEvents || selectedDate !== 'any' || selectedCategories.length > 0 || selectedCity !== '';

  const renderFeed = (
    list: any[],
    emptyTitle: string,
    emptySubtitle: string,
    emptyAction?: { label: string; onAction: () => void },
  ) =>
    list.length === 0 ? (
      <EmptyState
        icon={Search}
        title={emptyTitle}
        subtitle={emptySubtitle}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onAction}
      />
    ) : (
      list.map((event) => (
        <DiscoverEventCard
          key={event.id}
          event={event}
          saved={savedIds.has(event.id)}
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          onShare={() => handleShareEvent(event)}
          onToggleSave={() => toggleSaveEvent(event)}
        />
      ))
    );

  // Ambient backdrop: the top poster of the active list, heavily blurred and
  // faded, so its colours wash faintly behind the header + feed instead of pure
  // black. Fades to solid black lower down so content stays legible.
  const ambientList = discoverTab === 'saved' ? savedEvents : feedEvents;
  const ambientUri = ambientList[0]?.banner_image_url || ambientList[0]?.cover_image_url || null;

  return (
    <View style={styles.container}>
      {ambientUri ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={{ uri: ambientUri }} style={styles.ambientImg} blurRadius={40} />
          <LinearGradient
            colors={['rgba(10,10,10,0.35)', 'rgba(10,10,10,0.9)', '#0A0A0A']}
            locations={[0, 0.55, 0.82]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      {/* Posh-style header: a fully transparent overlay the feed scrolls under
          (no scrim box) so the poster shows cleanly through. Only a very subtle
          top-only gradient keeps the controls legible on bright posters. On
          scroll it collapses to a compact search + filter icon row. */}
      <View
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
        onLayout={(e) => {
          if (headerMeasured.current) return;
          const h = e.nativeEvent.layout.height;
          if (h > 40) {
            headerMeasured.current = true;
            setHeaderH(h);
          }
        }}
      >
        <LinearGradient
          colors={['rgba(10,10,10,0.5)', 'rgba(10,10,10,0)']}
          style={styles.headerGradient}
          pointerEvents="none"
        />

        {/* Expanded state: full search pill + tabs. */}
        <Animated.View
          style={{ opacity: expandedOpacity }}
          pointerEvents={isCollapsed ? 'none' : 'box-none'}
        >
          <View style={styles.searchRow}>
            {/* Tapping the search pill opens the dedicated full-screen Search. */}
            <TouchableOpacity
              style={styles.searchPill}
              onPress={() => navigation.navigate('Search')}
              activeOpacity={0.75}
            >
              <Search size={20} color={colors.textSecondary} />
              <Text style={styles.searchPlaceholder} numberOfLines={1}>
                {t('discover.searchPlaceholder')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={openFiltersModal} activeOpacity={0.7}>
              <SlidersHorizontal size={20} color={colors.text} />
              {countActiveFilters() > 0 && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{countActiveFilters()}</Text>
                </View>
              )}
            </TouchableOpacity>
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
        </Animated.View>

        {/* Collapsed state: compact search + filter icons only (max poster). */}
        <Animated.View
          style={[styles.collapsedRow, { top: insets.top + 8, opacity: collapsedOpacity }]}
          pointerEvents={isCollapsed ? 'box-none' : 'none'}
        >
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <Search size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={openFiltersModal} activeOpacity={0.7}>
            <SlidersHorizontal size={20} color={colors.text} />
            {countActiveFilters() > 0 && (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{countActiveFilters()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Feed */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.contentUnderHeader}
        contentContainerStyle={[styles.feedContent, { paddingTop: headerH + 8, paddingBottom: 32 + tabBarSpace }]}
        showsVerticalScrollIndicator={false}
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
        {error && allEvents.length === 0 ? (
          <EmptyState
            icon={CloudOff}
            title={t('common.loadErrorTitle')}
            subtitle={t('common.loadErrorSubtitle')}
            actionLabel={t('common.retry')}
            onAction={onRefresh}
          />
        ) : (
          <>
            {discoverTab === 'forYou' &&
              renderFeed(
                feedEvents,
                t('discover.noEventsFound'),
                t('discover.tryAdjusting'),
                hasActiveFilters()
                  ? { label: t('discover.clearFilters'), onAction: handleClearFilters }
                  : undefined,
              )}

            {discoverTab === 'following' && (
              <EmptyState
                icon={Users}
                title={t('discover.following.emptyTitle')}
                subtitle={t('discover.following.emptySubtitle')}
                actionLabel={t('discover.following.syncContacts')}
                onAction={() => navigation.navigate('Connections', { autoSync: true })}
              />
            )}

            {discoverTab === 'saved' &&
              renderFeed(savedEvents, t('discover.saved.emptyTitle'), t('discover.saved.emptySubtitle'))}
          </>
        )}
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
  // The feed fills the whole screen (behind the absolute header) so posters
  // scroll up under the translucent header.
  contentUnderHeader: {
    flex: 1,
  },
  ambientImg: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    opacity: 0.45,
    resizeMode: 'cover',
  },
  header: {
    // Absolute FULLY-TRANSPARENT overlay (no scrim box): the feed scrolls UP
    // behind it so the poster shows cleanly through behind the search + tabs.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  // Very subtle top-only gradient — just enough contrast for legibility on
  // bright posters, fading to fully transparent (no box, no frosted panel).
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  // Collapsed header: a compact search + filter icon row pinned to the top,
  // shown when the feed is scrolled down for maximum poster visibility.
  collapsedRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Active-filter COUNT badge on the round filter button (replaces the bare dot).
  filterCountBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  filterCountText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  // Smaller, tighter segment tabs (POSH — compact, understated).
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 12,
    paddingBottom: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  horizontalScrollView: {
    marginHorizontal: -16,
  },
  carouselContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
});
