import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Branded boot screen shown while the app initializes (fonts + auth/mode
 * loading). The native splash auto-hides the moment JS renders its first
 * frame, so without this the loading window is a black void — exactly what a
 * cold offline start looked like. Rendering the wordmark here keeps the launch
 * on-brand and continuous with the native splash.
 */
export default function BootScreen() {
  return (
    <View style={styles.root}>
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '62%',
    height: 120,
  },
});
