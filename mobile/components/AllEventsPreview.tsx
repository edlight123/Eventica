import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Calendar, MapPin, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import EventStatusBadge from './EventStatusBadge';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';

import { formatDateForLanguage } from '../lib/dates';

interface AllEventsPreviewProps {
  events: any[];
  onEventPress: (eventId: string) => void;
  onViewAll: () => void;
}

const CompactEventCard = ({ event, onPress }: { event: any; onPress: () => void }) => {
  const { t, language } = useI18n();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const isVIP = (event.ticket_price || 0) > 100;
  const isFree = !event.ticket_price || event.ticket_price === 0;
  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
  const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardLeft}>
          {event.banner_image_url ? (
            <Image
              source={{ uri: event.banner_image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.placeholderEmoji}>🎉</Text>
            </View>
          )}
          
          {(isVIP || isSoldOut) && (
            <View style={styles.badgeContainer}>
              {isVIP && <EventStatusBadge status="VIP" size="small" />}
              {isSoldOut && <EventStatusBadge status="Sold Out" size="small" />}
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.category}>{getCategoryLabel(t, event.category)}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={styles.detailText}>
                {event.start_datetime &&
                  formatDateForLanguage(new Date(event.start_datetime), 'MMM dd', language)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={12} color={colors.textSecondary} />
              <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="tail">
                {event.venue_name}
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            {!isFree && event.ticket_price > 0 ? (
              <Text style={styles.price}>
                {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.free}>{t('common.free').toUpperCase()}</Text>
            )}
          </View>
        </View>

        <ChevronRight size={20} color={colors.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function AllEventsPreview({
  events,
  onEventPress,
  onViewAll,
}: AllEventsPreviewProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const displayEvents = events.slice(0, 6);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{t('home.allEventsTitle')}</Text>
        <Text style={styles.subtitle}>{t('home.allEventsSubtitle')}</Text>
      </View>

      <View style={styles.list}>
        {displayEvents.map((event) => (
          <CompactEventCard
            key={event.id}
            event={event}
            onPress={() => onEventPress(event.id)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
        <Text style={styles.viewAllText}>{t('home.viewAllEvents')}</Text>
        <ChevronRight size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
  },
  header: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    position: 'relative',
    marginRight: 12,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  badgeContainer: {
    position: 'absolute',
    top: 4,
    left: 4,
    gap: 4,
  },
  cardContent: {
    flex: 1,
  },
  category: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  details: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  free: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 6,
  },
});
