import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getEventById,
  getEventTicketBreakdown,
  OrganizerEvent,
} from '../../lib/api/organizer';
import {
  toggleEventPublication,
  cancelEvent,
} from '../../lib/api/events';
import { useI18n } from '../../contexts/I18nContext';

type RouteParams = {
  OrganizerEventManagement: {
    eventId: string;
  };
};

export default function OrganizerEventManagementScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<RouteProp<RouteParams, 'OrganizerEventManagement'>>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();

  const { t, language } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';

  const [event, setEvent] = useState<OrganizerEvent | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [ticketData, setTicketData] = useState<{
    ticketsSold: number;
    ticketsCheckedIn: number;
    capacity: number;
    ticketTypes: Array<{ name: string; sold: number; capacity: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEventData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Reload event data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadEventData();
    }, [eventId])
  );

  const loadEventData = async () => {
    try {
      const [eventData, breakdown] = await Promise.all([
        getEventById(eventId),
        getEventTicketBreakdown(eventId),
      ]);

      if (eventData) {
        setEvent(eventData);
        setTicketData(breakdown);
        setIsPaused(!eventData.is_published);
      }
    } catch (error) {
      console.error('Error loading event management data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanTickets = () => {
    navigation.navigate('TicketScanner', { eventId });
  };

  const handleViewAttendees = () => {
    navigation.navigate('EventAttendees', { eventId });
  };

  const handleViewEarnings = () => {
    navigation.navigate('OrganizerEventEarnings', { eventId });
  };

  const handleEditEvent = () => {
    navigation.navigate('EditEvent', { eventId });
  };

  const handleViewPublicPage = () => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleManageStaff = async () => {
    try {
      navigation.navigate('OrganizerEventStaff', { eventId });
    } catch {
      Alert.alert(t('common.error'), t('organizerEventManagement.errors.openStaffFailed'));
    }
  };

  const handleToggleSales = async () => {
    const action = isPaused ? 'resume' : 'pause';
    Alert.alert(
      action === 'pause'
        ? t('organizerEventManagement.toggleSales.pauseTitle')
        : t('organizerEventManagement.toggleSales.resumeTitle'),
      action === 'pause'
        ? t('organizerEventManagement.toggleSales.pauseBody')
        : t('organizerEventManagement.toggleSales.resumeBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: action === 'pause' ? t('organizerEventManagement.toggleSales.pauseCta') : t('organizerEventManagement.toggleSales.resumeCta'),
          style: action === 'pause' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              // isPaused is the inverse of is_published
              // If isPaused=true, we want to set is_published=true (resume)
              // If isPaused=false, we want to set is_published=false (pause)
              const newPublishedState = isPaused; // Resume if paused, pause if not paused
              await toggleEventPublication(eventId, newPublishedState);
              // Reload event data to get the updated status from database
              await loadEventData();
              Alert.alert(
                t('common.success'),
                action === 'pause'
                  ? t('organizerEventManagement.toggleSales.pausedSuccess')
                  : t('organizerEventManagement.toggleSales.resumedSuccess')
              );
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error.message || (action === 'pause'
                  ? t('organizerEventManagement.toggleSales.pauseFailed')
                  : t('organizerEventManagement.toggleSales.resumeFailed'))
              );
            }
          },
        },
      ]
    );
  };

  const handleSendUpdate = () => {
    navigation.navigate('SendEventUpdate', { eventId, eventTitle: event?.title });
  };

  const handleCancelEvent = async () => {
    Alert.alert(
      t('organizerEventManagement.cancelEvent.title'),
      t('organizerEventManagement.cancelEvent.body'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('organizerEventManagement.cancelEvent.confirmCta'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelEvent(eventId);
              Alert.alert(
                t('organizerEventManagement.cancelEvent.successTitle'),
                t('organizerEventManagement.cancelEvent.successBody'),
                [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
              );
            } catch (error: any) {
              Alert.alert(t('common.error'), error.message || t('organizerEventManagement.cancelEvent.failed'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerEventManagement.loading')}</Text>
      </View>
    );
  }

  if (!event || !ticketData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={styles.errorText}>{t('organizerEventManagement.notFound')}</Text>
      </View>
    );
  }

  const eventDate = new Date(event.start_datetime);
  const formattedDate = eventDate.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header with background image */}
      <View style={styles.header}>
        {event.cover_image_url && (
          <Image 
            source={{ uri: event.cover_image_url }} 
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.overlay} />
        <View style={[styles.headerContent, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{event.title}</Text>
          <View style={styles.headerInfo}>
            <Ionicons name="calendar-outline" size={16} color={colors.white} />
            <Text style={styles.headerInfoText}>
              {formattedDate} • {formattedTime}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Ionicons name="location-outline" size={16} color={colors.white} />
            <Text style={styles.headerInfoText}>{event.location}</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerEventManagement.sections.quickActions')}</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={handleScanTickets}>
            <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.scanTickets')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleManageStaff}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.staff')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewAttendees}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.viewAttendees')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewEarnings}>
            <Ionicons name="cash-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.earnings')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleEditEvent}>
            <Ionicons name="create-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.editEvent')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={handleViewPublicPage}>
            <Ionicons name="eye-outline" size={32} color={colors.primary} />
            <Text style={styles.actionText}>{t('organizerEventManagement.actions.viewPublicPage')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerEventManagement.sections.performance')}</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>{t('organizerEventManagement.performance.ticketSales')}</Text>
            <Text style={styles.performanceValue}>
              {ticketData.ticketsSold} / {ticketData.capacity}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ticketData.capacity > 0
                      ? (ticketData.ticketsSold / ticketData.capacity) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {ticketData.capacity > 0
              ? ((ticketData.ticketsSold / ticketData.capacity) * 100).toFixed(1)
              : 0}
            % {t('common.sold')}
          </Text>
        </View>

        {/* Ticket Type Breakdown */}
        {ticketData.ticketTypes.length > 0 && (
          <View style={styles.ticketBreakdown}>
            <Text style={styles.breakdownTitle}>{t('organizerEventManagement.performance.byTicketType')}</Text>
            {ticketData.ticketTypes.map((ticketType, index) => (
              <View key={index} style={styles.ticketTypeRow}>
                <View style={styles.ticketTypeInfo}>
                  <Text style={styles.ticketTypeName}>{ticketType.name}</Text>
                  <Text style={styles.ticketTypeStats}>
                    {ticketType.sold} / {ticketType.capacity}
                  </Text>
                </View>
                <View style={styles.miniProgressBar}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${
                          ticketType.capacity > 0
                            ? (ticketType.sold / ticketType.capacity) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Event Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('organizerEventManagement.sections.eventControls')}</Text>
        <TouchableOpacity style={styles.controlButton} onPress={handleToggleSales}>
          <Ionicons 
            name={isPaused ? "play-circle-outline" : "pause-circle-outline"} 
            size={24} 
            color={isPaused ? colors.success : colors.warning} 
          />
          <Text style={styles.controlButtonText}>
            {isPaused
              ? t('organizerEventManagement.controls.resumeTicketSales')
              : t('organizerEventManagement.controls.pauseTicketSales')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleSendUpdate}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          <Text style={styles.controlButtonText}>{t('organizerEventManagement.controls.sendUpdate')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        {event?.status !== 'cancelled' && (
          <TouchableOpacity style={[styles.controlButton, styles.dangerButton]} onPress={handleCancelEvent}>
            <Ionicons name="close-circle-outline" size={24} color={colors.error} />
            <Text style={[styles.controlButtonText, styles.dangerText]}>{t('organizerEventManagement.controls.cancelEvent')}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  errorText: {
    marginTop: 12,
    fontSize: 18,
    color: colors.error,
    fontWeight: '600',
  },
  header: {
    height: 224,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 16,
    position: 'relative',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerInfoText: {
    fontSize: 14,
    color: colors.white,
    marginLeft: 6,
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  ticketBreakdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  ticketTypeRow: {
    marginBottom: 12,
  },
  ticketTypeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketTypeName: {
    fontSize: 14,
    color: colors.text,
  },
  ticketTypeStats: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerText: {
    color: colors.error,
  },
});
