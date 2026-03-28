import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 2;
const CARD_SPACING = 12;
const CARD_WIDTH = (width - 32 - (CARD_SPACING * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface CategoryGridProps {
  onCategoryPress: (category: string) => void;
}

// Category mapping matching PWA exactly
// 'name' is the database value, 'displayName' is what users see
const categories = [
  { 
    name: 'Music', 
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop',
    emoji: '🎵'
  },
  { 
    name: 'Sports', 
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop',
    emoji: '⚽'
  },
  { 
    name: 'Food & Drink', 
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    emoji: '🍽️'
  },
  { 
    name: 'Business', 
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
    emoji: '💼'
  },
  { 
    name: 'Arts & Culture', 
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&h=300&fit=crop',
    emoji: '🎨'
  },
  { 
    name: 'Party', 
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
    emoji: '🎉'
  },
  { 
    name: 'Religious', 
    image: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&h=300&fit=crop',
    emoji: '⛪'
  },
  { 
    name: 'Education', 
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
    emoji: '📚'
  },
];

const CategoryCard = ({ category, onPress }: { category: any; onPress: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { t } = useI18n();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Image
          source={{ uri: category.image }}
          style={styles.image}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.2)']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.overlay}
        />
        <LinearGradient
          colors={['rgba(22, 138, 124, 0.4)', 'rgba(22, 138, 124, 0.2)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.overlay}
        />
        <View style={styles.textContainer}>
          <Text style={styles.categoryText}>{getCategoryLabel(t, category.name)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function CategoryGrid({ onCategoryPress }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => (
        <CategoryCard
          key={category.name}
          category={category}
          onPress={() => {
            console.log('[CategoryGrid] Category pressed:', category.name);
            onCategoryPress(category.name);
          }}
        />
      ))}
    </View>
  );
}

  const { colors } = useTheme();
  const styles = getStyles(colors);
const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.borderLight,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  categoryText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
