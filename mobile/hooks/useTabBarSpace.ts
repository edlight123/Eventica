import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom space a scrollable screen must reserve so its last row clears the
 * chrome underneath it.
 *
 * The custom tab bar (see navigation/AppNavigator) is now a TRANSLUCENT
 * OVERLAY: it is absolutely positioned so feed content passes beneath it and
 * shows faintly through the blur. That means screens can no longer rely on the
 * tab bar taking layout space — they have to pad by its measured height (which
 * already includes the home-indicator inset).
 *
 * Outside a tab navigator (a screen pushed on the root stack) there is no tab
 * bar, so this falls back to the bottom safe-area inset — the value those
 * screens used before.
 */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  return tabBarHeight ?? insets.bottom;
}

export default useTabBarSpace;
