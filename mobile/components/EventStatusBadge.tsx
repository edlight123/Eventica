import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Star, TrendingUp, Sparkles, Ticket, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BADGE_COLORS, BadgeStatus } from '../theme/badges';
import { useI18n } from '../contexts/I18nContext';

/** Maps a display status to its BADGE_COLORS key (handles spaced labels). */
const STATUS_KEY: Record<BadgeStatus, keyof typeof BADGE_COLORS> = {
  VIP: 'vip',
  Trending: 'trending',
  New: 'new',
  Free: 'free',
  'Last Chance': 'lastChance',
  'Sold Out': 'soldOut',
};

export interface EventStatusBadgeProps {
  status: BadgeStatus;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export default function EventStatusBadge({ status, size = 'small', style }: EventStatusBadgeProps) {
  const { t } = useI18n();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Premium pulse animation for VIP and Trending
    if (status === 'VIP' || status === 'Trending') {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.85,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [status, scaleAnim, opacityAnim]);

  const getIcon = () => {
    const iconSize = size === 'small' ? 10 : 14;
    const iconColor = '#FFF';

    switch (status) {
      case 'VIP':
        return <Star size={iconSize} color={iconColor} fill={iconColor} />;
      case 'Trending':
        return <TrendingUp size={iconSize} color={iconColor} />;
      case 'New':
        return <Sparkles size={iconSize} color={iconColor} />;
      case 'Free':
        return <Ticket size={iconSize} color={BADGE_COLORS.free.text} />;
      case 'Last Chance':
        return <AlertCircle size={iconSize} color={BADGE_COLORS.lastChance.text} />;
      case 'Sold Out':
        return null;
      default:
        return null;
    }
  };

  const getBadgeContent = () => {
    const colors = BADGE_COLORS[STATUS_KEY[status]] ?? BADGE_COLORS.new;
    const isGradient = 'gradient' in colors;
    const fontSize = size === 'small' ? 10 : 12;
    const paddingHorizontal = size === 'small' ? 8 : 12;
    const paddingVertical = size === 'small' ? 4 : 6;
    const label = t(`badges.${String(status).toLowerCase().replace(/\s+/g, '')}`);
    const accessibilityLabel = `${label} ${t('badges.event')}`;

    if (isGradient) {
      return (
        <Animated.View
          style={[
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            style,
          ]}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="text"
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.badge,
              {
                paddingHorizontal,
                paddingVertical,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 4,
              },
            ]}
          >
            <View style={styles.badgeContent}>
              {getIcon()}
              <Text style={[styles.badgeText, { fontSize, color: colors.text }]}>
                {label}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      );
    }

    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal,
            paddingVertical,
          },
          style,
        ]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="text"
      >
        <View style={styles.badgeContent}>
          {getIcon()}
          <Text style={[styles.badgeText, { fontSize, color: colors.text }]}>
            {label}
          </Text>
        </View>
      </View>
    );
  };

  return getBadgeContent();
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
