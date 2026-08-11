import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Inbox } from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import PosterEventCard from '../components/PosterEventCard';
import OverlayHeader, { useOverlayHeaderInset } from '../components/OverlayHeader';
import { GridSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { getCategoryLabel } from '../lib/categories';
import { applyHomeFeed, isEventOver } from '../lib/homeFeeds';

// Fixed column width rather than flex: with an ODD number of events the last
// card in a flex grid stretches to the full row. Matches FavoritesScreen's
// grid and GridSkeleton's FAV_COLUMN_WIDTH so the placeholder and the real
// content line up exactly. 32 = the list's 16pt side padding, 12 = the gutter.
const COLUMN_WIDTH = (Dimensions.get('window').width - 32 - 12) / 2;

export default function CategoryEventsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  // `feed` opens one of Home's curated rails as a full page; `category` is the
  // original per-category listing. Exactly one of them is set.
  const { category, feed, city, title, subtitle } = route.params || {};

  // The header floats (OverlayHeader), so the grid reserves its measured height.
  const { height: headerH, onHeight } = useOverlayHeaderInset();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Scroll offset for the header chrome: solid canvas at rest, translucent
  // only once the grid has actually scrolled underneath (see OverlayHeader).
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      if (!category && !feed) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Single equality filter only — avoids a Firestore composite index. A
        // feed page has no server-side predicate: its rule is applied client
        // side by applyHomeFeed, the SAME function that builds the Home rail.
        const snap = await getDocs(
          category
            ? query(collection(db, 'events'), where('category', '==', category))
            : query(collection(db, 'events'))
        );
        const now = new Date();
        const rows = snap.docs
          .map((d) => {
            const data: any = d.data();
            return {
              id: d.id,
              ...data,
              start_datetime: data.start_datetime?.toDate
                ? data.start_datetime.toDate()
                : data.start_datetime
                ? new Date(data.start_datetime)
                : null,
            };
          })
          // Published + not-yet-over. Uses the same isEventOver rule as Home so
          // a rail and its "view all" page cannot disagree about what has
          // finished; `start >= now` here would have hidden an event that is
          // currently running while Home still showed it.
          .filter((e: any) => e.is_published !== false && !isEventOver(e, now))
          .sort(
            (a: any, b: any) => a.start_datetime.getTime() - b.start_datetime.getTime()
          );
        // No limit: this IS the "view all" page, so it is the rail's rule
        // without the slice.
        setEvents(feed ? applyHomeFeed(rows, feed, { city }) : rows);
      } catch (err) {
        console.error('Failed to load category events', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [category, feed, city]);

  return (
    <View style={styles.container}>
      {/* A real overlay, not an in-flow bar that merely contained a ChromeBlur —
          that half-conversion blurred nothing but canvas, since no content ever
          passed beneath it. OverlayHeader supplies the float, the inset and the
          blur; the grid below reserves headerH. */}
      <OverlayHeader onHeight={onHeight} scrollY={scrollY}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {(title || getCategoryLabel(t, category) || category || '').toString().toLowerCase()}
          </Text>
          {/* Carries the rail's own subtitle through, so the page reads as the
              same section you tapped rather than an unlabelled list. */}
          {!!subtitle && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </OverlayHeader>

      {loading ? (
        <View style={{ paddingTop: headerH + 16 }}>
          <GridSkeleton />
        </View>
      ) : (
        <Animated.FlatList
          data={events}
          keyExtractor={(item: any) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          // A two-column poster grid, NOT a row list. You arrive here from a
          // rail of poster art; landing on plain text rows read as a different
          // product. Same card the rail uses, so the section simply unfolds.
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <PosterEventCard
              event={item}
              width={COLUMN_WIDTH}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingTop: headerH + 16, paddingBottom: 32 + insets.bottom }]}
          ListEmptyComponent={
            <EmptyState
              icon={Inbox}
              title={t('home.emptyTitle')}
              subtitle={t('home.emptySubtitle')}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerText: {
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    headerTitle: {
      // Italic, like the tikèm wordmark — the section title is editorial
      // voice, not a system label. Slightly larger to carry the page.
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 30,
      lineHeight: 36,
      color: colors.text,
      letterSpacing: 0.2,
    },
    gridRow: {
      gap: 12,
      justifyContent: 'flex-start',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 32,
      flexGrow: 1,
    },
  });
