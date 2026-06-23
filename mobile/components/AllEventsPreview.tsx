import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { RADIUS, SHADOWS } from '../config/brand';
import PosterEventCard from './PosterEventCard';
import SectionHeader from './SectionHeader';

const { width } = Dimensions.get('window');
// Big, scannable poster cards in a horizontal rail (text sits below each poster).
const RAIL_WIDTH = Math.min(264, width * 0.66);

interface AllEventsPreviewProps {
  events: any[];
  onEventPress: (eventId: string) => void;
  onViewAll: () => void;
}

export default function AllEventsPreview({ events, onEventPress, onViewAll }: AllEventsPreviewProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = getStyles(colors);
  const displayEvents = events.slice(0, 8);

  return (
    <View>
      <SectionHeader title={t('home.allEventsTitle')} subtitle={t('home.allEventsSubtitle')} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
        snapToInterval={RAIL_WIDTH + 14}
        decelerationRate="fast"
      >
        {displayEvents.map((event) => (
          <PosterEventCard
            key={event.id}
            event={event}
            width={RAIL_WIDTH}
            onPress={() => onEventPress(event.id)}
          />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll} activeOpacity={0.9}>
        <Text style={styles.viewAllText}>{t('home.viewAllEvents')}</Text>
        <ChevronRight size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    rail: {
      // Bleed past the parent section's 16px padding so cards reach the edges.
      marginHorizontal: -16,
    },
    railContent: {
      paddingHorizontal: 16,
      gap: 14,
    },
    viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: RADIUS.md,
      marginTop: 18,
      ...SHADOWS.floating,
    },
    viewAllText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
  });
