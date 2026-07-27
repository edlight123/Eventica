import React from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { SPACING, RADIUS } from '../config/brand';

interface CategoryRailProps {
  onCategoryPress: (category: string) => void;
}

// Slim, image-light browsing pills. Events stay the stars of the feed (Posh-style);
// categories are a quick secondary way to jump into Discover.
const CATEGORIES: { name: string; emoji: string }[] = [
  { name: 'Music', emoji: '🎵' },
  { name: 'Party', emoji: '🎉' },
  { name: 'Sports', emoji: '🏆' },
  { name: 'Arts & Culture', emoji: '🎨' },
  { name: 'Food & Drink', emoji: '🍽️' },
  { name: 'Business', emoji: '💼' },
  { name: 'Technology', emoji: '💻' },
  { name: 'Education', emoji: '🎓' },
  { name: 'Health & Wellness', emoji: '💪' },
  { name: 'Religious', emoji: '⛪' },
];

export default function CategoryRail({ onCategoryPress }: CategoryRailProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c.name}
          style={styles.pill}
          activeOpacity={0.85}
          onPress={() => onCategoryPress(c.name)}
        >
          <Text style={styles.emoji}>{c.emoji}</Text>
          <Text style={styles.label}>{getCategoryLabel(t, c.name)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: SPACING.lg,
      gap: SPACING.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emoji: {
      fontSize: 15,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
  });
