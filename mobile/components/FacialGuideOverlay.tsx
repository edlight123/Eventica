import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function FacialGuideOverlay() {
  return (
    <View style={styles.overlay}>
      {/* Top darkened area */}
      <View style={styles.darkArea} />
      
      {/* Middle row with guide */}
      <View style={styles.middleRow}>
        <View style={styles.darkArea} />
        
        {/* Oval face guide */}
        <View style={styles.guideContainer}>
          <View style={styles.ovalGuide}>
            {/* Horizontal center line */}
            <View style={styles.horizontalLine} />
            {/* Vertical center line */}
            <View style={styles.verticalLine} />
          </View>
        </View>
        
        <View style={styles.darkArea} />
      </View>
      
      {/* Bottom darkened area */}
      <View style={styles.darkArea} />
    </View>
  );
}

const OVAL_WIDTH = width * 0.6;
const OVAL_HEIGHT = height * 0.35;

  const { colors } = useTheme();
  const styles = getStyles(colors);
const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: '100%',
  },
  middleRow: {
    flexDirection: 'row',
    width: '100%',
  },
  guideContainer: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalGuide: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  horizontalLine: {
    position: 'absolute',
    width: '70%',
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    height: '70%',
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
});
