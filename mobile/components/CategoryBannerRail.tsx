import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { categoryArt, DISCOVER_CATEGORIES } from '../lib/categoryArt';
import { radius, withAlpha } from '../theme/tokens';

/**
 * "discover more" — posh-style category banners: a vertical stack of
 * full-width photo bands, each carrying the category name centered and an
 * editorial index number. Every category is always present (unlike the
 * per-category carousels, which only render when a category has events), so
 * browsing by vibe never depends on tonight's inventory.
 */
export default function CategoryBannerRail({
  onCategoryPress,
}: {
  onCategoryPress: (category: string) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  return (
    <View>
      <Text style={styles.title}>{t('home.discoverMoreTitle')}</Text>
      <Text style={styles.subtitle}>{t('home.discoverMoreSubtitle')}</Text>
      <View style={styles.stack}>
        {DISCOVER_CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={cat}
            style={styles.banner}
            activeOpacity={0.88}
            onPress={() => onCategoryPress(cat)}
            accessibilityRole="button"
            accessibilityLabel={getCategoryLabel(t, cat)}
          >
            <Image
              source={categoryArt(cat)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {/* Edge-to-center scrim so the label reads on any art. */}
            <LinearGradient
              colors={[withAlpha('#000000', 0.55), withAlpha('#000000', 0.2), withAlpha('#000000', 0.55)]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {getCategoryLabel(t, cat).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    title: {
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      color: colors.text,
    },
    subtitle: {
      fontSize: 11,
      letterSpacing: 0.4,
      color: colors.textSecondary,
      marginTop: 3,
      marginBottom: 14,
    },
    stack: {
      gap: 10,
    },
    banner: {
      height: 76,
      borderRadius: radius.poster,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    label: {
      fontSize: 19,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    // Editorial index ("01"), like posh's numbered bands.
    index: {
      position: 'absolute',
      left: 14,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      color: 'rgba(255,255,255,0.75)',
    },
  });
