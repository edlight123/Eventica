import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/tokens';

const { width, height } = Dimensions.get('window');

/**
 * Poster-forward ambient backdrop for the auth screens (POSH §1 — the app is a
 * black frame; teal is a SPARING accent). Composed to sit BEHIND a left-aligned,
 * top-anchored editorial layout, so the light and texture are pulled toward the
 * upper-left where the headline lives — not centered.
 *
 * Layers, cheap-to-render (gradients + plain Views only — no blur stacks, no
 * image assets, so it stays smooth on the low-DPI Android devices common in
 * Haiti):
 *  1. deep near-black vertical base with a faint teal-green core,
 *  2. an off-center teal glow anchored to the upper-left (the headline corner),
 *  3. a faint diagonal "poster grid" motif — a few oversized, low-opacity
 *     rounded rectangles raked across the canvas like flyers pinned to a wall,
 *  4. an oversized brand "t" bleeding off the bottom-right corner at very low
 *     opacity (intentional brand mark, not the old centered smudge),
 *  5. a strong bottom-to-top scrim so the lower button cluster stays legible.
 */
export function AuthBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.root}>
      {/* 1 — deep base */}
      <LinearGradient
        colors={['#0C100F', '#0A0A0A', '#050505']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 2 — off-center teal glow, anchored to the upper-left headline corner */}
      <LinearGradient
        colors={['rgba(20,184,166,0.22)', 'rgba(20,184,166,0.06)', 'transparent']}
        locations={[0, 0.4, 0.85]}
        start={{ x: 0.05, y: 0.02 }}
        end={{ x: 0.85, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 3 — faint diagonal poster-grid motif (flyers raked across the wall) */}
      <View style={styles.posterField} pointerEvents="none">
        <View style={[styles.poster, styles.posterA]} />
        <View style={[styles.poster, styles.posterB]} />
        <View style={[styles.poster, styles.posterC]} />
      </View>

      {/* 4 — oversized brand "t" bleeding off the bottom-right corner */}
      <View style={styles.brandMark} pointerEvents="none">
        <BrandGlyph size={Math.round(width * 0.95)} />
      </View>

      {/* 5 — bottom scrim to ground the button cluster / preserve legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.55, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

/**
 * A single oversized editorial "t" used as the corner brand watermark. Built
 * from plain Views (not the serif font) so this ambient layer paints even
 * before the wordmark font finishes loading. The teal crossbar echoes the
 * wordmark's accent "è" without shouting.
 */
function BrandGlyph({ size }: { size: number }) {
  return (
    <View style={{ width: size * 0.5, height: size }}>
      {/* vertical stem */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.19,
          top: size * 0.06,
          width: size * 0.12,
          height: size * 0.9,
          borderRadius: size * 0.06,
          backgroundColor: '#FFFFFF',
        }}
      />
      {/* crossbar */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.03,
          top: size * 0.3,
          width: size * 0.44,
          height: size * 0.1,
          borderRadius: size * 0.05,
          backgroundColor: colors.tealBright,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  posterField: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  poster: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  // Three flyer silhouettes raked diagonally across the canvas.
  posterA: {
    width: width * 0.52,
    height: width * 0.52 * 1.5,
    top: height * 0.08,
    right: -width * 0.18,
    transform: [{ rotate: '14deg' }],
  },
  posterB: {
    width: width * 0.42,
    height: width * 0.42 * 1.5,
    top: height * 0.42,
    left: -width * 0.16,
    transform: [{ rotate: '-12deg' }],
  },
  posterC: {
    width: width * 0.4,
    height: width * 0.4 * 1.5,
    top: height * 0.6,
    right: -width * 0.08,
    transform: [{ rotate: '10deg' }],
  },
  brandMark: {
    position: 'absolute',
    bottom: -height * 0.06,
    right: -width * 0.34,
    opacity: 0.045,
    transform: [{ rotate: '-6deg' }],
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.5,
  },
});

export default AuthBackground;
