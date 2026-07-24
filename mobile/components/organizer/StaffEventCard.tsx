import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { radius } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface StaffEventCardProps {
  title: string;
  /** Secondary line, e.g. venue • city. */
  subtitle?: string;
  /** Tertiary muted line, e.g. a date or "Tap to open scanner". */
  meta?: string;
  onPress?: () => void;
  /** Trailing node (chevron, status chip, checkmark, etc.). */
  right?: React.ReactNode;
}

/**
 * A list card for an event in staff / scan lists. Separates from the canvas by
 * ELEVATION (a raised surface), not a 1px box border.
 */
export default function StaffEventCard({
  title,
  subtitle,
  meta,
  onPress,
  right,
}: StaffEventCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {!!meta && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </TouchableOpacity>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.lg,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    textCol: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textSecondary,
    },
    meta: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textTertiary,
    },
    right: {
      marginLeft: 'auto',
    },
  });

export { StaffEventCard };
