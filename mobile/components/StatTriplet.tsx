import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, font } from '../theme/tokens';

export type StatTone = 'default' | 'brand' | 'amber' | 'emerald';

export interface StatItem {
  /** Small muted uppercase caption, e.g. "REVENUE". */
  label: string;
  /**
   * The big numeral. `null` renders a muted "•••" (still-loading) — never a
   * premature 0, which reads as bad news to an organizer (POSH §2.11).
   */
  value: string | number | null;
  /** Tints the numeral only (default = white). */
  tone?: StatTone;
}

interface StatTripletProps {
  items: StatItem[];
  /** Max cells per row (default 3 — the classic triplet). Wraps below that. */
  columns?: number;
}

const TONE_COLOR: Record<StatTone, string> = {
  default: colors.textPrimary,
  brand: colors.accent,
  amber: colors.amber,
  emerald: colors.emerald,
};

/** Split items into rows of at most `perRow`. */
function chunk<T>(arr: T[], perRow: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += perRow) {
    rows.push(arr.slice(i, i + perRow));
  }
  return rows;
}

/**
 * The metric triplet (POSH §2.3): reused on every host surface. A small (~11px)
 * muted UPPERCASE label above a big (~27px) bold WHITE (tabular) numeral.
 * Surfaces via elevation (surfaceRaised) + a subtle hairline divider between
 * cells — NOT a 1px bordered box.
 */
export default function StatTriplet({ items, columns = 3 }: StatTripletProps) {
  const perRow = Math.max(1, Math.min(columns, items.length || 1));
  const rows = chunk(items, perRow);

  return (
    <View style={styles.container}>
      {rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={[styles.row, rowIdx > 0 && styles.rowDivider]}
        >
          {row.map((item, cellIdx) => {
            const isLoading = item.value === null || item.value === undefined;
            const tone = item.tone ?? 'default';
            return (
              <View
                key={`${rowIdx}-${cellIdx}`}
                style={[styles.cell, cellIdx === 0 && styles.cellFirst, cellIdx > 0 && styles.cellDivider]}
              >
                <Text style={styles.label} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.value, { color: TONE_COLOR[tone] }]}
                  numberOfLines={1}
                  accessibilityLabel={
                    isLoading ? 'loading' : String(item.value)
                  }
                >
                  {isLoading ? '•••' : String(item.value)}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // No filled box (beta feedback: "I don't like the stats boxes background") —
  // numerals sit directly on the canvas, structured only by hairline dividers.
  container: {
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowDivider: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'flex-start',
  },
  // Without the filled box, the leading cell aligns flush with the content gutter.
  cellFirst: {
    paddingLeft: 0,
  },
  cellDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  label: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontFamily: font.mono,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});

export { StatTriplet };
