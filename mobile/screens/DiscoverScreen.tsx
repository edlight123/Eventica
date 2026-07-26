import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Share,
  Alert,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, MapPin, Search, X, SlidersHorizontal, Users } from 'lucide-react-native';
import { collection, query, where, getDocs, limit, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { filterExploreEvents } from '../lib/api/events';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { font } from '../theme/tokens';
import FeaturedCarousel from '../components/FeaturedCarousel';
import EventFiltersSheet from '../components/EventFiltersSheet';
import EventStatusBadge from '../components/EventStatusBadge';
import PosterEventCard from '../components/PosterEventCard';
import EmptyState from '../components/EmptyState';
import { Skeleton, DiscoverFeedSkeleton } from '../components/Skeleton';
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
  // Two-stage search: `searchText` is the instant TextInput value (drives the
  // typeahead suggestions), `searchQuery` is the debounced value that actually
  // re-filters the feed — so heavy re-renders don't fire on every keystroke.
  const [searchText, setSearchText] = useState('');
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
  // Whether the search field is active — drives the typeahead suggestions panel.
  const [searchFocused, setSearchFocused] = useState(false);

  // Animated header values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  // Measured height of the big serif masthead so we can collapse exactly it
  // (freeing that space) on scroll while keeping the search pill + tabs pinned.
  // Measured ONCE at rest — measuring again while the container is animating to
  // height 0 can report the clipped value and lock the masthead collapsed.
  const [headlineH, setHeadlineH] = useState(64);
  const headlineMeasured = useRef(false);
  // Full (expanded) header height — the feed's top padding, so content scrolls
  // UP behind the translucent header instead of starting below a solid strip.
  // Measured once at rest (masthead expanded); a sane default until then.
  const [headerH, setHeaderH] = useState(220);
  const headerMeasured = useRef(false);
  
  // Collapse the masthead's height + fade it as the feed scrolls up.
  const headlineCollapse = scrollY.interpolate({
    inputRange: [0, 44],
    outputRange: [headlineH, 0],
    extrapolate: 'clamp',
  });
  const headlineOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  // Debounce the search field: re-filter the feed ~220ms after the user stops
  // typing rather than on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchText.trim()), 220);
    return () => clearTimeout(id);
  }, [searchText]);

  // Clear the search box (used by the X button and the tab-press reset).
  const clearSearch = useCallback(() => {
    setSearchText('');
    setSearchQuery('');
  }, []);

  // Apply a tapped suggestion: fill the box, filter immediately, dismiss panel.
  const applySuggestion = useCallback((value: string) => {
    setSearchText(value);
    setSearchQuery(value.trim());
    setSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  // Typeahead suggestions — matching event names first, then categories, venues
  // and organizers. Derived from the instant `searchText` so it feels live.
  const suggestions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (q.length < 2) return [] as { key: string; label: string; query: string; kind: string }[];
    const seen = new Set<string>();
    const out: { key: string; label: string; query: string; kind: string }[] = [];
    const push = (label: any, query: string, kind: string) => {
      const text = (label ?? '').toString().trim();
      if (!text || out.length >= 7) return;
      const dedupe = `${kind}:${text.toLowerCase()}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      out.push({ key: dedupe, label: text, query, kind });
    };
    // Pass 1: event titles (the primary match).
    for (const e of allEvents) {
      if (out.length >= 7) break;
      if (e?.title && e.title.toLowerCase().includes(q)) push(e.title, e.title, 'event');
    }
    // Pass 2: categories (localized label), venues, organizers.
    for (const e of allEvents) {
      if (out.length >= 7) break;
      const catLabel = e?.category ? getCategoryLabel(t, e.category) : '';
      if (catLabel && catLabel.toLowerCase().includes(q)) push(catLabel, catLabel, 'category');
      if (e?.venue_name && e.venue_name.toLowerCase().includes(q)) push(e.venue_name, e.venue_name, 'venue');
      const organizer = e?.users?.organization_name || e?.users?.full_name || e?.organizer_name;
      if (organizer && organizer.toLowerCase().includes(q)) push(organizer, organizer, 'organizer');
    }
    return out;
  }, [allEvents, searchText, t]);

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
        setSearchText('');
        setSearchQuery('');
        setSearchFocused(false);
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

  // Share an event (native share sheet).
  const handleShareEvent = useCallback(async (event: any) => {
    try {
      await Share.share({
        title: event.title,
        message: `${event.title}\n\nhttps://tikem.co/events/${event.id}`,
      });
    } catch (e) {
      console.warn('[DiscoverScreen] Share failed:', e);
    }
  }, []);

  // Toggle bookmark: optimistic UI + event_favorites write (add/remove).
  const toggleSaveEvent = useCallback(async (event: any) => {
    if (!user) {
      Alert.alert(t('auth.loginRequiredTitle'), t('eventDetail.favorites.loginBody'));
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
    return events.filter(event => {
      const organizer = event.users?.organization_name || event.users?.full_name || event.organizer_name || '';
      const categoryLabel = event.category ? getCategoryLabel(t, event.category) : '';
      return (
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.venue_name?.toLowerCase().includes(query) ||
        event.city?.toLowerCase().includes(query) ||
        event.category?.toLowerCase().includes(query) ||
        categoryLabel.toLowerCase().includes(query) ||
        organizer.toLowerCase().includes(query)
      );
    });
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
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Skeleton height={44} radius={22} style={{ width: '100%' }} />
          <View style={styles.tabsRow}>
            <Skeleton width={64} height={16} radius={6} />
            <Skeleton width={78} height={16} radius={6} />
            <Skeleton width={52} height={16} radius={6} />
          </View>
        </View>
        <DiscoverFeedSkeleton />
      </View>
    );
  }

  const activeFilterCount = countActiveFilters();

  const renderFeed = (list: any[], emptyTitle: string, emptySubtitle: string) =>
    list.length === 0 ? (
      <EmptyState icon={Search} title={emptyTitle} subtitle={emptySubtitle} />
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

      {/* Posh-style header: a translucent BLUR overlay the feed scrolls under, so
          the poster shows through behind the search pill + tabs. */}
      <View
        style={[styles.header, { paddingTop: insets.top + 8 }]}
        onLayout={(e) => {
          if (headerMeasured.current) return;
          const h = e.nativeEvent.layout.height;
          if (h > 40) {
            headerMeasured.current = true;
            setHeaderH(h);
          }
        }}
      >
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.headerScrim} pointerEvents="none" />
        {/* Masthead — collapses + fades on scroll, reappears on scroll up. */}
        <Animated.View style={{ height: headlineCollapse, opacity: headlineOpacity, overflow: 'hidden' }}>
          <View
            onLayout={(e) => {
              if (headlineMeasured.current) return;
              const h = e.nativeEvent.layout.height;
              if (h > 20) {
                headlineMeasured.current = true;
                setHeadlineH(h);
              }
            }}
          >
            <Text style={styles.headline} numberOfLines={1}>
              {t('discover.headline')}
            </Text>
          </View>
        </Animated.View>

        {/* Search + filter are SEPARATE: the pill is a real text input, the
            sliders button (right) opens the filter sheet. */}
        <View style={styles.searchPill}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            selectionColor={colors.primary}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            returnKeyType="search"
            onSubmitEditing={() => setSearchFocused(false)}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.pillDivider} />
          <TouchableOpacity
            onPress={openFiltersModal}
            hitSlop={8}
            style={styles.filterBtn}
            accessibilityLabel={t('discover.filterButtonLabel')}
          >
            <SlidersHorizontal size={20} color={activeFilterCount > 0 ? colors.primary : colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterCountDot}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
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
      </View>

      {/* Feed */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.contentUnderHeader}
        contentContainerStyle={[styles.feedContent, { paddingTop: headerH + 8, paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setSearchFocused(false)}
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
        {discoverTab === 'forYou' &&
          renderFeed(feedEvents, t('discover.noEventsFound'), t('discover.tryAdjusting'))}

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
      </Animated.ScrollView>

      {/* Typeahead suggestions — a floating panel dropped just below the header
          while the user is typing. Sits above the feed, clear of the header. */}
      {searchFocused && suggestions.length > 0 && (
        <View style={[styles.suggestions, { top: headerH }]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.suggestionsScrim} pointerEvents="none" />
          <Text style={styles.suggestionsTitle}>{t('discover.suggestionsTitle')}</Text>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.suggestionRow}
              onPress={() => applySuggestion(s.query)}
              activeOpacity={0.7}
            >
              <Search size={16} color={colors.textSecondary} />
              <Text style={styles.suggestionLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={styles.suggestionKind}>{t(`discover.suggestionKinds.${s.kind}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 0,
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
    // Absolute translucent overlay: the feed scrolls UP behind it (posters show
    // through the blur). overflow:hidden clips the BlurView to the header bounds.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  // A faint dark wash over the blur so the search text + tabs stay legible on
  // top of any bright poster.
  headerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.35)',
  },
  headline: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    // Roomy enough that the serif ascenders aren't clipped by the collapsing
    // header's overflow:hidden wrapper (a 42 line-height cropped the letters).
    lineHeight: 52,
    letterSpacing: -0.5,
    color: colors.text,
    marginTop: 2,
    marginBottom: 8,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pillDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
    backgroundColor: colors.border,
  },
  filterBtn: {
    position: 'relative',
    paddingLeft: 2,
  },
  filterCountDot: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    fontFamily: font.mono,
    fontSize: 10,
    color: colors.background,
    fontWeight: '700',
  },
  suggestions: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
  },
  suggestionsScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,16,16,0.72)',
  },
  suggestionsTitle: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  suggestionKind: {
    fontFamily: font.monoRegular,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textTertiary,
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
