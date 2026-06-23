import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { RADIUS, SHADOWS } from '../config/brand';

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

/** A consistent, modern empty state used across screens. */
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
      <View style={styles.iconCircle}>
        {Icon ? <Icon size={30} color={colors.primary} /> : <Text style={styles.emoji}>{emoji || '✨'}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.9}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
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
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emoji: {
      fontSize: 30,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 20,
      maxWidth: 300,
    },
    action: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: RADIUS.lg,
      ...SHADOWS.floating,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
