import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { formatDateForLanguage } from '../lib/dates';
import { getPosterTheme } from '../lib/posterGradient';
import type { BadgeStatus } from '../theme/badges';

interface PosterEventCardProps {
  event: any;
  onPress: () => void;
  /** Fixed width (for horizontal rails). Omit to flex to the parent. */
  width?: number;
  /** Poster height / width ratio. 1.25 = 4:5 (default), 1.1 = wider hero. */
  ratio?: number;
  /** Override the auto-derived status badge. */
  badge?: BadgeStatus | null;
  /** Show the bottom meta strip (date + venue). Default true. */
  showMeta?: boolean;
  /** Optional "N friends going" social proof shown in the footer. */
  friendsGoing?: number;
  /** Optional node rendered over the poster's top-left (e.g. a quick action). */
  overlay?: React.ReactNode;
  /** Horizontal (and top) inset around the poster so it sits inside the card
   *  edges with visible gutters. Default 0 keeps the poster flush (Home/Favorites). */
  posterInsetX?: number;
}

/**
 * The single, poster-led event card used across every discovery surface.
 * - Real banner when available; otherwise a deterministic teal poster gradient
 *   (never a grey placeholder).
 * - Title rendered over the poster with a readable scrim.
 * - Auto-derives Free / Sold Out / VIP / New badges, or accepts an override.
 */
export default function PosterEventCard({
  event,
  onPress,
  width,
  ratio = 1.25,
  badge,
  showMeta = true,
  friendsGoing = 0,
  overlay,
  posterInsetX = 0,
}: PosterEventCardProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = getStyles(colors);
  const scale = useRef(new Animated.Value(1)).current;
  const [imgLoaded, setImgLoaded] = useState(false);

  const hasImage = Boolean(event.banner_image_url);
  const theme = getPosterTheme(event.id || event.title, event.category);

  const price = Number(event.ticket_price || 0);
  const isFree = !price || price === 0;

  const dateLabel = event.start_datetime
    ? formatDateForLanguage(new Date(event.start_datetime), 'EEE, MMM d', language)
    : '';
  // Kept short so it can share a single line with the price.
  const locationLabel = event.city || event.venue_name || '';

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, width ? { width } : { flex: 1 }]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.card}
      >
        <View style={{ paddingHorizontal: posterInsetX, paddingTop: posterInsetX }}>
          <View style={[styles.poster, { aspectRatio: 1 / ratio }, posterInsetX > 0 && styles.posterInset]}>
            {/* Poster gradient sits behind the image as the fallback art. */}
            <LinearGradient
              colors={theme.colors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {hasImage ? (
              <Image
                source={{ uri: event.banner_image_url }}
                style={[StyleSheet.absoluteFill, !imgLoaded && styles.imgHidden]}
                resizeMode="cover"
                onLoad={() => setImgLoaded(true)}
              />
            ) : (
              <Text style={styles.monogram} numberOfLines={1}>
                {(event.title || '?').trim().charAt(0).toUpperCase()}
              </Text>
            )}

            {overlay ? <View style={styles.overlayWrap}>{overlay}</View> : null}
          </View>
        </View>

        {/* Minimal content sits BELOW the poster so it never covers the artwork.
            Two compact lines: title · date, then location · price. */}
        <View style={styles.content}>
          <View style={styles.metaLine}>
            <Text style={styles.title} numberOfLines={1}>
              {event.title}
            </Text>
            {showMeta && !!dateLabel && (
              <Text style={styles.date} numberOfLines={1}>
                {dateLabel}
              </Text>
            )}
          </View>

          <View style={styles.metaLine}>
            {showMeta && !!locationLabel ? (
              <Text style={styles.location} numberOfLines={1}>
                {locationLabel}
              </Text>
            ) : (
              <View style={styles.spacer} />
            )}
            {isFree ? (
              <Text style={styles.free}>{t('common.free').toUpperCase()}</Text>
            ) : (
              <Text style={styles.price} numberOfLines={1}>
                {event.currency || 'HTG'} {price.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    // Posh-style: no card fill, border, or shadow — the poster sits directly
    // on the page and the text sits beneath it on the dark canvas.
    card: {
      backgroundColor: 'transparent',
    },
    poster: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    posterInset: {
      borderRadius: 14,
      overflow: 'hidden',
    },
    imgHidden: {
      opacity: 0,
    },
    monogram: {
      fontSize: 64,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.28)',
    },
    overlayWrap: {
      position: 'absolute',
      top: 10,
      left: 10,
    },
    content: {
      paddingTop: 6,
      gap: 2,
    },
    metaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    spacer: {
      flex: 1,
    },
    title: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 18,
      letterSpacing: -0.2,
    },
    date: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: -0.1,
    },
    location: {
      flexShrink: 1,
      fontSize: 12.5,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    price: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: -0.2,
    },
    free: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
  });
