import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import { radius } from '../../theme/tokens';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * An icon may be:
 *  - a lucide component (e.g. `Calendar`) — matches the Dashboard's `icon={...}`,
 *  - an Ionicons glyph name (e.g. `"wallet-outline"`), or
 *  - any already-rendered node.
 */
export type ActionTileIcon =
  | LucideIcon
  | React.ComponentProps<typeof Ionicons>['name']
  | React.ReactNode;

export interface ActionTile {
  key: string;
  label: string;
  icon: ActionTileIcon;
  onPress: () => void;
}

interface ActionTileGridProps {
  tiles: ActionTile[];
}

function renderIcon(icon: ActionTileIcon, color: string): React.ReactNode {
  // Ionicons glyph name.
  if (typeof icon === 'string') {
    return <Ionicons name={icon as any} size={24} color={color} />;
  }
  // Lucide (or any) component reference.
  if (typeof icon === 'function') {
    const IconComp = icon as LucideIcon;
    return <IconComp size={24} color={color} />;
  }
  // Already-rendered node.
  return icon as React.ReactNode;
}

/**
 * A 2-column grid of tappable action tiles. Tiles are neutral raised surfaces
 * with `text`-colored icons — teal is never used as a tile fill or icon color.
 */
export default function ActionTileGrid({ tiles }: ActionTileGridProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <TouchableOpacity
          key={tile.key}
          style={styles.tile}
          onPress={tile.onPress}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
        >
          <View style={styles.iconWrap}>{renderIcon(tile.icon, colors.text)}</View>
          <Text style={styles.label} numberOfLines={2}>
            {tile.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    tile: {
      // Two columns with a 12px gap between them.
      width: '48%',
      flexGrow: 1,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.lg,
      paddingVertical: 18,
      paddingHorizontal: 16,
      gap: 10,
    },
    iconWrap: {
      height: 24,
      justifyContent: 'center',
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });

export { ActionTileGrid };
