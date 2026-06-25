import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { getOrganizerEvents, OrganizerEvent, getTodayEvents, TodayEvent } from '../../lib/api/organizer';
import { RADIUS } from '../../config/brand';

export default function OrganizerScanScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TodayEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEventSelector, setShowEventSelector] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [userProfile?.id]);

  const loadEvents = async () => {
    if (!userProfile?.id) return;

    try {
      const events = await getTodayEvents(userProfile.id);
      setTodayEvents(events);
      
      // Auto-select first event
      if (events.length > 0) {
        setSelectedEvent(events[0]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScanning = () => {
    if (!selectedEvent) {
      Alert.alert(
        t('organizerScan.noEventTitle'),
        t('organizerScan.noEventBody'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    navigation.navigate('TicketScanner', { eventId: selectedEvent.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerScan.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('organizerScan.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('organizerScan.subtitle')}</Text>
      </View>

      <View style={styles.content}>
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle-outline" size={48} color={colors.primary} />
            <Text style={styles.instructionsTitle}>{t('organizerScan.howTitle')}</Text>
            <Text style={styles.instructionsText}>
              1. {t('organizerScan.howStep1')}{'\n'}
              2. {t('organizerScan.howStep2')}{'\n'}
              3. {t('organizerScan.howStep3')}{'\n'}
              4. {t('organizerScan.howStep4')}
            </Text>
          </View>

          {/* Event Selector */}
          <View style={styles.eventSelector}>
            <Text style={styles.selectorLabel}>{t('organizerScan.selectEvent')}</Text>
            {todayEvents.length === 0 ? (
              <View style={styles.noEventsCard}>
                <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.noEventsText}>{t('organizerScan.noEventsToday')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setShowEventSelector(true)}
              >
                <View style={styles.selectorContent}>
                  {selectedEvent ? (
                    <View>
                      <Text style={styles.selectorTitle}>{selectedEvent.title}</Text>
                      <Text style={styles.selectorSubtitle}>
                        {new Date(selectedEvent.start_datetime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })} • {selectedEvent.location}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>{t('organizerScan.selectEventPlaceholder')}</Text>
                  )}
                  <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          {selectedEvent && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{selectedEvent.ticketsSold}</Text>
                <Text style={styles.statLabel}>{t('organizerScan.totalTickets')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{selectedEvent.ticketsCheckedIn}</Text>
                <Text style={styles.statLabel}>{t('organizerScan.checkedIn')}</Text>
              </View>
            </View>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, !selectedEvent && styles.startButtonDisabled]}
            onPress={handleStartScanning}
            disabled={!selectedEvent}
          >
            <Ionicons name="qr-code-outline" size={32} color={colors.white} />
            <Text style={styles.startButtonText}>{t('organizerScan.startScanning')}</Text>
          </TouchableOpacity>
        </View>

      {/* Event Selector Modal */}
      <Modal
        visible={showEventSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('organizerScan.selectEvent')}</Text>
              <TouchableOpacity onPress={() => setShowEventSelector(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={todayEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.eventItem,
                    selectedEvent?.id === item.id && styles.eventItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedEvent(item);
                    setShowEventSelector(false);
                  }}
                >
                  <View style={styles.eventItemContent}>
                    <Text style={styles.eventItemTitle}>{item.title}</Text>
                    <Text style={styles.eventItemSubtitle}>
                      {new Date(item.start_datetime).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })} • {item.location}
                    </Text>
                    <Text style={styles.eventItemStats}>
                      {item.ticketsSold} tickets sold • {item.ticketsCheckedIn} checked in
                    </Text>
                  </View>
                  {selectedEvent?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
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

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: 0,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  eventSelector: {
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectorButton: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  noEventsCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  noEventsText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonDisabled: {
    backgroundColor: colors.textSecondary,
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  eventItemContent: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  eventItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  eventItemStats: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
