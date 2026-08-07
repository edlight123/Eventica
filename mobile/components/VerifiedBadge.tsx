import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors, font } from '../theme/tokens';

export type VerifiedBadgeSize = 'small' | 'medium' | 'large';

interface VerifiedBadgeProps {
  /** Show the "Verified" text alongside the shield (default: icon only). */
  showLabel?: boolean;
  /** Override the label text (defaults to "Verified"). */
  label?: string;
  size?: VerifiedBadgeSize;
  style?: ViewStyle;
}

const SIZES: Record<VerifiedBadgeSize, { icon: number; font: number }> = {
  small: { icon: 12, font: 10 },
  medium: { icon: 14, font: 11 },
  large: { icon: 18, font: 13 },
};

/**
 * The one verified marker (POSH §2.7). Consolidates the ad-hoc Shield /
 * ShieldCheck marks scattered across screens into a single teal badge — teal
 * here CARRIES MEANING (this account is verified), which is exactly what the
 * accent is reserved for.
 */
export default function VerifiedBadge({
  showLabel = false,
  label = 'Verified',
  size = 'small',
  style,
}: VerifiedBadgeProps) {
  const dims = SIZES[size];

  if (!showLabel) {
    return (
      <ShieldCheck
        size={dims.icon}
        color={colors.accent}
        accessibilityLabel={label}
        style={style}
      />
    );
  }

  return (
    <View
      style={[styles.pill, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <ShieldCheck size={dims.icon} color={colors.accent} />
      <Text style={[styles.label, { fontSize: dims.font }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Deliberately NOT a filled pill: the owner's standing rule is a mark + label,
  // never a tinted capsule. The teal shield already carries the meaning, so the
  // background was doing nothing but adding weight.
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  label: {
    fontFamily: font.mono,
    color: colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
