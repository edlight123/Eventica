import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/tokens';
import { TikemWordmark } from '../TikemWordmark';

const { width, height } = Dimensions.get('window');

/**
 * Premium ambient backdrop for the auth screens (POSH §1 — the app is a black
 * frame; teal is a SPARING accent).
 *
 * Layered for depth without going busy or rainbow:
 *  1. a deep near-black vertical base (subtle teal-green tint in the middle),
 *  2. a soft teal glow washing down from the top (single ambient light source,
 *     replacing the old hard-edged twin blobs),
 *  3. a faint diagonal teal wash from the bottom-left for a gentle mesh,
 *  4. an oversized, very-low-opacity tikèm wordmark watermark bleeding off the
 *     bottom-right edge (editorial brand identity, not decoration),
 *  5. a bottom vignette that grounds the content and keeps text legible.
 *
 * No image assets, no heavy blur stacks — just gradients and views, so it stays
 * cheap to render on the low-DPI Android devices common in Haiti.
 */
export function AuthBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.root}>
      {/* 1 — deep base */}
      <LinearGradient
        colors={['#0C0F0E', '#0A0A0A', '#050505']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* 2 — teal glow from the top (soft falloff) */}
      <LinearGradient
        colors={['rgba(20,184,166,0.16)', 'rgba(20,184,166,0.04)', 'transparent']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 3 — faint diagonal wash from bottom-left for a gentle mesh */}
      <LinearGradient
        colors={['transparent', 'rgba(13,148,136,0.08)']}
        start={{ x: 1, y: 0.4 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* 4 — oversized wordmark watermark, bleeding off the bottom-right edge */}
      <View style={styles.watermark} pointerEvents="none">
        <TikemWordmark
          fontSize={Math.round(width * 0.7)}
          color="#FFFFFF"
          accent="#FFFFFF"
        />
      </View>

      {/* 5 — bottom vignette to ground content / preserve legibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        locations={[0, 1]}
        style={styles.bottomVignette}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  watermark: {
    position: 'absolute',
    bottom: -height * 0.04,
    right: -width * 0.28,
    opacity: 0.035,
    transform: [{ rotate: '-4deg' }],
  },
  bottomVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.4,
  },
});

export default AuthBackground;
