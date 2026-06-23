import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

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

/** A poster-card-shaped skeleton matching PosterEventCard. */
export function PosterCardSkeleton({ width, ratio = 1.25 }: { width?: number; ratio?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.borderLight, backgroundColor: colors.surface },
        width ? { width } : { flex: 1 },
      ]}
    >
      <Skeleton height={undefined as any} radius={0} style={{ width: '100%', aspectRatio: 1 / ratio } as ViewStyle} />
      <View style={styles.footer}>
        <Skeleton width={64} height={14} />
        <Skeleton width={40} height={12} />
      </View>
    </View>
  );
}

/** A horizontal rail of poster-card skeletons. */
export function PosterRailSkeleton({ cardWidth = 240, count = 3 }: { cardWidth?: number; count?: number }) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} width={cardWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rail: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
});
