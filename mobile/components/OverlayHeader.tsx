import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChromeBlur from './ChromeBlur';

/**
 * A header that content scrolls UNDER, with the app's blurred chrome behind it.
 *
 * Most screens shipped an in-flow header: an opaque bar with a bottom hairline
 * that pushed the list down. Blurring one of those does nothing — nothing ever
 * passes beneath it, so the blur samples black canvas. Making the chrome mean
 * something requires the header to overlay the content, which is what this does
 * and what the tab bar and Home already do.
 *
 * Pair it with `useOverlayHeaderInset()` so the scroll view reserves the space
 * the header now floats over; otherwise the first row starts life hidden.
 */
export default function OverlayHeader({
  children,
  onHeight,
  style,
}: {
  children: React.ReactNode;
  /** Measured total height, including the safe-area top padding. */
  onHeight?: (h: number) => void;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();

  const handleLayout = (e: LayoutChangeEvent) => {
    const h = e?.nativeEvent?.layout?.height ?? 0;
    if (h) onHeight?.(h);
  };

  return (
    <View
      style={[styles.header, { paddingTop: insets.top + 8 }, style]}
      onLayout={handleLayout}
    >
      <ChromeBlur edge="top" />
      {children}
    </View>
  );
}

/**
 * Tracks the overlay header's measured height.
 * Feed `height` into the scroll view's contentContainerStyle paddingTop.
 */
export function useOverlayHeaderInset(fallback = 96) {
  const [height, setHeight] = useState(fallback);
  return { height, onHeight: setHeight };
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    // No fill and no bottom border: ChromeBlur is the backdrop, and a hairline
    // drawn on top of a blur reads as a seam.
    overflow: 'hidden',
  },
});
