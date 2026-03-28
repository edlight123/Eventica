import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebase';
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

export default function StaffScanScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const uid = auth.currentUser?.uid || null;
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);

  const emptyText = useMemo(() => {
    if (!uid) return t('staffEvents.signIn');
    return t('staffEvents.noAssigned');
  }, [uid, t]);

  const loadEvents = useCallback(
    async (options?: { silent?: boolean; isCancelled?: () => boolean }) => {
      if (!uid) {
        setEvents([]);
        setSelectedEvent(null);
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
        setSelectedEvent((prev) => {
          if (prev && loaded.some((e) => e.id === prev.id)) return prev;
          return loaded.length > 0 ? loaded[0] : null;
        });
      } catch (e) {
        if (options?.isCancelled?.()) return;
        setEvents([]);
        setSelectedEvent(null);
      } finally {
        if (options?.isCancelled?.()) return;
        if (!silent) setLoading(false);
      }
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

  const handleStartScanning = () => {
    if (!selectedEvent) {
      Alert.alert(t('staffScan.noEventTitle'), t('staffScan.noEventBody'), [{ text: t('common.ok') }]);
      return;
    }

    (navigation as any).navigate('TicketScanner', { eventId: selectedEvent.id });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Camera section (visual anchor) */}
        <View
          style={[
            styles.cameraSection,
            {
              // Keep the banner compact while ensuring content is below the iOS notch.
              height: 120 + (Platform.OS === 'ios' ? Math.max(0, insets.top - 24) : 0),
              paddingTop: Platform.OS === 'ios' ? insets.top : 0,
            },
          ]}
        >
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraText}>{t('staffScan.readyTitle')}</Text>
            <Text style={styles.cameraSubtext}>{t('staffScan.readySubtitle')}</Text>
          </View>
        </View>

        {/* Header below camera */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('staffScan.title')}</Text>
          <Text style={styles.subtitle}>{t('staffScan.subtitle')}</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : events.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{emptyText}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.selectorLabel}>{t('staffScan.selectEvent')}</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setShowEventSelector(true)}>
              <View style={styles.selectorContent}>
                {selectedEvent ? (
                  <View style={styles.selectorTextCol}>
                    <Text style={styles.selectorTitle}>{selectedEvent.title}</Text>
                    <Text style={styles.selectorSubtitle}>
                      {selectedEvent.venue_name ? selectedEvent.venue_name : t('common.venue')}
                      {selectedEvent.city ? ` • ${selectedEvent.city}` : ''}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>{t('staffScan.selectEventPlaceholder')}</Text>
                )}
                <Ionicons name="chevron-down" size={22} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.startButton, !selectedEvent && styles.startButtonDisabled]}
              onPress={handleStartScanning}
              disabled={!selectedEvent}
            >
              <Ionicons name="camera-outline" size={22} color={colors.white} />
              <Text style={styles.startButtonText}>{t('staffScan.startScanning')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEventSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('staffScan.selectEvent')}</Text>
              <TouchableOpacity onPress={() => setShowEventSelector(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.eventItem, selectedEvent?.id === item.id && styles.eventItemSelected]}
                  onPress={() => {
                    setSelectedEvent(item);
                    setShowEventSelector(false);
                  }}
                >
                  <View style={styles.eventItemContent}>
                    <Text style={styles.eventItemTitle}>{item.title}</Text>
                    <Text style={styles.eventItemSubtitle}>
                      {item.venue_name ? item.venue_name : t('common.venue')}
                      {item.city ? ` • ${item.city}` : ''}
                    </Text>
                  </View>
                  {selectedEvent?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
    fontSize: 22,
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
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  selectorLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  selectorSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectorPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  startButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  eventItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventItemSelected: {
    backgroundColor: colors.background,
  },
  eventItemContent: {
    flex: 1,
    paddingRight: 12,
  },
  eventItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  eventItemSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
