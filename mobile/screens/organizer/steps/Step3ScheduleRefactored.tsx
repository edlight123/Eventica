/**
 * Step3ScheduleRefactored - Robust date/time picker implementation
 * 
 * Why this works:
 * 1. Modal has explicit backgroundColor (not transparent) - prevents tap-through
 * 2. Picker container has FIXED height (240px) - picker needs known bounds
 * 3. SafeAreaView ensures picker isn't cut off by notch/home indicator
 * 4. Only ONE picker modal open at a time - closeAll before opening new one
 * 5. iOS: Modal + spinner picker; Android: native dialog (auto-dismisses)
 * 6. Parent owns all state - this component is stateless except for picker visibility
 * 7. Validation happens in real-time, shows inline errors
 * 
 * Critical: The picker MUST have a container with fixed height. Without it,
 * the picker renders with 0 height and is invisible/unresponsive.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../contexts/I18nContext';
import type { EventDraft } from '../CreateEventFlowRefactored';

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step3ScheduleRefactored({ draft, updateDraft }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t } = useI18n();

  // Picker visibility state
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  // Validation state
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Close all pickers - prevents conflicts
  const closeAllPickers = () => {
    setShowStartDate(false);
    setShowStartTime(false);
    setShowEndDate(false);
    setShowEndTime(false);
  };

  // Validate whenever dates/times change
  useEffect(() => {
    validateSchedule();
  }, [draft.start_date, draft.start_time, draft.end_date, draft.end_time]);

  // Auto-update end time when start time changes
  useEffect(() => {
    if (draft.start_date && draft.start_time) {
      const oneHourLater = addOneHour(draft.start_time);
      
      // Always update end time to be 1 hour after start time
      // If end date is not set or is before start date, set it to start date
      const shouldUpdateEndDate = !draft.end_date || draft.end_date < draft.start_date;
      
      updateDraft({
        end_date: shouldUpdateEndDate ? draft.start_date : draft.end_date,
        end_time: oneHourLater,
      });
    }
  }, [draft.start_date, draft.start_time]);

  // Validation logic
  const validateSchedule = (): boolean => {
    if (!draft.start_date || !draft.start_time || !draft.end_date || !draft.end_time) {
      setErrorKey(null); // Don't show error until all fields filled
      return false;
    }

    const start = combineDateAndTime(draft.start_date, draft.start_time);
    const end = combineDateAndTime(draft.end_date, draft.end_time);
    const now = new Date();

    // Check if start date is in the past
    if (start < now) {
      setErrorKey('organizerCreateEvent.schedule.errors.startInPast');
      return false;
    }

    if (end <= start) {
      setErrorKey('organizerCreateEvent.schedule.errors.endAfterStart');
      return false;
    }

    setErrorKey(null);
    return true;
  };

  // Utility: Add 1 hour to time string
  const addOneHour = (timeStr: string): string => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;

    let hours = parseInt(match[1]);
    const minutes = match[2];
    let period = match[3].toUpperCase();

    hours += 1;
    
    // Handle hour wraparound
    if (hours > 12) {
      hours = 1;
      period = period === 'AM' ? 'PM' : 'AM';
    } else if (hours === 12) {
      // 11:XX AM + 1 hour = 12:XX PM
      // 11:XX PM + 1 hour = 12:XX AM (next day)
      period = period === 'AM' ? 'PM' : 'AM';
    }

    return `${hours}:${minutes} ${period}`;
  };

  // Utility: Combine date and time strings into Date object
  const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return new Date(dateStr);

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const date = new Date(dateStr + 'T00:00:00');
    date.setHours(hours, minutes);
    return date;
  };

  // Convert date string to Date object
  const getDateValue = (dateStr: string): Date => {
    return dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  };

  // Convert time string to Date object
  const getTimeValue = (timeStr: string): Date => {
    if (!timeStr) return new Date();
    
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return new Date();

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes);
    return date;
  };

  // Date picker handlers
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartDate(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      updateDraft({ start_date: formatted });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndDate(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      updateDraft({ end_date: formatted });
    }
  };

  // Render date picker modal (iOS only)
  const renderDatePickerModal = (
    visible: boolean,
    title: string,
    value: Date,
    onChange: (event: any, date?: Date) => void,
    onClose: () => void,
    minimumDate?: Date
  ) => {
    if (Platform.OS === 'android') return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.modalButton}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.modalButton, styles.modalButtonDone]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              {/* CRITICAL: Fixed height container for picker */}
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={value}
                  mode="date"
                  display="spinner"
                  onChange={onChange}
                  textColor={colors.text}
                  minimumDate={minimumDate}
                />
              </View>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Time picker handlers
  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowStartTime(false);
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      updateDraft({ start_time: `${displayHours}:${minutes} ${ampm}` });
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowEndTime(false);
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      updateDraft({ end_time: `${displayHours}:${minutes} ${ampm}` });
    }
  };

  // Render picker modal (iOS only - Android uses native dialog)
  const renderTimePickerModal = (
    visible: boolean,
    title: string,
    value: Date,
    onChange: (event: any, date?: Date) => void,
    onClose: () => void
  ) => {
    if (Platform.OS === 'android') return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        {/* 
          Critical: backgroundColor must be semi-transparent + SafeArea to prevent tap-through 
          The picker container MUST have fixed height (240px) or picker won't render
        */}
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={onClose}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.modalButton}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={[styles.modalButton, styles.modalButtonDone]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              {/* CRITICAL: Fixed height container for picker - without this, picker has 0 height and is invisible */}
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={value}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  onChange={onChange}
                  textColor={colors.text}
                />
              </View>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('organizerCreateEvent.schedule.title')}</Text>
      <Text style={styles.subtitle}>{t('organizerCreateEvent.schedule.subtitle')}</Text>

      {/* Start Date & Time */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('organizerCreateEvent.schedule.startDate')} *</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              closeAllPickers();
              setShowStartDate(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {draft.start_date || t('organizerCreateEvent.schedule.selectDate')}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showStartDate && (
            <DateTimePicker
              value={getDateValue(draft.start_date)}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          )}
        </View>

        <View style={styles.half}>
          <Text style={styles.label}>{t('organizerCreateEvent.schedule.startTime')} *</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              closeAllPickers();
              setShowStartTime(true);
            }}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {draft.start_time || t('organizerCreateEvent.schedule.selectTime')}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showStartTime && (
            <DateTimePicker
              value={getTimeValue(draft.start_time)}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleStartTimeChange}
            />
          )}
        </View>
      </View>

      {/* End Date & Time */}
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>{t('organizerCreateEvent.schedule.endDate')} *</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              closeAllPickers();
              setShowEndDate(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {draft.end_date || t('organizerCreateEvent.schedule.selectDate')}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showEndDate && (
            <DateTimePicker
              value={getDateValue(draft.end_date)}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
              minimumDate={draft.start_date ? new Date(draft.start_date) : undefined}
            />
          )}
        </View>

        <View style={styles.half}>
          <Text style={styles.label}>{t('organizerCreateEvent.schedule.endTime')} *</Text>
          <TouchableOpacity
            style={styles.inputButton}
            onPress={() => {
              closeAllPickers();
              setShowEndTime(true);
            }}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {draft.end_time || t('organizerCreateEvent.schedule.selectTime')}
            </Text>
          </TouchableOpacity>
          {Platform.OS === 'android' && showEndTime && (
            <DateTimePicker
              value={getTimeValue(draft.end_time)}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleEndTimeChange}
            />
          )}
        </View>
      </View>

      {/* Error message */}
      {errorKey && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={styles.errorText}>{t(errorKey)}</Text>
        </View>
      )}

      {/* Timezone info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          {t('organizerCreateEvent.schedule.timezone')}: {draft.timezone}
        </Text>
      </View>

      {/* iOS Date Picker Modals */}
      {renderDatePickerModal(
        showStartDate,
        t('organizerCreateEvent.schedule.modalStartDate'),
        getDateValue(draft.start_date),
        handleStartDateChange,
        () => setShowStartDate(false),
        undefined
      )}
      {renderDatePickerModal(
        showEndDate,
        t('organizerCreateEvent.schedule.modalEndDate'),
        getDateValue(draft.end_date),
        handleEndDateChange,
        () => setShowEndDate(false),
        draft.start_date ? new Date(draft.start_date) : undefined
      )}

      {/* iOS Time Picker Modals */}
      {renderTimePickerModal(
        showStartTime,
        t('organizerCreateEvent.schedule.modalStartTime'),
        getTimeValue(draft.start_time),
        handleStartTimeChange,
        () => setShowStartTime(false)
      )}
      {renderTimePickerModal(
        showEndTime,
        t('organizerCreateEvent.schedule.modalEndTime'),
        getTimeValue(draft.end_time),
        handleEndTimeChange,
        () => setShowEndTime(false)
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.error + '10',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  
  // iOS Modal styles - CRITICAL for picker to work
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent prevents tap-through
    justifyContent: 'flex-end',
  },
  modalSafeArea: {
    // SafeArea ensures content isn't cut off by notch/home indicator
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // No flex here - we want fixed height for picker container
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  modalButton: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  modalButtonDone: {
    color: colors.primary,
    fontWeight: '600',
  },
  // CRITICAL: Fixed height for picker - without this, picker has 0 height and is invisible/unresponsive
  pickerContainer: {
    height: 240, // Fixed height ensures picker renders properly
    backgroundColor: colors.white,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
});
