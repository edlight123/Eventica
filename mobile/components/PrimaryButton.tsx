import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '../theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** 'solid' (teal) or 'outline' (teal text on transparent). */
  variant?: 'solid' | 'outline';
  /**
   * Pin to the bottom safe-area as a sticky CTA (event detail "Get Tickets").
   * Adds a dark bar + hairline top border behind the button.
   */
  sticky?: boolean;
  style?: ViewStyle;
}

/**
 * The single primary call-to-action. Solid teal background, dark on-teal text,
 * full-width, large radius. The conversion moment — identical everywhere.
 */
export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  variant = 'solid',
  sticky = false,
  style,
}: PrimaryButtonProps) {
  const insets = useSafeAreaInsets();
  const isOutline = variant === 'outline';

  const button = (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.button,
        isOutline ? styles.outline : styles.solid,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.teal : colors.onTeal} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, isOutline ? styles.labelOutline : styles.labelSolid]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (!sticky) return button;

  return (
    <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  solid: {
    backgroundColor: colors.teal,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.teal,
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
  },
  labelSolid: {
    color: colors.onTeal,
  },
  labelOutline: {
    color: colors.teal,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
