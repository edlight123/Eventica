import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { withAlpha } from '../theme/tokens';

/**
 * The app's translucent chrome — the blurred, scrimmed backdrop that sits
 * behind a top header or a bottom bar so content passing underneath reads as a
 * soft glow instead of colliding with the labels on top.
 *
 * Extracted from the tab bar, which was the only place that had it. Headers
 * were opaque black slabs with a hairline border, which is why a tester asked
 * for the tops to be blurred "like the bottom".
 *
 * Three layers, in order: a gradient that pre-darkens the BACKDROP (so a bright
 * poster and the black canvas arrive at the blur at similar values, rather than
 * the bar reading as two different tones across its width), the blur itself,
 * then a canvas tint for legibility.
 */
export default function ChromeBlur({
  edge,
  /**
   * Canvas tint on top of the blur. This is the legibility floor — what is
   * visible through the chrome is roughly (1 - tint) BEFORE the blur's own
   * darkening. 0.55 keeps a header's large, high-contrast content readable;
   * the tab bar runs 0.65 because its dim inactive labels are the tighter
   * constraint. Lower means more see-through.
   */
  tintOpacity = 0.55,
  blurIntensity = 55,
  /** How far the backdrop scrim reaches BEYOND the bar, fading out. */
  scrimExtra = 48,
  /**
   * Opacity of a SOLID canvas fill rendered on top of the tint. 1 = fully
   * opaque ("at rest" — a uniform solid bar), 0 = the normal translucent
   * chrome. Screens that know their scroll position pass an Animated value
   * interpolated from it, so the bar is solid until content actually slides
   * underneath. Undefined (the default) renders no extra layer at all —
   * existing callers keep the current look untouched.
   */
  restOpacity,
}: {
  edge: 'top' | 'bottom';
  tintOpacity?: number;
  blurIntensity?: number;
  scrimExtra?: number;
  restOpacity?: number | Animated.Value | Animated.AnimatedInterpolation<number>;
}) {
  const { colors } = useTheme();
  const bg = colors.background;

  // The scrim always fades AWAY from the bar: downward under a header,
  // upward above a bottom bar.
  const scrimStops =
    edge === 'top'
      ? [withAlpha(bg, 0.6), withAlpha(bg, 0.25), withAlpha(bg, 0)]
      : [withAlpha(bg, 0), withAlpha(bg, 0.25), withAlpha(bg, 0.6)];

  return (
    <>
      <LinearGradient
        colors={scrimStops as any}
        style={[
          styles.scrim,
          edge === 'top' ? { top: '100%', height: scrimExtra } : { bottom: '100%', height: scrimExtra },
        ]}
        pointerEvents="none"
      />
      <BlurView
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: bg, opacity: tintOpacity }]}
        pointerEvents="none"
      />
      {restOpacity !== undefined && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: bg, opacity: restOpacity }]}
          pointerEvents="none"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
