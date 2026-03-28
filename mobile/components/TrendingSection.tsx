import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import EventStatusBadge from './EventStatusBadge';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';

import { formatDateForLanguage } from '../lib/dates';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const CARD_SPACING = 16;

interface TrendingSectionProps {
  events: any[];
  onEventPress: (eventId: string) => void;
  onViewAll: () => void;
}

const TrendingEventCard = ({ event, onPress }: { event: any; onPress: () => void }) => {
  const { t, language } = useI18n();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {event.banner_image_url && (
          <Image
            source={{ uri: event.banner_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.badgesContainer}>
          <EventStatusBadge status="Trending" size="small" />
          {isVIP && <EventStatusBadge status="VIP" size="small" />}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardCategory}>{getCategoryLabel(t, event.category)}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.cardDetails}>
            <View style={styles.cardDetailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.cardDetailText}>
                {event.start_datetime &&
                  formatDateForLanguage(new Date(event.start_datetime), 'MMM dd, h:mm a', language)}
              </Text>
            </View>
            <View style={styles.cardDetailRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.cardDetailText} numberOfLines={1}>
                {event.venue_name}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {!isFree && event.ticket_price > 0 ? (
              <Text style={styles.cardPrice}>
                {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
              </Text>
            ) : (
              <Text style={styles.cardFree}>{t('common.free').toUpperCase()}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TrendingSection({
  events,
  onEventPress,
  onViewAll,
}: TrendingSectionProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  if (events.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔥 {t('home.trendingTitle')}</Text>
          <Text style={styles.subtitle}>{t('home.trendingSubtitle')}</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAll}>{t('common.viewAll')} →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
      >
        {events.map((event, index) => (
          <TrendingEventCard
            key={event.id}
            event={event}
            onPress={() => onEventPress(event.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.borderLight,
  },
  badgesContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    gap: 6,
    zIndex: 10,
  },
  cardContent: {
    padding: 16,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 24,
  },
  cardDetails: {
    marginBottom: 12,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  cardFree: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
});
