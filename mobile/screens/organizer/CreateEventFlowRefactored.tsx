/**
 * CreateEventFlow — POSH flyer-first single-canvas create/edit flow.
 *
 * Architecture:
 * - Single source of truth: eventDraft state.
 * - Create mode opens a two-tile entry chooser (Sell tickets vs free RSVP),
 *   then drops into ONE scrolling canvas. Edit mode goes straight to the canvas.
 * - No numbered stepper: the flyer hero + borderless inline fields ARE the form
 *   and the preview at once (POSH IMG_1843/1847/1848/1849).
 * - Inline per-field validation (red placeholder + red divider). A confirmation
 *   sheet gates publishing in create mode, with a save-as-draft escape hatch.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { createEvent, updateEvent, SaveEventOptions } from '../../lib/api/events';
import { getEventById } from '../../lib/api/organizer';
import { RADIUS } from '../../config/brand';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../../types/filters';
import {
  HAITI_DEPARTMENTS,
  citiesForDepartment,
  communesForCity,
  departmentForCity,
} from '../../data/haitiGeo';
import WhitePillCTA from '../../components/WhitePillCTA';
import { font } from '../../theme/tokens';

type RouteParams = {
  CreateEvent: undefined;
  EditEvent: { eventId: string };
};

// Per-field inline validation errors, keyed by field name.
export type FieldErrors = Record<string, string>;

// Event draft shape - single source of truth
export interface EventDraft {
  // Basics
  title: string;
  description: string;
  category: string;
  banner_image_url: string;

  // Location
  venue_name: string;
  country?: string;
  department: string;   // Haiti département (cascade parent of city)
  city: string;
  commune: string;
  address: string;

  // Schedule - local times
  start_date: string;      // YYYY-MM-DD
  start_time: string;      // HH:MM AM/PM
  end_date: string;        // YYYY-MM-DD
  end_time: string;        // HH:MM AM/PM
  timezone: string;        // America/Port-au-Prince

  // Tickets
  ticket_tiers: Array<{
    name: string;
    price: string;
    quantity: string;
  }>;
  currency: string;

  // Free RSVP path — no paid tiers, a single attendance cap instead.
  is_rsvp: boolean;
  capacity: string;
}

const CATEGORIES = [
  'Music', 'Sports', 'Arts', 'Business', 'Food & Drink',
  'Community', 'Education', 'Tech', 'Health', 'Other',
];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Music: 'organizerCreateEvent.categories.music',
  Sports: 'organizerCreateEvent.categories.sports',
  Arts: 'organizerCreateEvent.categories.arts',
  Business: 'organizerCreateEvent.categories.business',
  'Food & Drink': 'organizerCreateEvent.categories.foodDrink',
  Community: 'organizerCreateEvent.categories.community',
  Education: 'organizerCreateEvent.categories.education',
  Tech: 'organizerCreateEvent.categories.tech',
  Health: 'organizerCreateEvent.categories.health',
  Other: 'organizerCreateEvent.categories.other',
};

// ── Borderless inline field (POSH IMG_1848/1849) ──────────────────────────
// Module-level so it doesn't remount every keystroke (which would drop focus).
// Transparent, no box: the label doubles as the placeholder, a hairline divider
// sits below. On error the placeholder + divider tint red (POSH required look).
type Colors = ReturnType<typeof useTheme>['colors'];

function InlineTextRow({
  colors,
  placeholder,
  value,
  onChangeText,
  error,
  multiline,
  keyboardType,
  maxLength,
  onFocus,
}: {
  colors: Colors;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  onFocus?: () => void;
}) {
  return (
    <View style={[inline.row, { borderBottomColor: error ? colors.error : colors.border }]}>
      <TextInput
        style={[
          multiline ? inline.multiline : inline.input,
          { color: colors.text },
        ]}
        placeholder={placeholder}
        placeholderTextColor={error ? colors.error : colors.textSecondary}
        selectionColor={colors.primary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        multiline={!!multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// A borderless inline row that opens the date + time pickers. Left cell = date,
// right cell = time, so both halves of Start/End are reachable in one row.
function InlineDateTimeRow({
  colors,
  label,
  dateText,
  timeText,
  timePlaceholder,
  onPressDate,
  onPressTime,
  error,
}: {
  colors: Colors;
  label: string;
  dateText: string;
  timeText: string;
  timePlaceholder: string;
  onPressDate: () => void;
  onPressTime: () => void;
  error?: boolean;
}) {
  const hasDate = !!dateText;
  return (
    <View style={[inline.row, inline.rowInner, { borderBottomColor: error ? colors.error : colors.border }]}>
      <TouchableOpacity style={inline.flex} onPress={onPressDate} activeOpacity={0.7}>
        <Text style={[inline.rowText, { color: hasDate ? colors.text : error ? colors.error : colors.textSecondary }]}>
          {hasDate ? dateText : label}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPressTime} activeOpacity={0.7} style={inline.timeCell}>
        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
        <Text style={[inline.timeText, { color: timeText ? colors.text : colors.textSecondary }]}>
          {timeText || timePlaceholder}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const inline = StyleSheet.create({
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: { flex: 1 },
  input: {
    fontSize: 17,
    padding: 0,
  },
  multiline: {
    fontSize: 16,
    minHeight: 96,
    padding: 0,
  },
  rowText: {
    fontSize: 17,
  },
  timeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
  },
  timeText: {
    fontSize: 15,
  },
});

export default function CreateEventFlowRefactored() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditEvent'>>();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  // Haiti commune search dropdown visibility.
  const [communeListOpen, setCommuneListOpen] = useState(false);

  // Date/time picker visibility (ported from Step3ScheduleRefactored).
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [scheduleErrorKey, setScheduleErrorKey] = useState<string | null>(null);

  const eventId = route.params?.eventId;
  const isEditMode = !!eventId;

  // In create mode the two-choice entry chooser is shown first; edit mode
  // jumps straight into the canvas (mode derived from the loaded event).
  const [entryChosen, setEntryChosen] = useState(isEditMode);

  // Single source of truth for all form data
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: '',
    description: '',
    category: 'Music',
    banner_image_url: '',
    venue_name: '',
    country: 'HT',
    department: 'Ouest',
    city: 'Port-au-Prince',
    commune: '',
    address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    timezone: 'America/Port-au-Prince',
    ticket_tiers: [{ name: 'General Admission', price: '0', quantity: '100' }],
    currency: 'HTG',
    is_rsvp: false,
    capacity: '100',
  });

  // Track keyboard visibility
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadEventData = async () => {
    setLoadingEvent(true);
    try {
      const event = await getEventById(eventId!);
      if (event) {
        // Convert event data to draft format
        const startDate = new Date(event.start_datetime);
        const endDate = new Date(event.end_datetime);

        const formatTime = (date: Date) => {
          const hours = date.getHours();
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${displayHours}:${minutes} ${ampm}`;
        };

        // Convert ticket_tiers from database format (numbers) to form format (strings)
        const formattedTicketTiers = event.ticket_tiers && Array.isArray(event.ticket_tiers) && event.ticket_tiers.length > 0
          ? event.ticket_tiers.map((tier: any) => ({
              name: tier.name || 'General Admission',
              price: String(tier.price ?? 0),
              quantity: String(tier.quantity ?? tier.available ?? 100),
            }))
          : [{ name: 'General Admission', price: '0', quantity: '100' }];

        const isRsvp = Boolean((event as any).is_rsvp);

        // Department: prefer the stored value; otherwise derive from the stored
        // city (arrondissement main-city) via the Haiti geo dataset.
        const storedCity = event.city || '';
        const resolvedDepartment =
          (event as any).department || departmentForCity(storedCity) || '';

        setEventDraft({
          title: event.title || '',
          description: event.description || '',
          category: event.category || '',
          banner_image_url: event.cover_image_url || '',
          venue_name: event.venue_name || '',
          country: (event as any).country || 'HT',
          department: resolvedDepartment,
          city: storedCity,
          commune: event.commune || '',
          address: event.address || '',
          start_date: startDate.toISOString().split('T')[0],
          start_time: formatTime(startDate),
          end_date: endDate.toISOString().split('T')[0],
          end_time: formatTime(endDate),
          timezone: 'America/Port-au-Prince',
          ticket_tiers: formattedTicketTiers,
          currency: event.currency || 'USD',
          is_rsvp: isRsvp,
          capacity: String((event as any).total_tickets ?? formattedTicketTiers[0]?.quantity ?? '100'),
        });
      }
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert(t('common.error'), t('organizerCreateEventFlow.loadError'));
      navigation.goBack();
    } finally {
      setLoadingEvent(false);
    }
  };

  // Load event data if in edit mode
  useEffect(() => {
    if (isEditMode && eventId) {
      loadEventData();
    }
  }, [isEditMode, eventId]);

  // Generic update function - any field can be updated
  const updateDraft = (updates: Partial<EventDraft>) => {
    setEventDraft(prev => ({ ...prev, ...updates }));
  };

  // Choose the entry mode (sell tickets vs free RSVP) and enter the canvas.
  const chooseMode = (rsvp: boolean) => {
    updateDraft({ is_rsvp: rsvp });
    setEntryChosen(true);
  };

  const getCategoryLabel = (categoryId: string) => {
    const key = CATEGORY_LABEL_KEYS[categoryId] || CATEGORY_LABEL_KEYS.Other;
    return t(key);
  };

  // Flyer pick (ported from Step1Basics — aspect [2,3]).
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateDraft({ banner_image_url: result.assets[0].uri });
    }
  };

  // ── Location (ported from Step2Location) ──
  const selectedCountry = (eventDraft as any).country || 'HT';
  const isHaiti = selectedCountry === 'HT';
  // Non-Haiti countries keep the flat city list.
  const cities = CITIES_BY_COUNTRY[selectedCountry] || [];
  // Haiti gets a Département → City (arrondissement) → Commune cascade.
  const department = eventDraft.department || 'Ouest';
  const haitiCities = citiesForDepartment(department);

  const handleCountryChange = (countryCode: string) => {
    if (countryCode === 'HT') {
      const dep = 'Ouest';
      const first = citiesForDepartment(dep)[0]?.name || '';
      updateDraft({ country: 'HT', department: dep, city: first, commune: '' });
    } else {
      const newCities = CITIES_BY_COUNTRY[countryCode] || [];
      updateDraft({ country: countryCode, department: '', city: newCities[0] || '', commune: '' });
    }
    setCommuneListOpen(false);
  };

  // On département select: reset city to the department's first arrondissement.
  const handleDepartmentChange = (dep: string) => {
    const first = citiesForDepartment(dep)[0]?.name || '';
    updateDraft({ department: dep, city: first, commune: '' });
    setCommuneListOpen(false);
  };

  // Accent/case-insensitive commune matching for the searchable dropdown.
  const normalizeText = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const communeSuggestions = (() => {
    if (!isHaiti) return [];
    const all = communesForCity(department, eventDraft.city);
    const q = normalizeText(eventDraft.commune);
    const matches = q
      ? all.filter((c) => normalizeText(c).includes(q))
      : all;
    return matches.slice(0, 8);
  })();

  const selectCommune = (commune: string) => {
    updateDraft({ commune });
    setCommuneListOpen(false);
    Keyboard.dismiss();
  };

  // ── Tickets (ported from Step4Tickets) ──
  const addTier = () => {
    updateDraft({ ticket_tiers: [...eventDraft.ticket_tiers, { name: '', price: '', quantity: '' }] });
  };
  const removeTier = (index: number) => {
    if (eventDraft.ticket_tiers.length > 1) {
      updateDraft({ ticket_tiers: eventDraft.ticket_tiers.filter((_, i) => i !== index) });
    }
  };
  const updateTier = (index: number, field: string, value: string) => {
    const newTiers = [...eventDraft.ticket_tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    updateDraft({ ticket_tiers: newTiers });
  };
  const getCurrencySymbol = () => (eventDraft.currency === 'HTG' ? 'HTG' : '$');

  // ── Date/time helpers (ported verbatim from Step3ScheduleRefactored) ──
  const closeAllPickers = () => {
    setShowStartDate(false);
    setShowStartTime(false);
    setShowEndDate(false);
    setShowEndTime(false);
  };

  useEffect(() => {
    validateSchedule();
  }, [eventDraft.start_date, eventDraft.start_time, eventDraft.end_date, eventDraft.end_time]);

  // The moment a start date is set/changed, mirror it into the end date when the
  // end is still empty or now falls before the start — even if no time is set yet.
  // A valid, later end date the user already chose is left untouched.
  useEffect(() => {
    if (!eventDraft.start_date) return;
    if (!eventDraft.end_date || eventDraft.end_date < eventDraft.start_date) {
      updateDraft({ end_date: eventDraft.start_date });
    }
  }, [eventDraft.start_date]);

  // When a start time is set, push the end time to +1 hour (and keep end date valid).
  useEffect(() => {
    if (eventDraft.start_date && eventDraft.start_time) {
      const oneHourLater = addOneHour(eventDraft.start_time);
      const shouldUpdateEndDate = !eventDraft.end_date || eventDraft.end_date < eventDraft.start_date;
      updateDraft({
        end_date: shouldUpdateEndDate ? eventDraft.start_date : eventDraft.end_date,
        end_time: oneHourLater,
      });
    }
  }, [eventDraft.start_date, eventDraft.start_time]);

  const validateSchedule = (): boolean => {
    if (!eventDraft.start_date || !eventDraft.start_time || !eventDraft.end_date || !eventDraft.end_time) {
      setScheduleErrorKey(null);
      return false;
    }
    const start = combineDateAndTime(eventDraft.start_date, eventDraft.start_time);
    const end = combineDateAndTime(eventDraft.end_date, eventDraft.end_time);
    const now = new Date();
    if (start < now) {
      setScheduleErrorKey('organizerCreateEvent.schedule.errors.startInPast');
      return false;
    }
    if (end <= start) {
      setScheduleErrorKey('organizerCreateEvent.schedule.errors.endAfterStart');
      return false;
    }
    setScheduleErrorKey(null);
    return true;
  };

  const addOneHour = (timeStr: string): string => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeStr;
    let hours = parseInt(match[1]);
    const minutes = match[2];
    let period = match[3].toUpperCase();
    hours += 1;
    if (hours > 12) {
      hours = 1;
      period = period === 'AM' ? 'PM' : 'AM';
    } else if (hours === 12) {
      period = period === 'AM' ? 'PM' : 'AM';
    }
    return `${hours}:${minutes} ${period}`;
  };

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

  const getDateValue = (dateStr: string): Date => {
    return dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  };

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

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartDate(false);
    if (selectedDate) updateDraft({ start_date: selectedDate.toISOString().split('T')[0] });
  };
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndDate(false);
    if (selectedDate) updateDraft({ end_date: selectedDate.toISOString().split('T')[0] });
  };
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

  // iOS picker modal — fixed 240px height container is CRITICAL (ported from Step3).
  const renderPickerModal = (
    visible: boolean,
    title: string,
    value: Date,
    mode: 'date' | 'time',
    onChange: (event: any, date?: Date) => void,
    onClose: () => void,
    minimumDate?: Date
  ) => {
    if (Platform.OS === 'android') return null;
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
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
              {/* CRITICAL: fixed-height container or the picker renders at 0 height. */}
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={value}
                  mode={mode}
                  is24Hour={false}
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

  /**
   * Validate the whole draft on Save. Sets inline per-field errors (the inline
   * rows show red). No step-jumping — this is a single canvas.
   */
  const validateForSubmit = (): boolean => {
    const errs: FieldErrors = {};
    if (!eventDraft.title.trim()) errs.title = t('organizerCreateEventFlow.validation.title');
    if (!eventDraft.venue_name.trim()) errs.venue_name = t('organizerCreateEventFlow.validation.venue');
    if (!eventDraft.start_date || !eventDraft.start_time) errs.start = t('organizerCreateEventFlow.validation.startDate');
    if (!eventDraft.end_date || !eventDraft.end_time) errs.end = t('organizerCreateEventFlow.validation.endDate');

    if (eventDraft.is_rsvp) {
      const cap = parseInt(eventDraft.capacity || '0', 10);
      if (!Number.isFinite(cap) || cap <= 0) errs.capacity = t('organizerCreateEventFlow.validation.capacity');
    } else {
      eventDraft.ticket_tiers.forEach((tier, i) => {
        if (!tier.name.trim()) errs[`tier_${i}_name`] = t('organizerCreateEventFlow.validation.tierName');
        const price = parseFloat(tier.price);
        if (tier.price === '' || !Number.isFinite(price) || price < 0) errs[`tier_${i}_price`] = t('organizerCreateEventFlow.validation.tierPrice');
        const qty = parseInt(tier.quantity || '0', 10);
        if (!Number.isFinite(qty) || qty <= 0) errs[`tier_${i}_quantity`] = t('organizerCreateEventFlow.validation.tierQuantity');
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save: validate, then confirm-to-publish (create) or submit directly (edit).
  const handleSave = () => {
    if (!validateForSubmit()) return;
    if (isEditMode) {
      handleSubmit({});
    } else {
      setConfirmVisible(true);
    }
  };

  // Normalize the draft into the CreateEventData shape. RSVP events collapse to
  // a single free tier sized by the attendance cap.
  const buildEventData = () => {
    if (eventDraft.is_rsvp) {
      return {
        ...eventDraft,
        currency: eventDraft.currency || 'HTG',
        ticket_tiers: [
          { name: 'RSVP', price: '0', quantity: eventDraft.capacity || '0' },
        ],
      };
    }
    return eventDraft;
  };

  const handleSubmit = async (options: SaveEventOptions) => {
    if (!userProfile?.id) {
      Alert.alert(t('common.error'), t('organizerCreateEventFlow.authRequired'));
      return;
    }

    const eventData = buildEventData();

    // Match web restrictions: paid US/CA events require Stripe Connect.
    const draftCountry = String((eventDraft as any).country || 'HT').toUpperCase();
    const isStripeCountry = draftCountry === 'US' || draftCountry === 'CA';
    const hasPaidTickets = !eventDraft.is_rsvp && (eventData.ticket_tiers || []).some((tier) => {
      const price = parseFloat(String((tier as any).price ?? '0'));
      return Number.isFinite(price) && price > 0;
    });

    if (isStripeCountry && hasPaidTickets) {
      try {
        const organizerId = user?.uid || userProfile.id;

        // Prefer new payout profile doc; fall back to legacy payoutConfig/main.
        const [profileSnap, legacySnap] = await Promise.all([
          getDoc(doc(db, 'organizers', organizerId, 'payoutProfiles', 'stripe_connect')),
          getDoc(doc(db, 'organizers', organizerId, 'payoutConfig', 'main')),
        ]);

        const profileData = profileSnap.exists() ? (profileSnap.data() as any) : null;
        const legacyData = legacySnap.exists() ? (legacySnap.data() as any) : null;
        const merged = profileData || legacyData;

        const provider = String(merged?.payoutProvider || '').toLowerCase();
        const stripeAccountId = merged?.stripeAccountId || merged?.stripe_account_id || null;
        const ok = provider === 'stripe_connect' && !!stripeAccountId;

        if (!ok) {
          setConfirmVisible(false);
          Alert.alert(
            t('organizerEarnings.stripeConnectRequired.title'),
            t('organizerEarnings.stripeConnectRequired.body')
          );
          return;
        }
      } catch {
        setConfirmVisible(false);
        Alert.alert(
          t('organizerEarnings.stripeConnectRequired.title'),
          t('organizerEarnings.stripeConnectRequired.body')
        );
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditMode && eventId) {
        // Update existing event
        await updateEvent(eventId, userProfile.id, eventData, options);
        console.log('Event updated with ID:', eventId);

        setConfirmVisible(false);
        Alert.alert(
          t('common.success'),
          t('organizerCreateEventFlow.updateSuccessBody'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        // Create new event
        const newEventId = await createEvent(userProfile.id, eventData, options);
        console.log('Event created with ID:', newEventId);

        setConfirmVisible(false);
        Alert.alert(
          t('common.success'),
          options.publish === false
            ? t('organizerCreateEventFlow.draftSuccessBody')
            : t('organizerCreateEventFlow.createSuccessBody'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Event save error:', error);
      setConfirmVisible(false);
      Alert.alert(
        t('common.error'),
        error.message || (isEditMode ? t('organizerCreateEventFlow.saveFailedUpdate') : t('organizerCreateEventFlow.saveFailedCreate'))
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingEvent) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerCreateEventFlow.loadingEvent')}</Text>
      </View>
    );
  }

  const confirmExit = () => {
    Alert.alert(t('organizerCreateEventFlow.discardTitle'), t('organizerCreateEventFlow.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('organizerCreateEventFlow.leave'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  // ── Two-tile entry chooser (create mode only, POSH IMG_1843) ─────────────
  if (!entryChosen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <View style={styles.entryHeader}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.entryBody}>
            <Text style={styles.entryTitle}>{t('organizerCreateEventFlow.entry.title')}</Text>

            <View style={styles.entryTiles}>
              <TouchableOpacity
                style={styles.entryTile}
                activeOpacity={0.85}
                onPress={() => chooseMode(false)}
              >
                <Ionicons name="pricetags-outline" size={40} color={colors.text} />
                <Text style={styles.entryTileLabel}>{t('organizerCreateEventFlow.entry.sellTitle')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.entryTile}
                activeOpacity={0.85}
                onPress={() => chooseMode(true)}
              >
                <Ionicons name="people-outline" size={40} color={colors.text} />
                <Text style={styles.entryTileLabel}>{t('organizerCreateEventFlow.entry.rsvpTitle')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.entrySubtitle}>{t('organizerCreateEventFlow.entry.subtitle')}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? -50 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={confirmExit}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isEditMode ? t('organizerCreateEventFlow.headerEdit') : t('organizerCreateEventFlow.headerCreate')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Single scrolling canvas */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={{
              paddingBottom: isKeyboardVisible ? 24 : 140,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Flyer hero (POSH IMG_1847) */}
            <TouchableOpacity style={styles.flyerHero} activeOpacity={0.9} onPress={pickImage}>
              {eventDraft.banner_image_url ? (
                <>
                  <Image
                    source={{ uri: eventDraft.banner_image_url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <View style={styles.flyerOverlay} />
                  <View style={styles.changeFlyerPill}>
                    <Ionicons name="camera-outline" size={16} color={colors.white} />
                    <Text style={styles.changeFlyerText}>{t('organizerCreateEventFlow.canvas.changeFlyer')}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.flyerEmpty}>
                  {/* Poster-forward ambient base (matches the login backdrop) */}
                  <LinearGradient
                    colors={['#123230', '#0c1c1e', '#0A0A0A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.flyerGlow} />
                  {/* Faint raked flyer silhouettes */}
                  <View style={[styles.posterSilhouette, styles.poster1]} />
                  <View style={[styles.posterSilhouette, styles.poster2]} />
                  <View style={[styles.posterSilhouette, styles.poster3]} />
                  {/* Dashed upload-zone frame */}
                  <View style={styles.flyerDashed} pointerEvents="none" />

                  <View style={styles.flyerContent}>
                    <View style={styles.flyerIconRing}>
                      <Ionicons name="image-outline" size={30} color={colors.text} />
                    </View>
                    <Text style={styles.flyerTitle}>{t('organizerCreateEventFlow.canvas.flyerTitle')}</Text>
                    <Text style={styles.flyerSubtitle}>{t('organizerCreateEvent.basics.aspectRatio')}</Text>
                    <View style={styles.uploadPill}>
                      <Ionicons name="arrow-up-circle" size={18} color="#000000" />
                      <Text style={styles.uploadPillText}>{t('organizerCreateEventFlow.canvas.uploadFlyer')}</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Core inline fields */}
            <View style={styles.canvasPad}>
              <InlineTextRow
                colors={colors}
                placeholder={t('organizerCreateEventFlow.canvas.titlePlaceholder') + ' *'}
                value={eventDraft.title}
                onChangeText={(text) => updateDraft({ title: text })}
                error={!!errors.title}
                maxLength={100}
              />

              <InlineDateTimeRow
                colors={colors}
                label={t('organizerCreateEventFlow.canvas.start') + ' *'}
                dateText={eventDraft.start_date}
                timeText={eventDraft.start_time}
                timePlaceholder={t('organizerCreateEvent.schedule.selectTime')}
                onPressDate={() => { closeAllPickers(); Keyboard.dismiss(); setShowStartDate(true); }}
                onPressTime={() => { closeAllPickers(); Keyboard.dismiss(); setShowStartTime(true); }}
                error={!!errors.start}
              />
              <InlineDateTimeRow
                colors={colors}
                label={t('organizerCreateEventFlow.canvas.end') + ' *'}
                dateText={eventDraft.end_date}
                timeText={eventDraft.end_time}
                timePlaceholder={t('organizerCreateEvent.schedule.selectTime')}
                onPressDate={() => { closeAllPickers(); Keyboard.dismiss(); setShowEndDate(true); }}
                onPressTime={() => { closeAllPickers(); Keyboard.dismiss(); setShowEndTime(true); }}
                error={!!errors.end}
              />
              {scheduleErrorKey && (
                <View style={styles.scheduleError}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.scheduleErrorText}>{t(scheduleErrorKey)}</Text>
                </View>
              )}

              <InlineTextRow
                colors={colors}
                placeholder={t('organizerCreateEvent.location.venueName') + ' *'}
                value={eventDraft.venue_name}
                onChangeText={(text) => updateDraft({ venue_name: text })}
                error={!!errors.venue_name}
              />
              <InlineTextRow
                colors={colors}
                placeholder={t('organizerCreateEvent.location.streetAddress')}
                value={eventDraft.address}
                onChangeText={(text) => updateDraft({ address: text })}
              />

              {/* Country + City — kept minimal for Haiti (POSH omits them). */}
              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>{t('organizerCreateEvent.location.country')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {COUNTRIES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[styles.chip, selectedCountry === country.code && styles.chipActive]}
                      onPress={() => handleCountryChange(country.code)}
                    >
                      <Text style={[styles.chipText, selectedCountry === country.code && styles.chipTextActive]}>
                        {country.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {isHaiti ? (
                <>
                  {/* Département → City (arrondissement) → Commune cascade (Haiti) */}
                  <View style={styles.chipBlock}>
                    <Text style={styles.chipLabel}>{t('organizerCreateEvent.location.department')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                      {HAITI_DEPARTMENTS.map((dep) => (
                        <TouchableOpacity
                          key={dep}
                          style={[styles.chip, department === dep && styles.chipActive]}
                          onPress={() => handleDepartmentChange(dep)}
                        >
                          <Text style={[styles.chipText, department === dep && styles.chipTextActive]}>
                            {dep}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.chipBlock}>
                    <Text style={styles.chipLabel}>{t('organizerCreateEvent.location.city')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                      {haitiCities.map((c) => (
                        <TouchableOpacity
                          key={c.name}
                          style={[styles.chip, eventDraft.city === c.name && styles.chipActive]}
                          onPress={() => updateDraft({ city: c.name, commune: '' })}
                        >
                          <Text style={[styles.chipText, eventDraft.city === c.name && styles.chipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Searchable commune — type to filter, tap a match, or free-text */}
                  <InlineTextRow
                    colors={colors}
                    placeholder={t('organizerCreateEvent.location.communeSearchPlaceholder')}
                    value={eventDraft.commune}
                    onChangeText={(text) => {
                      updateDraft({ commune: text });
                      setCommuneListOpen(true);
                    }}
                    onFocus={() => setCommuneListOpen(true)}
                  />
                  {communeListOpen && communeSuggestions.length > 0 && (
                    <View style={styles.communeList}>
                      {communeSuggestions.map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={styles.communeItem}
                          onPress={() => selectCommune(c)}
                        >
                          <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                          <Text style={styles.communeItemText}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* Non-Haiti: flat city chips + free-text commune */}
                  <View style={styles.chipBlock}>
                    <Text style={styles.chipLabel}>{t('organizerCreateEvent.location.city')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                      {cities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[styles.chip, eventDraft.city === city && styles.chipActive]}
                          onPress={() => updateDraft({ city })}
                        >
                          <Text style={[styles.chipText, eventDraft.city === city && styles.chipTextActive]}>
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <InlineTextRow
                    colors={colors}
                    placeholder={t('organizerCreateEvent.location.communeOptional')}
                    value={eventDraft.commune}
                    onChangeText={(text) => updateDraft({ commune: text })}
                  />
                </>
              )}

              {/* Category */}
              <View style={styles.chipBlock}>
                <Text style={styles.chipLabel}>{t('organizerCreateEvent.basics.category')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, eventDraft.category === cat && styles.chipActive]}
                      onPress={() => updateDraft({ category: cat })}
                    >
                      <Text style={[styles.chipText, eventDraft.category === cat && styles.chipTextActive]}>
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Additional Details */}
            <View style={styles.canvasPad}>
              <Text style={styles.sectionHeader}>{t('organizerCreateEventFlow.canvas.additionalDetails')}</Text>
              <InlineTextRow
                colors={colors}
                placeholder={t('organizerCreateEventFlow.canvas.eventSummary')}
                value={eventDraft.description}
                onChangeText={(text) => updateDraft({ description: text })}
                multiline
                maxLength={2000}
              />
            </View>

            {/* Tickets */}
            <View style={styles.canvasPad}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>{t('organizerCreateEventFlow.canvas.ticketsHeader')}</Text>
                {!eventDraft.is_rsvp && (
                  <TouchableOpacity onPress={addTier} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="add-circle" size={26} color={colors.text} />
                  </TouchableOpacity>
                )}
              </View>

              {eventDraft.is_rsvp ? (
                <>
                  <InlineTextRow
                    colors={colors}
                    placeholder={t('organizerCreateEvent.rsvp.capLabel') + ' *'}
                    value={eventDraft.capacity}
                    onChangeText={(text) => updateDraft({ capacity: text })}
                    error={!!errors.capacity}
                    keyboardType="numeric"
                  />
                  <View style={styles.infoRow}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{t('organizerCreateEvent.rsvp.infoText')}</Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Currency segmented control */}
                  <View style={styles.currencyRow}>
                    <TouchableOpacity
                      style={[styles.currencyButton, eventDraft.currency === 'USD' && styles.currencyButtonActive]}
                      onPress={() => updateDraft({ currency: 'USD' })}
                    >
                      <Text style={[styles.currencyText, eventDraft.currency === 'USD' && styles.currencyTextActive]}>
                        {t('organizerCreateEvent.tickets.currencyUsd')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.currencyButton, eventDraft.currency === 'HTG' && styles.currencyButtonActive]}
                      onPress={() => updateDraft({ currency: 'HTG' })}
                    >
                      <Text style={[styles.currencyText, eventDraft.currency === 'HTG' && styles.currencyTextActive]}>
                        {t('organizerCreateEvent.tickets.currencyHtg')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {eventDraft.ticket_tiers.map((tier, index) => (
                    <View key={index} style={styles.tierCard}>
                      <View style={styles.tierHeader}>
                        <Text style={styles.tierTitle}>
                          {t('organizerCreateEvent.tickets.tier')} {index + 1}
                        </Text>
                        {eventDraft.ticket_tiers.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeTier(index)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>

                      <InlineTextRow
                        colors={colors}
                        placeholder={t('organizerCreateEvent.tickets.tierName') + ' *'}
                        value={tier.name}
                        onChangeText={(text) => updateTier(index, 'name', text)}
                        error={!!errors[`tier_${index}_name`]}
                      />
                      <View style={styles.tierSplit}>
                        <View style={styles.tierSplitCell}>
                          <InlineTextRow
                            colors={colors}
                            placeholder={`${t('organizerCreateEvent.tickets.price')} (${getCurrencySymbol()}) *`}
                            value={tier.price}
                            onChangeText={(text) => updateTier(index, 'price', text)}
                            error={!!errors[`tier_${index}_price`]}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.tierSplitCell}>
                          <InlineTextRow
                            colors={colors}
                            placeholder={t('organizerCreateEvent.tickets.quantity') + ' *'}
                            value={tier.quantity}
                            onChangeText={(text) => updateTier(index, 'quantity', text)}
                            error={!!errors[`tier_${index}_quantity`]}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addTierRow} onPress={addTier}>
                    <Ionicons name="add" size={20} color={colors.text} />
                    <Text style={styles.addTierText}>{t('organizerCreateEventFlow.canvas.addTicketType')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>

          {/* Footer — persistent, hidden when keyboard is visible (POSH IMG_1848) */}
          {!isKeyboardVisible && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.backButton} onPress={confirmExit}>
                <Text style={styles.backButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
              <WhitePillCTA
                label={isEditMode ? t('organizerCreateEventFlow.updateEvent') : t('organizerCreateEventFlow.createEvent')}
                onPress={handleSave}
                disabled={saving}
                style={styles.footerCta}
              />
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* iOS date/time picker modals (Android uses inline native dialogs below) */}
      {renderPickerModal(
        showStartDate,
        t('organizerCreateEvent.schedule.modalStartDate'),
        getDateValue(eventDraft.start_date),
        'date',
        handleStartDateChange,
        () => setShowStartDate(false),
        undefined
      )}
      {renderPickerModal(
        showEndDate,
        t('organizerCreateEvent.schedule.modalEndDate'),
        getDateValue(eventDraft.end_date),
        'date',
        handleEndDateChange,
        () => setShowEndDate(false),
        eventDraft.start_date ? new Date(eventDraft.start_date) : undefined
      )}
      {renderPickerModal(
        showStartTime,
        t('organizerCreateEvent.schedule.modalStartTime'),
        getTimeValue(eventDraft.start_time),
        'time',
        handleStartTimeChange,
        () => setShowStartTime(false)
      )}
      {renderPickerModal(
        showEndTime,
        t('organizerCreateEvent.schedule.modalEndTime'),
        getTimeValue(eventDraft.end_time),
        'time',
        handleEndTimeChange,
        () => setShowEndTime(false)
      )}

      {/* Android inline pickers (auto-dismiss native dialogs) */}
      {Platform.OS === 'android' && showStartDate && (
        <DateTimePicker value={getDateValue(eventDraft.start_date)} mode="date" display="default" onChange={handleStartDateChange} />
      )}
      {Platform.OS === 'android' && showStartTime && (
        <DateTimePicker value={getTimeValue(eventDraft.start_time)} mode="time" is24Hour={false} display="default" onChange={handleStartTimeChange} />
      )}
      {Platform.OS === 'android' && showEndDate && (
        <DateTimePicker value={getDateValue(eventDraft.end_date)} mode="date" display="default" onChange={handleEndDateChange} minimumDate={eventDraft.start_date ? new Date(eventDraft.start_date) : undefined} />
      )}
      {Platform.OS === 'android' && showEndTime && (
        <DateTimePicker value={getTimeValue(eventDraft.end_time)} mode="time" is24Hour={false} display="default" onChange={handleEndTimeChange} />
      )}

      {/* Confirmation-before-publish sheet with save-as-draft escape hatch */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setConfirmVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !saving && setConfirmVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('organizerCreateEventFlow.confirm.title')}</Text>
            <Text style={styles.sheetBody}>{t('organizerCreateEventFlow.confirm.body')}</Text>

            <WhitePillCTA
              label={t('organizerCreateEventFlow.confirm.publish')}
              variant="paid"
              onPress={() => handleSubmit({ publish: true })}
              loading={saving}
              disabled={saving}
              style={styles.sheetPublish}
            />

            <TouchableOpacity
              style={styles.sheetDraft}
              disabled={saving}
              onPress={() => handleSubmit({ publish: false })}
            >
              <Text style={styles.sheetDraftText}>
                {t('organizerCreateEventFlow.confirm.saveDraft')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },

  // ── Entry chooser (two big square tiles) ──
  entryHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  entryBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  entryTitle: {
    fontFamily: font.serif,
    fontSize: 44,
    lineHeight: 48,
    color: colors.text,
  },
  entryTiles: {
    flexDirection: 'row',
    gap: 16,
  },
  entryTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  entryTileLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  entrySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  content: {
    flex: 1,
  },
  canvasPad: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // ── Flyer hero ──
  flyerHero: {
    // True event-flyer proportions: 2:3 portrait, matching the picker crop.
    aspectRatio: 2 / 3,
    borderRadius: RADIUS.xl,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerContent: {
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  flyerGlow: {
    position: 'absolute',
    top: -70,
    left: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  posterSilhouette: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  poster1: {
    width: 150,
    height: 215,
    top: 46,
    left: -34,
    transform: [{ rotate: '-15deg' }],
  },
  poster2: {
    width: 140,
    height: 200,
    bottom: 60,
    right: -30,
    transform: [{ rotate: '12deg' }],
  },
  poster3: {
    width: 96,
    height: 138,
    top: 150,
    right: 44,
    opacity: 0.6,
    transform: [{ rotate: '-7deg' }],
  },
  flyerDashed: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  flyerIconRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  flyerTitle: {
    fontFamily: font.serif,
    fontSize: 30,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'center',
  },
  flyerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -6,
  },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: colors.white,
    marginTop: 4,
  },
  uploadPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
  flyerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  changeFlyerPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  changeFlyerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },

  // ── Section headers ──
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Chips (country / city / category) ──
  chipBlock: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 10,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: {
    // Teal = the selected-state marker (semantic, POSH §1).
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },

  // ── Commune search dropdown (Haiti) ──
  communeList: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  communeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  communeItemText: {
    fontSize: 15,
    color: colors.text,
  },

  // ── Schedule inline error ──
  scheduleError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  scheduleErrorText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
  },

  // ── Info row (RSVP) ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ── Tickets ──
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  currencyButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyButtonActive: {
    backgroundColor: colors.primary,
  },
  currencyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  currencyTextActive: {
    color: colors.white,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingBottom: 4,
    marginTop: 14,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  tierTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tierSplit: {
    flexDirection: 'row',
    gap: 16,
  },
  tierSplitCell: {
    flex: 1,
  },
  addTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: RADIUS.md,
    backgroundColor: colors.surfaceRaised,
  },
  addTierText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceRaised,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  footerCta: {
    flex: 1,
  },

  // ── iOS picker modal (ported from Step3) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSafeArea: {},
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  // CRITICAL: fixed height for picker — without this, picker has 0 height.
  pickerContainer: {
    height: 240,
    backgroundColor: colors.surface,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },

  // ── Confirm sheet ──
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: font.serif,
    fontSize: 30,
    lineHeight: 34,
    color: colors.text,
  },
  sheetBody: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  sheetPublish: {
    width: '100%',
  },
  sheetDraft: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  sheetDraftText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
