import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing } from '../../theme/tokens';
import { TikemWordmark } from '../TikemWordmark';

interface AuthHeadlineProps {
  /** Small teal, uppercase, letter-spaced eyebrow — e.g. "HAITI & THE DIASPORA". */
  eyebrow: string;
  /** Leading (white) part of the big serif headline — e.g. "Where Haiti goes ". */
  lead: string;
  /** Accent (teal) part of the headline — e.g. "out." */
  accent: string;
}

/**
 * The top-anchored, LEFT-ALIGNED editorial block for the auth screens (POSH
 * §2.5 — oversized editorial titles, left-aligned, allowed to wrap). A small
 * brand wordmark sits above a big Instrument Serif headline whose final word is
 * teal. This fills the top third and kills the old centered dead space.
 */
export function AuthHeadline({ eyebrow, lead, accent }: AuthHeadlineProps) {
  return (
    <View style={styles.root}>
      <TikemWordmark fontSize={30} style={styles.wordmark} />

      <Text style={styles.eyebrow} allowFontScaling={false}>
        {eyebrow}
      </Text>

      <Text style={styles.headline} allowFontScaling={false}>
        {lead}
        <Text style={styles.headlineAccent}>{accent}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'flex-start',
  },
  wordmark: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 2.4,
    color: colors.tealBright,
    marginBottom: spacing.sm + 2,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: font.serif,
    fontSize: 46,
    lineHeight: 48,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  headlineAccent: {
    color: colors.tealBright,
  },
});

export default AuthHeadline;
