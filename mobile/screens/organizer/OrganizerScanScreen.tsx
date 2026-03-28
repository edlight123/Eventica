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

export default function OrganizerScanScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [isScanning, setIsScanning] = useState(false);
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('organizerScan.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('organizerScan.subtitle')}</Text>
      </View>

      {!isScanning ? (
        <View style={styles.content}>
          {/* Instructions */}
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
      ) : (
        <View style={styles.scannerContainer}>
          {/* Camera view will go here */}
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="camera-outline" size={80} color={colors.white} />
            <Text style={styles.cameraText}>Camera view will be displayed here</Text>
            <Text style={styles.cameraSubtext}>QR code scanner integration pending</Text>
          </View>

          {/* Scanner Overlay */}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstructions}>
              Position QR code within the frame
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.scannerControls}>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons name="flash-outline" size={28} color={colors.white} />
              <Text style={styles.controlLabel}>Torch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={() => setIsScanning(false)}
            >
              <Ionicons name="stop-circle-outline" size={28} color={colors.white} />
              <Text style={styles.controlLabel}>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Scans */}
          <View style={styles.recentScans}>
            <Text style={styles.recentTitle}>Recent Check-ins</Text>
            <View style={styles.scanResultCard}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={styles.scanResultInfo}>
                <Text style={styles.scanResultName}>John Doe</Text>
                <Text style={styles.scanResultDetails}>General Admission • Just now</Text>
              </View>
            </View>
          </View>
        </View>
      )}

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
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsCard: {
    backgroundColor: colors.primaryLight,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  scannerContainer: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraText: {
    fontSize: 18,
    color: colors.white,
    marginTop: 16,
    opacity: 0.8,
  },
  cameraSubtext: {
    fontSize: 14,
    color: colors.white,
    marginTop: 8,
    opacity: 0.6,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    fontSize: 16,
    color: colors.white,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scannerControls: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  controlButton: {
    alignItems: 'center',
  },
  stopButton: {
    opacity: 1,
  },
  controlLabel: {
    fontSize: 14,
    color: colors.white,
    marginTop: 8,
  },
  recentScans: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  scanResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  scanResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  scanResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  scanResultDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
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
    backgroundColor: colors.primaryLight,
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
