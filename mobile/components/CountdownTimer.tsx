import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { font } from '../theme/tokens';

/**
 * Compact, single-line "starts in" countdown (tester feedback: the old
 * three-column DAYS/HOURS/MINS block ate ~90pt directly under the title for
 * information that fits on one line).
 *
 * It is deliberately self-contained and used ONLY by EventDetailScreen, where it
 * renders as one extra line inside the date fact row. To drop the countdown
 * entirely: delete this file, its import, and the single <CountdownTimer /> line
 * in screens/EventDetailScreen.tsx. Nothing else references it.
 */
interface CountdownTimerProps {
  targetDate: Date;
  /**
   * Localized prefix, e.g. "Starts in". Passed in (rather than read from the
   * dictionary here) so the screen owns the copy and this stays presentational.
   */
  label: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Coarse-to-fine compact remainder: "2d 11h" → "11h 27m" → "27m 04s" → "42s".
 * Returns null once the target has passed.
 */
function formatCompactRemaining(target: Date): string | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${seconds}s`;
}

export default function CountdownTimer({ targetDate, label, style }: CountdownTimerProps) {
  const { colors } = useTheme();
  const [remaining, setRemaining] = useState<string | null>(() => formatCompactRemaining(targetDate));

  // Still live — ticks every second so the sub-minute readout counts down.
  useEffect(() => {
    setRemaining(formatCompactRemaining(targetDate));
    const interval = setInterval(() => {
      setRemaining(formatCompactRemaining(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!remaining) return null;

  return (
    <Text style={[styles.line, { color: colors.primary }, style]} numberOfLines={1}>
      {`${label} ${remaining}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
});
