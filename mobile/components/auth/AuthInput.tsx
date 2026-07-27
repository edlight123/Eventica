import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '../../theme/tokens';

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  /** Leading lucide icon (e.g. Mail, Lock, User) — tints teal when focused. */
  icon: LucideIcon;
  /** Password cell: masks input and shows a reveal (eye) toggle. */
  isPassword?: boolean;
}

/**
 * A crafted auth input cell (POSH direction): an elevated dark surface rather
 * than a thin hairline box. ~56px tall, rounded, with a leading icon and a
 * teal focus ring as a semantic active state. Password cells get a reveal
 * toggle. Depth is a brightness step — the cell lifts from surface → raised on
 * focus rather than drawing a louder border.
 */
export const AuthInput = forwardRef<TextInput, AuthInputProps>(
  ({ icon: Icon, isPassword, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);

    const activeColor = focused ? colors.accent : colors.textTertiary;
    // Chain the caller's focus/blur handlers (used for return-key advancing)
    // through our own focus-ring state.
    const { onFocus, onBlur } = rest;

    return (
      <View style={[styles.cell, focused && styles.cellFocused]}>
        <Icon size={20} color={activeColor} strokeWidth={2} />
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          secureTextEntry={isPassword ? hidden : false}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            {hidden ? (
              <Eye size={20} color={colors.textTertiary} strokeWidth={2} />
            ) : (
              <EyeOff size={20} color={colors.accent} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
      </View>
    );
  },
);

AuthInput.displayName = 'AuthInput';

const styles = StyleSheet.create({
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 56,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cellFocused: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    // Remove the default vertical padding so text sits centered in the 56px cell.
    paddingVertical: 0,
  },
});

export default AuthInput;
