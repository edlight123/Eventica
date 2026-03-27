import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';

interface AddToCalendarButtonProps {
  event: {
    id: string;
    title: string;
    description?: string;
    start_datetime: Date | string;
    end_datetime?: Date | string;
    venue_name?: string;
    address?: string;
    city?: string;
  };
  style?: any;
}

export default function AddToCalendarButton({ event, style }: AddToCalendarButtonProps) {
  const { t } = useI18n();
  const [showModal, setShowModal] = React.useState(false);

  const startDate = new Date(event.start_datetime);
  const endDate = event.end_datetime ? new Date(event.end_datetime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const location = [event.venue_name, event.address, event.city].filter(Boolean).join(', ');

  const addToGoogleCalendar = () => {
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`,
      details: event.description || '',
      location: location,
      sf: 'true',
    });

    Linking.openURL(`${baseUrl}?${params.toString()}`);
    setShowModal(false);
  };

  const addToOutlookCalendar = () => {
    const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
    const params = new URLSearchParams({
      subject: event.title,
      startdt: startDate.toISOString(),
      enddt: endDate.toISOString(),
      body: event.description || '',
      location: location,
      path: '/calendar/action/compose',
      rru: 'addevent',
    });

    Linking.openURL(`${baseUrl}?${params.toString()}`);
    setShowModal(false);
  };

  const addToAppleCalendar = () => {
    // Generate ICS file URL from backend
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_WEB_URL || 'https://joineventica.com';
    const icsUrl = `${baseUrl}/api/events/${event.id}/calendar`;
    
    Linking.openURL(icsUrl);
    setShowModal(false);
  };

  const calendarOptions = [
    {
      key: 'google',
      label: t('calendar.google') || 'Google Calendar',
      icon: 'logo-google',
      color: '#4285F4',
      onPress: addToGoogleCalendar,
    },
    {
      key: 'outlook',
      label: t('calendar.outlook') || 'Outlook Calendar',
      icon: 'mail',
      color: '#0078D4',
      onPress: addToOutlookCalendar,
    },
    {
      key: 'apple',
      label: t('calendar.apple') || 'Apple Calendar',
      icon: 'logo-apple',
      color: '#000000',
      onPress: addToAppleCalendar,
    },
  ];

  return (
    <>
      <TouchableOpacity 
        style={[styles.button, style]} 
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        <Text style={styles.buttonText}>{t('calendar.addToCalendar') || 'Add to Calendar'}</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('calendar.addToCalendar') || 'Add to Calendar'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.eventPreview}>{event.title}</Text>
            <Text style={styles.datePreview}>
              {format(startDate, 'EEEE, MMMM dd, yyyy')} • {format(startDate, 'h:mm a')}
            </Text>

            <View style={styles.optionsContainer}>
              {calendarOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={styles.optionButton}
                  onPress={option.onPress}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '15' }]}>
                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  eventPreview: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  datePreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});
