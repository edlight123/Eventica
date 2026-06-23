import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Optional leading element (e.g. an icon). */
  icon?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Filter pill used for cities, dates and categories.
 * - Inactive: surface fill + border outline + secondary text.
 * - Active:   solid teal fill + onTeal text.
 */
export default function Pill({ label, active = false, onPress, icon, style }: PillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.base, active ? styles.active : styles.inactive, style]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  inactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  icon: {
    marginLeft: -2,
  },
  label: {
    ...type.label,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.onTeal,
    fontWeight: '700',
  },
});
