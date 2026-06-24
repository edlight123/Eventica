import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

// Geometry copied from the real components so placeholders line up exactly.
const HOME_CARD_WIDTH = Math.min(248, SCREEN_W * 0.62); // EventRail CARD_WIDTH
const FAV_COLUMN_WIDTH = (SCREEN_W - 32 - 12) / 2; // FavoritesScreen grid column
const DISCOVER_POSTER_H = Math.round((SCREEN_W - 32) * 1.15); // DiscoverEventCard poster

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
}

/** A single shimmering placeholder block. */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: isDark ? colors.borderLight : colors.border, opacity },
        style as ViewStyle,
      ]}
    />
  );
}

/**
 * Matches PosterEventCard: a transparent card (no border/fill) with a
 * rounded-8 poster, then a title line and a date/price meta row beneath it.
 */
export function PosterCardSkeleton({ width, ratio = 1.25 }: { width?: number; ratio?: number }) {
  return (
    <View style={width ? { width } : { flex: 1 }}>
      <Skeleton height={undefined as any} radius={8} style={{ width: '100%', aspectRatio: 1 / ratio } as ViewStyle} />
      <View style={styles.posterMeta}>
        <Skeleton width={'78%'} height={13} radius={6} />
        <View style={styles.posterMetaRow}>
          <Skeleton width={'60%'} height={11} radius={5} />
          <Skeleton width={34} height={11} radius={5} />
        </View>
      </View>
    </View>
  );
}

/** A horizontal rail of poster-card skeletons (Home / "see all" sections). */
export function PosterRailSkeleton({ cardWidth = HOME_CARD_WIDTH, count = 3 }: { cardWidth?: number; count?: number }) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} width={cardWidth} />
      ))}
    </View>
  );
}

/** Matches SectionHeader: a serif-sized title bar with a "see all" link. */
export function SectionHeaderSkeleton() {
  return (
    <View style={styles.sectionHeader}>
      <Skeleton width={138} height={20} radius={7} />
      <Skeleton width={46} height={13} radius={6} />
    </View>
  );
}

/** The full Home feed placeholder: repeated section header + poster rail. */
export function HomeFeedSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <View style={styles.homeFeed}>
      {Array.from({ length: sections }).map((_, i) => (
        <View key={i} style={styles.homeSection}>
          <SectionHeaderSkeleton />
          <PosterRailSkeleton />
        </View>
      ))}
    </View>
  );
}

/**
 * Matches DiscoverEventCard: a tall full-bleed poster, a title/organizer/meta
 * block with two action dots on the right, then a full-width CTA bar.
 */
export function DiscoverCardSkeleton() {
  return (
    <View style={styles.discoverCard}>
      <Skeleton height={DISCOVER_POSTER_H} radius={10} style={{ width: '100%' } as ViewStyle} />
      <View style={styles.discoverBody}>
        <View style={styles.discoverBodyText}>
          <Skeleton width={'88%'} height={20} radius={7} />
          <Skeleton width={'52%'} height={20} radius={7} />
          <Skeleton width={'40%'} height={13} radius={6} style={{ marginTop: 3 } as ViewStyle} />
          <Skeleton width={'72%'} height={13} radius={6} />
        </View>
        <View style={styles.discoverActions}>
          <Skeleton width={20} height={20} radius={10} />
          <Skeleton width={20} height={20} radius={10} />
        </View>
      </View>
      <Skeleton height={52} radius={14} style={{ width: '100%', marginTop: 14 } as ViewStyle} />
    </View>
  );
}

/** A vertical feed of Discover card skeletons. */
export function DiscoverFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.discoverFeed}>
      {Array.from({ length: count }).map((_, i) => (
        <DiscoverCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Matches EventListCard: a 4:5 poster on the left, stacked text on the right. */
export function ListCardSkeleton() {
  return (
    <View style={styles.listCard}>
      <Skeleton width={92} height={undefined as any} radius={12} style={{ aspectRatio: 4 / 5 } as ViewStyle} />
      <View style={styles.listBody}>
        <Skeleton width={'82%'} height={15} radius={6} />
        <Skeleton width={'55%'} height={12} radius={5} />
        <Skeleton width={'45%'} height={12} radius={5} />
        <Skeleton width={54} height={12} radius={5} style={{ marginTop: 2 } as ViewStyle} />
      </View>
    </View>
  );
}

/** A vertical list of horizontal list-card skeletons (Category page). */
export function ListSkeleton({ count = 7 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ListCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** A two-column grid of poster-card skeletons (Favorites page). */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} width={FAV_COLUMN_WIDTH} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // PosterEventCard content block (paddingTop 8, title then meta row).
  posterMeta: {
    paddingTop: 8,
  },
  posterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 7,
  },
  // EventRail: paddingHorizontal 16, gap = CARD_SPACING 16.
  rail: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
  },
  // SectionHeader: row with right-aligned link, marginBottom 14, page gutter.
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  // Home feed spacing: firstSection marginTop 16, section marginBottom 24.
  homeFeed: {
    paddingTop: 16,
  },
  homeSection: {
    marginBottom: 24,
  },
  // DiscoverEventCard: wrap marginBottom 28, body row marginTop 12 gap 12.
  discoverCard: {
    marginBottom: 28,
  },
  discoverBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 12,
  },
  discoverBodyText: {
    flex: 1,
    gap: 8,
  },
  discoverActions: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 4,
  },
  // Discover feed content padding.
  discoverFeed: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // EventListCard: row, paddingVertical 10, gap 12, center-aligned.
  listCard: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 12,
    alignItems: 'center',
  },
  listBody: {
    flex: 1,
    gap: 8,
  },
  // CategoryEventsScreen list content padding.
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // FavoritesScreen grid: wrap, gap 12, page gutter, paddingTop 16.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
