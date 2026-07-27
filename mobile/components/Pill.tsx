import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Optional leading element (e.g. an icon). */
  icon?: React.ReactNode;
  /**
   * Active-state look. 'teal' (default) keeps the existing teal fill used by
   * the browse filters. 'neutral' selects with a white surface + primary text
   * instead — the POSH-correct choice on chrome where teal isn't semantic.
   * Default is unchanged so existing call sites keep the teal selection.
   */
  variant?: 'teal' | 'neutral';
  style?: ViewStyle;
}

/**
 * Filter pill used for cities, dates and categories.
 * - Inactive: surface fill + border outline + secondary text.
 * - Active:   solid teal fill + onTeal text (variant='teal', default), or a
 *   white surface + black text (variant='neutral').
 */
export default function Pill({ label, active = false, onPress, icon, variant = 'teal', style }: PillProps) {
  const activeSurface = variant === 'neutral' ? styles.activeNeutral : styles.active;
  const activeLabel = variant === 'neutral' ? styles.labelActiveNeutral : styles.labelActive;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.base, active ? activeSurface : styles.inactive, style]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[styles.label, active ? activeLabel : styles.labelInactive]}
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
    borderRadius: 10,
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
  activeNeutral: {
    backgroundColor: colors.white,
    borderColor: colors.white,
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
  labelActiveNeutral: {
    color: colors.onWhite,
    fontWeight: '700',
  },
});
