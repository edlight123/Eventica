import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { getOrganizerEvents, OrganizerEvent } from '../../lib/api/organizer';
import { safeFormatForLanguage } from '../../lib/dates';
import { radius } from '../../theme/tokens';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import { useOverlayHeaderInset } from '../../components/OverlayHeader';
import { Wallet } from 'lucide-react-native';

/**
 * Org-level Earnings hub: earnings are computed and withdrawn per event
 * (OrganizerEventEarnings), so this screen is the missing front door — pick an
 * event, land on its earnings/withdraw page. Exists because the dashboard's
 * Earnings quick action used to dump testers on Analytics.
 */
export default function OrganizerEarningsHubScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t, language } = useI18n();
  const { height: headerH, onHeight } = useOverlayHeaderInset();

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!userProfile?.id) return;
        try {
          const rows = await getOrganizerEvents(userProfile.id, 100);
          if (!alive) return;
          // Most recent first — the event you're settling is almost always the
          // latest one.
          rows.sort(
            (a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
          );
          setEvents(rows);
        } catch (e) {
          console.error('Failed to load events for earnings hub', e);
        } finally {
          if (alive) setLoaded(true);
        }
      })();
      return () => {
        alive = false;
      };
    }, [userProfile?.id])
  );

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader
        title={t('organizerEarningsHub.title')}
        subtitle={t('organizerEarningsHub.subtitle')}
        onBack={() => navigation.goBack()}
        overlay
        onHeight={onHeight}
      />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: headerH }]}>
        {!loaded ? (
          [0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={85} radius={10} style={{ marginBottom: 18 }} />
          ))
        ) : events.length === 0 ? (
          <EmptyState icon={Wallet} title={t('organizerEarningsHub.empty')} compact />
        ) : (
          events.map((event) => {
            const posterUri = event.banner_image_url || event.cover_image_url;
            const when = event.start_datetime
              ? safeFormatForLanguage(event.start_datetime, 'EEE, MMM d, yyyy', language)
              : '';
            const sold = t('organizerEarningsHub.sold').replace(
              '{n}',
              String(event.tickets_sold || 0)
            );

            return (
              <TouchableOpacity
                key={event.id}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('OrganizerEventEarnings', { eventId: event.id })}
              >
                {posterUri ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={styles.poster}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                    recyclingKey={event.id}
                  />
                ) : (
                  <View style={[styles.poster, styles.posterFallback]}>
                    <Ionicons name="image-outline" size={16} color={colors.textTertiary} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[when, sold].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 40,
    },
    // Background-less rows (beta feedback: "remove the boxes background, and
    // make the posters bigger") — the poster carries the row, like My Events.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      gap: 14,
    },
    poster: {
      width: 64,
      height: 85,
      borderRadius: radius.chip,
      backgroundColor: colors.surfaceRaised,
    },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    rowMeta: {
      marginTop: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
