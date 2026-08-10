import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';

/** Accent color for the "è" — unifies the wordmark with the platform's teal. */
export const TIKEM_ACCENT = '#2DD4BF';

/**
 * tikèm wordmark — "Option A": lowercase, italic editorial serif (Instrument
 * Serif, same as the web) with a teal accent "è". Vector text, so it stays
 * crisp at any size and matches the website exactly (no PNG wordmark needed).
 *
 * Requires `InstrumentSerif_400Regular_Italic` to be loaded (see App.tsx).
 */
export function TikemWordmark({
  fontSize = 40,
  color = '#FFFFFF',
  accent = TIKEM_ACCENT,
  style,
}: {
  fontSize?: number;
  color?: string;
  accent?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          fontFamily: 'InstrumentSerif_400Regular_Italic',
          fontSize,
          lineHeight: fontSize * 1.04,
          color,
          letterSpacing: 0.2,
        },
        style,
      ]}
    >
      tik<Text style={{ color: accent }}>è</Text>m
    </Text>
  );
}

export default TikemWordmark;
