import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collectionGroup, getDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { getStaffEventIds } from '../../lib/staffAssignments';

type StaffMemberDoc = {
  uid?: string;
  eventId?: string;
  role?: string;
  permissions?: { checkin?: boolean; viewAttendees?: boolean };
};

type EventSummary = {
  id: string;
  title: string;
  start_datetime?: any;
  venue_name?: string;
  city?: string;
};

export default function StaffEventsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const uid = auth.currentUser?.uid || null;

  // Keep the banner compact while ensuring content is below the iOS notch.
  const bannerBaseHeight = 120;
  const bannerPaddingTop = Platform.OS === 'ios' ? insets.top : 0;
  const bannerExtraHeight = Platform.OS === 'ios' ? Math.max(0, insets.top - 24) : 0;
  const bannerHeight = bannerBaseHeight + bannerExtraHeight;

  const emptyText = useMemo(() => {
    if (!uid) return t('staffEvents.signIn');
    return t('staffEvents.noAssigned');
  }, [uid, t]);

  const loadEvents = useCallback(
    async (options?: { silent?: boolean; isCancelled?: () => boolean }) => {
      if (!uid) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const silent = Boolean(options?.silent);
      if (!silent) setLoading(true);

      try {
        const eventIds: string[] = [];

        // Primary path: discover assignments from members collectionGroup.
        try {
          const memberQuery = query(collectionGroup(db, 'members'), where('__name__', '==', uid));
          const memberSnap = await getDocs(memberQuery);
          memberSnap.forEach((d) => {
            const data = d.data() as StaffMemberDoc;
            const derivedEventId = String(data?.eventId || d.ref.parent?.parent?.id || '');
            if (derivedEventId) eventIds.push(derivedEventId);
          });
        } catch {
          // If a collectionGroup query fails (rules/data edge cases), fall back below.
        }

        // Fallback: include locally persisted eventIds (added on successful invite redeem).
        const persisted = await getStaffEventIds();
        for (const id of persisted) eventIds.push(id);

        const uniqueEventIds = Array.from(new Set(eventIds)).filter(Boolean);

        // Verify access per event by reading the direct member doc.
        const allowedEventIds: string[] = [];
        for (const eventId of uniqueEventIds) {
          const memberSnap = await getDoc(doc(db, 'events', eventId, 'members', uid));
          const member = memberSnap.exists() ? (memberSnap.data() as StaffMemberDoc) : null;
          if (!memberSnap.exists()) continue;

          const checkinFlag = member?.permissions?.checkin;
          // Back-compat: missing permissions should not hide assigned events.
          if (checkinFlag === false) continue;

          allowedEventIds.push(eventId);
        }

        const loaded: EventSummary[] = [];

        for (const eventId of allowedEventIds) {
          const eventSnap = await getDoc(doc(db, 'events', eventId));
          if (!eventSnap.exists()) continue;
          const data = eventSnap.data() as any;
          loaded.push({
            id: eventSnap.id,
            title: data?.title || t('common.event'),
            start_datetime: data?.start_datetime,
            venue_name: data?.venue_name || '',
            city: data?.city || '',
          });
        }

        if (options?.isCancelled?.()) return;
        setEvents(loaded);
      } catch (e) {
        if (options?.isCancelled?.()) return;
        setEvents([]);
      } finally {
        if (options?.isCancelled?.()) return;
        if (!silent) setLoading(false);
      }

      return;
    },
    [uid, t]
  );

  useEffect(() => {
    let cancelled = false;

    loadEvents({ isCancelled: () => cancelled });

    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  // Ensure we refresh after redeeming an invite or returning to this tab.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadEvents({ silent: true, isCancelled: () => cancelled });
      return () => {
        cancelled = true;
      };
    }, [loadEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEvents({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadEvents]);

  return (
    <View style={styles.container}>
      {/* Camera section (visual) */}
      <View style={[styles.cameraSection, { height: bannerHeight, paddingTop: bannerPaddingTop }]}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>{t('staffEvents.staffModeTitle')}</Text>
          <Text style={styles.cameraSubtext}>{t('staffEvents.staffModeSubtitle')}</Text>
        </View>
      </View>

      {/* Header below camera section */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('staffEvents.assignedTitle')}</Text>
        <Text style={styles.subtitle}>{t('staffEvents.assignedSubtitle')}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={[styles.list, events.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.center}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.empty}>{emptyText}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => (navigation as any).navigate('TicketScanner', { eventId: item.id })}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {item.venue_name ? item.venue_name : t('common.venue')}
              {item.city ? ` • ${item.city}` : ''}
            </Text>
            <Text style={styles.cardAction}>{t('staffEvents.openScanner')}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraSection: {
    backgroundColor: colors.primary,
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cameraText: {
    marginTop: 0,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  cameraSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: colors.white,
    opacity: 0.95,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  empty: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardAction: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
