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
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { formatDateForLanguage } from '../lib/dates';
import { getPosterTheme } from '../lib/posterGradient';
import { RADIUS, SHADOWS } from '../config/brand';
import EventStatusBadge from './EventStatusBadge';
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
  const remaining = (event.total_tickets || 0) - (event.tickets_sold || 0);
  const isSoldOut = remaining <= 0 && (event.total_tickets || 0) > 0;
  const isNew =
    event.start_datetime &&
    new Date(event.start_datetime).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  // Resolve which status badge to show (explicit override wins).
  const status: BadgeStatus | null =
    badge !== undefined
      ? badge
      : isSoldOut
        ? 'Sold Out'
        : price > 100
          ? 'VIP'
          : isNew
            ? 'New'
            : null;

  const dateLabel = event.start_datetime
    ? formatDateForLanguage(new Date(event.start_datetime), 'EEE, MMM d · h:mm a', language)
    : '';
  const location = [event.venue_name, event.city].filter(Boolean).join(', ');

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
        <View style={[styles.poster, { aspectRatio: 1 / ratio }]}>
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

          {status && (
            <View style={styles.badgeWrap}>
              <EventStatusBadge status={status} size="small" />
            </View>
          )}
        </View>

        {/* All text sits BELOW the poster so it never covers the artwork. */}
        <View style={styles.content}>
          {event.category ? (
            <Text style={styles.category} numberOfLines={1}>
              {getCategoryLabel(t, event.category)}
            </Text>
          ) : null}

          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          {showMeta && (
            <View style={styles.meta}>
              {!!dateLabel && (
                <View style={styles.metaRow}>
                  <Calendar size={13} color={colors.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {dateLabel}
                  </Text>
                </View>
              )}
              {!!location && (
                <View style={styles.metaRow}>
                  <MapPin size={13} color={colors.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {location}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.footer}>
            {isFree ? (
              <Text style={styles.free}>{t('common.free').toUpperCase()}</Text>
            ) : (
              <Text style={styles.price}>
                {event.currency || 'HTG'} {price.toLocaleString()}
              </Text>
            )}
            {friendsGoing > 0 ? (
              <View style={styles.friendsRow}>
                <Users size={13} color={colors.primary} />
                <Text style={styles.friends}>
                  {friendsGoing} {t('common.going')}
                </Text>
              </View>
            ) : event.tickets_sold !== undefined && (event.tickets_sold || 0) > 0 ? (
              <Text style={styles.sold}>
                {event.tickets_sold} {t('common.sold')}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
      ...SHADOWS.card,
    },
    poster: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    imgHidden: {
      opacity: 0,
    },
    monogram: {
      fontSize: 64,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.28)',
    },
    badgeWrap: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    content: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 5,
    },
    category: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      lineHeight: 20,
      letterSpacing: -0.2,
    },
    meta: {
      gap: 4,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '500',
      flexShrink: 1,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    price: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    free: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    sold: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    friendsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    friends: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
  });
