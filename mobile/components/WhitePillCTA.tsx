import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, type } from '../theme/tokens';

export type WhitePillVariant = 'paid' | 'rsvp' | 'default';

interface WhitePillCTAProps {
  /** Primary label, e.g. "Achte tikè" | "RSVP". */
  label: string;
  /** Muted inline sub-label, e.g. a price "apati 1,500 HTG" (typically paid only). */
  subLabel?: string;
  onPress?: () => void;
  /** Semantic variant. Affects intent/labelling only — the pill is always white. */
  variant?: WhitePillVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Optional leading icon (rendered black to match the label). */
  icon?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * The single primary action per screen (POSH §2.2): a solid WHITE pill with
 * BLACK text, ~56px tall, fully rounded, bold. Teal is deliberately NOT used
 * here — the primary action is white so the poster art stays the only color.
 *
 * `subLabel` renders inline, muted (black-60), stating the commitment, e.g.
 *   Achte tikè · apati 1,500 HTG
 */
export default function WhitePillCTA({
  label,
  subLabel,
  onPress,
  variant = 'default',
  disabled = false,
  loading = false,
  icon,
  style,
}: WhitePillCTAProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={subLabel ? `${label}, ${subLabel}` : label}
      style={({ pressed }) => [
        styles.button,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onWhite} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {subLabel ? (
            <Text style={styles.subLabel} numberOfLines={1}>
              {subLabel}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.white,
  },
  pressed: {
    // Slight dim on press — no color shift, stays white.
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    marginLeft: -2,
  },
  label: {
    ...type.title,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onWhite,
  },
  subLabel: {
    ...type.label,
    fontSize: 14,
    fontWeight: '500',
    color: colors.onWhiteMuted,
  },
});
