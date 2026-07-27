import { useCallback } from 'react';
import * as Brightness from 'expo-brightness';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Boost the screen to full brightness while a QR-bearing screen is focused, then
 * restore the previous brightness on blur/unmount. Haiti venue doors are often
 * dim and phones sit on auto/low brightness to save battery — a dim screen
 * behind an anti-glare protector is the #1 cause of slow scans. App-scoped, no
 * permission needed; the OS also restores brightness when the app backgrounds.
 */
export function useMaxBrightnessWhileFocused() {
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let previous: number | null = null;
      (async () => {
        try {
          previous = await Brightness.getBrightnessAsync();
          if (active) await Brightness.setBrightnessAsync(1);
        } catch {
          // Brightness control unavailable (e.g. simulator) — ignore.
        }
      })();
      return () => {
        active = false;
        (async () => {
          try {
            if (previous != null) await Brightness.setBrightnessAsync(previous);
          } catch {}
        })();
      };
    }, []),
  );
}
