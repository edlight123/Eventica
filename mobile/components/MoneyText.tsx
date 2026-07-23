import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { font } from '../theme/tokens';
import { useTheme } from '../contexts/ThemeContext';
import { useLocaleFormat, type FormatMoneyOptions } from '../lib/format';

interface MoneyTextProps {
  /** Amount in MINOR units (cents). Takes precedence over `amount` when set. */
  cents?: number;
  /** Amount in MAJOR units. Ignored when `cents` is provided. */
  amount?: number;
  /** Currency code — defaults to HTG. Controls symbol/placement (never `$`). */
  currency?: 'HTG' | 'USD' | 'CAD';
  /** Fixed fraction digits (defaults to 2). */
  decimals?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders a formatted currency amount as "prices-as-data" — mono, tabular,
 * white by default. Placement is HTG/USD aware via the shared formatter, so a
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
    fontFamily: font.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
});

export { MoneyText };
