import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PaginationDotsProps {
  total: number;
  activeIndex: number;
}

export default function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
  const { colors } = useTheme();
  const animations = useRef(
    Array.from({ length: total }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    animations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index === activeIndex ? 1 : 0,
        useNativeDriver: false,
        friction: 5,
        tension: 40,
      }).start();
    });
  }, [activeIndex, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, index) => {
        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.4],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                transform: [{ scale }],
                opacity,
                backgroundColor: colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
