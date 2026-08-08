import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface FilterPillProps {
  /** Default label shown when no value is selected (e.g. "Where"). */
  label: string;
  /** Selected value label; when set, the pill renders active/teal. */
  value?: string | null;
  onPress: () => void;
  /** Optional clear handler — shows an × when active. */
  onClear?: () => void;
}

/**
 * Compact, Posh-style dropdown filter pill. Neutral on a dark surface; flips to
 * solid teal with the chosen value when active.
 */
export default function FilterPill({ label, value, onPress, onClear }: FilterPillProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const active = !!value;

  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {active ? value : label}
      </Text>
      {active && onClear ? (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          style={styles.clearBtn}
        >
          <X size={14} color={colors.onPrimary} />
        </TouchableOpacity>
      ) : (
        <ChevronDown size={15} color={active ? colors.onPrimary : colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    text: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      maxWidth: 150,
    },
    textActive: {
      color: colors.onPrimary,
    },
    clearBtn: {
      marginLeft: -1,
    },
  });
