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
  markOnly = false,
  style,
}: {
  fontSize?: number;
  color?: string;
  accent?: string;
  /**
   * Render just the "t" — the collapsed form for a scrolled header, where the
   * full wordmark costs more width than the row can spare. Same face and size,
   * so it cross-fades with the full mark without any visible reflow.
   */
  markOnly?: boolean;
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
      {markOnly ? 't' : <>tik<Text style={{ color: accent }}>è</Text>m</>}
    </Text>
  );
}

export default TikemWordmark;
