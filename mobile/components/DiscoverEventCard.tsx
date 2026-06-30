import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Bookmark, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { formatDateForLanguage } from '../lib/dates';
import { getPosterTheme } from '../lib/posterGradient';

const { width } = Dimensions.get('window');

interface DiscoverEventCardProps {
  event: any;
  onPress: () => void;
  onShare?: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
}

/**
 * Large, Posh-style Discover feed card: full-bleed poster, then title,
 * organizer, date/venue, share + save, and a white "Get Tickets" CTA.
 */
export default function DiscoverEventCard({
  event,
  onPress,
  onShare,
  onToggleSave,
  saved,
}: DiscoverEventCardProps) {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const styles = getStyles(colors);
  const [imgLoaded, setImgLoaded] = useState(false);

  const theme = getPosterTheme(event.id || event.title, event.category);
  const hasImage = Boolean(event.banner_image_url || event.cover_image_url);
  const price = Number(event.ticket_price || 0);
  const isFree = !price || price === 0;
  const organizer = event.users?.full_name || event.organizer_name || '';

  const dateLabel = event.start_datetime
    ? formatDateForLanguage(new Date(event.start_datetime), 'EEE, MMM d · h:mm a', language)
    : '';
  const venue = [event.venue_name, event.city].filter(Boolean).join(', ');

  return (
    <View style={styles.wrap}>
      {/* Poster */}
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.poster}>
        <LinearGradient
          colors={theme.colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {hasImage && (
          <Image
            source={{ uri: event.banner_image_url || event.cover_image_url }}
            style={[StyleSheet.absoluteFill, !imgLoaded && { opacity: 0 }]}
            resizeMode="cover"
            onLoad={() => setImgLoaded(true)}
          />
        )}
      </TouchableOpacity>

      {/* Title + organizer + meta, with share/save on the right */}
      <View style={styles.body}>
        <View style={styles.bodyText}>
          <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          </TouchableOpacity>
          {!!organizer && (
            <View style={styles.orgRow}>
              <Text style={styles.org} numberOfLines={1}>{organizer}</Text>
              {event.users?.is_verified && <ShieldCheck size={14} color={colors.primary} />}
            </View>
          )}
          {(dateLabel || venue) && (
            <Text style={styles.meta} numberOfLines={2}>
              {[dateLabel, venue].filter(Boolean).join(' at ')}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onShare} hitSlop={8} style={styles.actionBtn}>
            <Share2 size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onToggleSave} hitSlop={8} style={styles.actionBtn}>
            <Bookmark size={20} color={saved ? colors.primary : colors.textSecondary} fill={saved ? colors.primary : 'transparent'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Get Tickets CTA */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.cta}>
        <Text style={styles.ctaText}>
          {t('home.getTickets')}
          {!isFree && (
            <Text style={styles.ctaPrice}>  {t('common.from')} {event.currency || 'HTG'} {price.toLocaleString()}</Text>
          )}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    wrap: {
      marginBottom: 28,
    },
    poster: {
      width: '100%',
      height: Math.round((width - 32) * 1.15),
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 12,
      gap: 12,
    },
    bodyText: {
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      lineHeight: 27,
    },
    orgRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 5,
    },
    org: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    meta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 19,
    },
    actions: {
      flexDirection: 'row',
      gap: 14,
      paddingTop: 4,
    },
    actionBtn: {
      padding: 2,
    },
    cta: {
      marginTop: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaText: {
      color: '#111111',
      fontSize: 16,
      fontWeight: '800',
    },
    ctaPrice: {
      color: '#6B6B6B',
      fontSize: 15,
      fontWeight: '600',
    },
  });
