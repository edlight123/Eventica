import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { font } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export interface SegmentedTab {
  key: string;
  label: string;
  /** Optional count shown as a trailing pill (e.g. reports, drafts). */
  count?: number;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  value: string;
  onChange: (key: string) => void;
}

/**
 * A token pill tab row. The active tab uses NEUTRAL emphasis — a raised surface
 * fill with primary text — never a teal fill. Inactive tabs are transparent
 * with muted text. Horizontally scrollable so long tab sets never truncate.
 */
export default function SegmentedTabs({ tabs, value, onChange }: SegmentedTabsProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <Text
              style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {typeof tab.count === 'number' && (
              <View style={[styles.countPill, active && styles.countPillActive]}>
                <Text
                  style={[styles.countText, active ? styles.countTextActive : styles.countTextInactive]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: 'transparent',
    },
    tabActive: {
      backgroundColor: colors.surfaceRaised,
    },
    label: {
      fontSize: 13,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: colors.text,
      fontWeight: '700',
    },
    labelInactive: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    countPill: {
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 10,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countPillActive: {
      backgroundColor: colors.background,
    },
    countText: {
      fontFamily: font.mono,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    countTextActive: {
      color: colors.text,
    },
    countTextInactive: {
      color: colors.textSecondary,
    },
  });

export { SegmentedTabs };
