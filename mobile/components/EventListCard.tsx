import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { getPosterTheme } from '../lib/posterGradient';
import { formatDateForLanguage } from '../lib/dates';
import { font } from '../theme/tokens';

interface EventListCardProps {
  event: any;
  onPress: () => void;
}

/**
 * A horizontal list card: portrait 4:5 poster on the left, event details
 * (title, date, venue, price) on the right. Mirrors PosterEventCard's poster
 * fallback (deterministic teal gradient) and formatting conventions.
 */
export default function EventListCard({ event, onPress }: EventListCardProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = getStyles(colors);

  const theme = getPosterTheme(event.id || event.title, event.category);

  const price = Number(event.ticket_price || 0);
  const isFree = !price || price === 0;

  const dateLabel = event.start_datetime
    ? formatDateForLanguage(new Date(event.start_datetime), 'EEE, MMM d · h:mm a', language)
    : '';
  const location = [event.venue_name, event.city].filter(Boolean).join(', ');

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      {/* LEFT: portrait poster with deterministic gradient fallback. */}
      <View style={styles.poster}>
        <LinearGradient
          colors={theme.colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {event.banner_image_url ? (
          <Image
            source={{ uri: event.banner_image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}
      </View>

      {/* RIGHT: event details. */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {event.start_datetime ? (
          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {dateLabel}
            </Text>
          </View>
        ) : null}

        {location ? (
          <View style={styles.metaRow}>
            <MapPin size={13} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}

        <View style={styles.priceWrap}>
          {isFree ? (
            <Text style={styles.priceFree}>{t('common.free').toUpperCase()}</Text>
          ) : (
            <Text style={styles.price}>
              {event.currency || 'HTG'} {price.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      paddingVertical: 10,
      marginBottom: 4,
      gap: 12,
      alignItems: 'center',
    },
    poster: {
      width: 92,
      aspectRatio: 4 / 5,
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      gap: 6,
    },
    title: {
      fontFamily: font.serif,
      fontSize: 18,
      color: colors.text,
      lineHeight: 21,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontFamily: font.monoRegular,
      fontSize: 11.5,
      color: colors.textSecondary,
      letterSpacing: 0.3,
      flexShrink: 1,
    },
    priceWrap: {
      marginTop: 2,
    },
    priceFree: {
      fontFamily: font.mono,
      color: colors.primary,
      fontSize: 12,
      letterSpacing: 0.8,
    },
    price: {
      fontFamily: font.mono,
      color: colors.primary,
      fontSize: 14,
      letterSpacing: 0.3,
    },
  });
