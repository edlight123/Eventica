import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
}

/** Consistent section header used across every discovery rail / grid. */
export default function SectionHeader({ title, subtitle, onViewAll }: SectionHeaderProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);

  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {onViewAll && (
        <TouchableOpacity style={styles.viewAll} onPress={onViewAll} hitSlop={8}>
          <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
          <ChevronRight size={15} color={colors.primary} />
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
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
      paddingVertical: 4,
      paddingLeft: 8,
    },
    viewAllText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
  });
