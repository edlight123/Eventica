import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

export type InfoNoticeTone = 'neutral' | 'warning';

interface InfoNoticeProps {
  /**
   * Leading icon: an Ionicons glyph name or an already-rendered node. Defaults
   * to an informational glyph (neutral) / alert glyph (warning).
   */
  icon?: React.ComponentProps<typeof Ionicons>['name'] | React.ReactNode;
  /** Notice copy (either `text` or `children`). */
  text?: string;
  children?: React.ReactNode;
  tone?: InfoNoticeTone;
}

/**
 * An icon + text notice card. Replaces the old teal `primarySoft`/`infoLight`
 * info washes with a NEUTRAL raised surface. The `warning` tone tints the icon
 * (and text) with `colors.warning` for a subtle accent — the card fill stays
 * neutral; teal is never used as a wash here.
 */
export default function InfoNotice({ icon, text, children, tone = 'neutral' }: InfoNoticeProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const accentColor = tone === 'warning' ? colors.warning : colors.textSecondary;
  const defaultGlyph = tone === 'warning' ? 'warning-outline' : 'information-circle-outline';

  const iconNode =
    icon === undefined || typeof icon === 'string' ? (
      <Ionicons name={(icon as any) || defaultGlyph} size={18} color={accentColor} />
    ) : (
      icon
    );

  return (
    <View style={styles.card} accessible accessibilityRole="text">
      <View style={styles.iconWrap}>{iconNode}</View>
      <Text style={[styles.text, tone === 'warning' && { color: colors.text }]}>
        {text ?? children}
      </Text>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    iconWrap: {
      paddingTop: 1,
    },
    text: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
  });

export { InfoNotice };
