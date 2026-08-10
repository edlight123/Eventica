import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, LayoutChangeEvent } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';
import { radius } from '../theme/tokens';
import { Skeleton } from './Skeleton';
import { buildStaticMapUrl, resolveVenueTarget } from '../lib/staticMap';

/**
 * 3:2 — enough map to actually read the surrounding streets, which 16:9 was too
 * letterboxed to give. Posh devotes roughly this much height to its location
 * block and it was the specific comparison a tester drew. Still short enough
 * that the page's primary CTA is not pushed out of reach.
 */
const ASPECT = 3 / 2;

interface VenueStaticMapProps {
  /** The raw event doc — coordinates are dug out of it, see `resolveVenueLatLng`. */
  event: unknown;
  /** Tapping the tile does exactly what the ⧉ on the location row does. */
  onPress: () => void;
  accessibilityLabel: string;
  style?: ViewStyle;
}

/**
 * A tappable static map of the venue, rendered as a plain image — no native map
 * module, so no new EAS build is required to ship it.
 *
 * Renders NOTHING (not a placeholder, not an error state) when the event has no
 * usable coordinate, when no tile provider key is configured, or when the tile
 * fails to load. The location row above already carries the address, so the
 * screen degrades to exactly what it looks like today.
 */
export default function VenueStaticMap({
  event,
  onPress,
  accessibilityLabel,
  style,
}: VenueStaticMapProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [boxWidth, setBoxWidth] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Exact coordinates when the doc has them, otherwise a geocodable text
  // address assembled from venue / street / commune / city / department.
  const target = useMemo(() => resolveVenueTarget(event), [event]);

  // The URL is width-dependent, so it can only be built after first layout.
  // Until then the skeleton holds the (aspect-ratio'd) space.
  const uri = useMemo(() => {
    if (boxWidth <= 0) return null;
    return buildStaticMapUrl({
      coords: target.coords,
      address: target.address,
      width: boxWidth,
      height: boxWidth / ASPECT,
    });
  }, [target, boxWidth]);

  // Hooks above, bail-outs below — order stays stable across renders.

  // Neither a coordinate nor an address specific enough to be worth drawing.
  if (!target.coords && !target.address) return null;
  // A tile was requested and the provider refused (bad/absent key, quota, or an
  // address Google could not geocode at all — that returns HTTP 400).
  if (failed) return null;
  // Provider unconfigured, or Mapbox-only with an address-only event: the
  // builder returns null, so once we've measured there is nothing to wait for.
  if (boxWidth > 0 && !uri) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.round(w) !== Math.round(boxWidth)) setBoxWidth(w);
  };

  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      onLayout={onLayout}
      activeOpacity={0.85}
      accessibilityRole="imagebutton"
      accessibilityLabel={accessibilityLabel}
    >
      {uri ? (
        <ExpoImage
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}

      {!loaded && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Skeleton width="100%" height="100%" radius={radius.md} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    // Deliberately no card: no fill, no border, no shadow — just the rounded
    // image sitting on the black canvas.
    wrap: {
      // width: '100%', NOT alignSelf: 'stretch'. Combined with aspectRatio,
      // stretch lets Yoga resolve the cross axis from the ratio instead of the
      // parent, which left the tile short of the content's right edge — the
      // "why this much space on the right?" a tester marked up. An explicit
      // width makes the box deterministic and the ratio only sets the height.
      width: '100%',
      aspectRatio: ASPECT,
      // Squarer corners (12, not 16): the map is a block of content, not a
      // pill, and the softer radius read as bubbly against the poster above.
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
  });
