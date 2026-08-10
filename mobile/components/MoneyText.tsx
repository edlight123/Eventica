import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLocaleFormat, type FormatMoneyOptions } from '../lib/format';

interface MoneyTextProps {
  /** Amount in MINOR units (cents). Takes precedence over `amount` when set. */
  cents?: number;
  /** Amount in MAJOR units. Ignored when `cents` is provided. */
  amount?: number;
  /** Currency code — defaults to HTG. Controls symbol/placement (never `$`). */
  currency?: 'HTG' | 'USD' | 'CAD' | 'EUR';
  /** Fixed fraction digits (defaults to 2). */
  decimals?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders a formatted currency amount as "prices-as-data" — tabular figures,
 * white by default. The sans face is deliberate: monospace is reserved for true
 * identifiers now, so only the digit alignment is kept, not the mono voice.
 * Placement is HTG/USD aware via the shared formatter, so a
 * `$` is never hardcoded: HTG → `1,234.56 HTG`, USD → `$1,234.56`.
 */
export default function MoneyText({
  cents,
  amount,
  currency = 'HTG',
  decimals,
  style,
}: MoneyTextProps) {
  const { colors } = useTheme();
  const { formatMoney } = useLocaleFormat();

  const opts: FormatMoneyOptions =
    cents !== undefined
      ? { currency, cents: true, decimals }
      : { currency, decimals };
  const value = cents !== undefined ? cents : amount ?? 0;
  const text = formatMoney(value, opts);

  return (
    <Text
      style={[styles.text, { color: colors.text }, style]}
      numberOfLines={1}
      accessibilityLabel={text}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
});

export { MoneyText };
