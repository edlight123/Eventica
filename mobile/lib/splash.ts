import * as SplashScreen from 'expo-splash-screen';

/**
 * Owns the native splash lifecycle.
 *
 * By default the native splash disappears the instant JS paints its first
 * frame, which for us was the BootScreen — so a cold launch read as two
 * separate "Tikèm" screens (native wordmark, then a differently-sized JS
 * wordmark) before the app appeared. Holding the native splash until the
 * navigator is actually mounted collapses that into one continuous frame.
 *
 * Importing this module is what arms the hold, so it must be imported before
 * the first render (App.tsx does this at the top).
 */

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden / not available (web, Expo Go edge cases). Harmless: the
  // BootScreen fallback is drawn to match the splash, so the launch still
  // looks continuous.
});

SplashScreen.setOptions({ duration: 320, fade: true });

/**
 * A boot that never resolves (offline Firebase auth, wedged AsyncStorage)
 * must not strand the user on a frozen splash. After this we hand off to
 * BootScreen, which renders the same wordmark at the same size and then
 * surfaces a loading hint.
 */
const MAX_HOLD_MS = 4000;

let hidden = false;

export function hideSplash() {
  if (hidden) return;
  hidden = true;
  clearTimeout(safetyTimer);
  SplashScreen.hideAsync().catch(() => {});
}

const safetyTimer = setTimeout(hideSplash, MAX_HOLD_MS);
