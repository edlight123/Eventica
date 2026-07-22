import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import WhitePillCTA from './WhitePillCTA';

interface EmptyStateProps {
  /** A lucide icon component (preferred) … */
  icon?: LucideIcon;
  /** … or an emoji fallback. */
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * The empty-state formula (POSH §2.6): a thin CENTERED OUTLINE icon on the bare
 * canvas → a bold headline → ONE muted explanatory line → ONE white-pill CTA.
 * Never more. No teal-filled disc, no teal button — the CTA is the single
 * white primary action.
 *
 * The prop API (icon / emoji / title / subtitle / actionLabel / onAction /
 * compact) is unchanged so existing call sites keep working; only the styling
 * moved to the POSH formula.
 */
export default function EmptyState({
  icon: Icon,
  emoji,
  title,
  subtitle,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {Icon ? (
        <Icon size={40} color={colors.textSecondary} strokeWidth={1.5} style={styles.icon} />
      ) : (
        <Text style={styles.emoji}>{emoji || '✨'}</Text>
      )}
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <WhitePillCTA label={actionLabel} onPress={onAction} style={styles.cta} />
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 56,
    },
    compact: {
      paddingVertical: 32,
    },
    icon: {
      marginBottom: 16,
    },
    emoji: {
      fontSize: 40,
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      maxWidth: 300,
    },
    cta: {
      marginTop: 24,
    },
  });
