import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

export type DateFilter = 'any' | 'today' | 'tomorrow' | 'this-week' | 'this-weekend';

interface DateChipsProps {
  currentDate: DateFilter;
  onDateChange: (date: DateFilter) => void;
}

const DATE_OPTIONS: { value: DateFilter; labelKey: string }[] = [
  { value: 'any', labelKey: 'filters.dateOptions.any' },
  { value: 'today', labelKey: 'filters.dateOptions.today' },
  { value: 'tomorrow', labelKey: 'filters.dateOptions.tomorrow' },
  { value: 'this-week', labelKey: 'filters.dateOptions.thisWeek' },
  { value: 'this-weekend', labelKey: 'filters.dateOptions.thisWeekend' },
];

export function DateChips({ currentDate, onDateChange }: DateChipsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {DATE_OPTIONS.map((option) => {
          const isActive = currentDate === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                isActive && styles.chipActive
              ]}
              onPress={() => onDateChange(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.chipText,
                isActive && styles.chipTextActive
              ]}>
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
});
