import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import PaginationDots from './PaginationDots';
import { useI18n } from '../contexts/I18nContext';
import { getPosterTheme } from '../lib/posterGradient';

import { formatDateForLanguage } from '../lib/dates';

interface Event {
  id: string;
  title: string;
  description: string;
  start_datetime: Date;
  banner_image_url?: string;
  venue_name: string;
  city: string;
  category: string;
  ticket_price?: number;
  currency?: string;
}

interface FeaturedCarouselProps {
  events: Event[];
  onEventPress: (eventId: string) => void;
}

const { width } = Dimensions.get('window');

export default function FeaturedCarousel({ events, onEventPress }: FeaturedCarouselProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, language } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (events.length <= 1) return;
    
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % events.length;
      
      // Scroll to exact position accounting for card width and margins
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, events.length]);

  if (!events || events.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        snapToInterval={width}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      >
        {events.map((event) => {
          const theme = getPosterTheme(event.id || event.title, event.category);
          return (
          <TouchableOpacity
            key={event.id}
            style={styles.card}
            onPress={() => onEventPress(event.id)}
            activeOpacity={0.95}
          >
            {/* Teal poster gradient always sits behind the banner as the fallback */}
            <LinearGradient
              colors={theme.colors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.image}
            />
            {event.banner_image_url && (
              <Image source={{ uri: event.banner_image_url }} style={styles.image} />
            )}
            {/* Single, bottom-weighted scrim keeps the poster visible while
                the title/meta stay readable (Posh-style poster-forward). */}
            <LinearGradient
              colors={['transparent', 'transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.gradientOverlay}
            />

            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

              <View style={styles.details}>
                <View style={styles.detailRow}>
                  <Calendar size={15} color={colors.primaryLight} />
                  <Text style={styles.detailText}>
                    {formatDateForLanguage(new Date(event.start_datetime), 'MMM d, yyyy', language)}
                  </Text>
                </View>
                <Text style={styles.separator}>•</Text>
                <View style={styles.detailRow}>
                  <MapPin size={15} color={colors.primaryLight} />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {event.venue_name}, {event.city}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Animated Pagination Dots */}
      <PaginationDots total={events.length} activeIndex={currentIndex} />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    width: width - 32,
    height: 440,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    lineHeight: 34,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.primary,
  },
});
