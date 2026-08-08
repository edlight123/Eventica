import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';

/** Must stay in sync with `splash.backgroundColor` in app.json. */
export const BOOT_BACKGROUND = '#0A0A0A';

/**
 * How long the boot screen may sit there before we admit something is slow.
 * Short enough to reassure, long enough that a normal launch never shows it.
 */
const HINT_DELAY_MS = 1200;

/**
 * Branded boot screen shown while the app initializes (fonts + auth/mode
 * loading).
 *
 * This is drawn to be pixel-identical to the native splash: same asset, same
 * background, and the same `scaleAspectFit`-into-the-full-window layout the
 * generated splash storyboard uses. That matters because the native splash
 * hands off to this view — if the wordmark changes size or position across the
 * handoff, the launch reads as two separate screens. `lib/splash` normally
 * keeps the native splash up long enough that this view is never seen at all;
 * matching it is what makes the fallback path invisible too.
 */
export default function BootScreen() {
  const [showHint, setShowHint] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(true), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showHint) return;
    Animated.timing(hintOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [hintOpacity, showHint]);

  return (
    <View style={styles.root}>
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />
      {showHint && (
        <Animated.View style={[styles.hint, { opacity: hintOpacity }]}>
          <ActivityIndicator size="small" color="#4ECDC4" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BOOT_BACKGROUND,
  },
  // Fills the window and aspect-fits inside it, exactly like the splash
  // storyboard's image view pinned to all four container edges.
  logo: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
  },
});
