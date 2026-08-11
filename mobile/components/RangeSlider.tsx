import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

export type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  colors: any;
};

/**
 * A pure-JS dual-thumb range slider — min + max on ONE track. Built with
 * PanResponder so it needs no native module (the installed
 * @react-native-community/slider is single-thumb only, which is why the price
 * range used to be two stacked sliders). OTA-safe.
 *
 * Extracted from EventFiltersSheet so the category page's price picker and the
 * Discover filters share one implementation.
 */
export default function RangeSlider({ min, max, step, low, high, onChange, colors }: RangeSliderProps) {
  // Compact thumb (16pt visible) — the touch target is grown back to ~44pt with
  // hitSlop below so the control stays easy to drag while reading as a small dot.
  const THUMB = 16;
  const [trackW, setTrackW] = useState(0);
  const usable = Math.max(1, trackW - THUMB);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const valueToX = (v: number, u: number) => ((clamp(v, min, max) - min) / (max - min || 1)) * u;
  const xToValue = (x: number, u: number) => {
    const raw = min + (clamp(x, 0, u) / u) * (max - min);
    return clamp(Math.round(raw / step) * step, min, max);
  };

  // The PanResponders are created once; refs feed them the latest values so
  // their closures never go stale.
  const refs = useRef({ low, high, usable, onChange }).current;
  refs.low = low;
  refs.high = high;
  refs.usable = usable;
  refs.onChange = onChange;
  const startVal = useRef(0);

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal.current = refs.low;
      },
      onPanResponderMove: (_e, g) => {
        const u = refs.usable;
        const v = Math.min(xToValue(valueToX(startVal.current, u) + g.dx, u), refs.high);
        refs.onChange(v, refs.high);
      },
    }),
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal.current = refs.high;
      },
      onPanResponderMove: (_e, g) => {
        const u = refs.usable;
        const v = Math.max(xToValue(valueToX(startVal.current, u) + g.dx, u), refs.low);
        refs.onChange(refs.low, v);
      },
    }),
  ).current;

  const lowX = valueToX(low, usable);
  const highX = valueToX(high, usable);

  return (
    <View style={rangeStyles.wrap} onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}>
      <View style={[rangeStyles.track, { backgroundColor: colors.border }]} />
      <View
        style={[
          rangeStyles.fill,
          { backgroundColor: colors.primary, left: lowX + THUMB / 2, width: Math.max(0, highX - lowX) },
        ]}
      />
      <View
        {...lowPan.panHandlers}
        hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
        style={[rangeStyles.thumb, { left: lowX, backgroundColor: colors.primary, borderColor: colors.background }]}
      />
      <View
        {...highPan.panHandlers}
        hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }}
        style={[rangeStyles.thumb, { left: highX, backgroundColor: colors.primary, borderColor: colors.background }]}
      />
    </View>
  );
}

// Slim track + 16pt thumbs. Effective touch target stays 44 x 40pt via hitSlop.
// The track runs edge-to-edge of its wrap (no marginHorizontal) so its ends land
// exactly on the section's horizontal margins; the thumbs travel inside
// [0, trackW - THUMB] so at either extreme they sit flush with the track end and
// never overhang the content edge.
const rangeStyles = StyleSheet.create({
  wrap: { height: 20, justifyContent: 'center' },
  track: { height: 3, borderRadius: 1.5 },
  fill: { position: 'absolute', top: 8.5, height: 3, borderRadius: 1.5 },
  // 8 here is half of the 16px box — a circle, not the `sm` geometry token.
  thumb: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
});
