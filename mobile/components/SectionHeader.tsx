import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { colors as T, type as TYPE, font } from '../theme/tokens';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}

/**
 * Editorial section header: a lowercase eyebrow label ("for you", "upcoming
 * events") with a teal "see all →" link aligned right. Subtitles are optional
 * and kept tight.
 */
export default function SectionHeader({ title, subtitle, onViewAll }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title.toLowerCase()}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {onViewAll && (
        <TouchableOpacity style={styles.viewAll} onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>{t('common.viewAll').toLowerCase()}</Text>
          <ArrowRight size={15} color={T.teal} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
      gap: 12,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      ...TYPE.sectionEyebrow,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      letterSpacing: 0,
      color: colors.text,
    },
    subtitle: {
      fontFamily: font.monoRegular,
      fontSize: 11,
      letterSpacing: 0.4,
      color: colors.textSecondary,
      marginTop: 3,
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 4,
      paddingLeft: 8,
    },
    viewAllText: {
      fontFamily: font.mono,
      fontSize: 11,
      letterSpacing: 0.4,
      color: T.teal,
    },
  });

