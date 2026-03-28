/**
 * CreateEventFlow - Parent stepper component
 * 
 * Architecture:
 * - Single source of truth: eventDraft state
 * - Only active step is rendered (prevents gesture conflicts)
 * - Each step receives draft + updateDraft callback
 * - Validation happens per-step, collected on submit
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { createEvent, updateEvent } from '../../lib/api/events';
import { getEventById } from '../../lib/api/organizer';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

type RouteParams = {
  CreateEvent: undefined;
  EditEvent: { eventId: string };
};

// Import step components
import Step1Basics from './steps/Step1Basics';
import Step2Location from './steps/Step2Location';
import Step3ScheduleRefactored from './steps/Step3ScheduleRefactored';
import Step4Tickets from './steps/Step4Tickets';
import Step5Preview from './steps/Step5Preview';

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
}

const STEPS = [
  { id: 1, titleKey: 'organizerCreateEventFlow.steps.basics', icon: 'document-text-outline' },
  { id: 2, titleKey: 'organizerCreateEventFlow.steps.location', icon: 'location-outline' },
  { id: 3, titleKey: 'organizerCreateEventFlow.steps.schedule', icon: 'time-outline' },
  { id: 4, titleKey: 'organizerCreateEventFlow.steps.tickets', icon: 'ticket-outline' },
  { id: 5, titleKey: 'organizerCreateEventFlow.steps.preview', icon: 'eye-outline' },
];

export default function CreateEventFlowRefactored() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'EditEvent'>>();
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  
  const eventId = route.params?.eventId;
  const isEditMode = !!eventId;

  // Single source of truth for all form data
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: '',
    description: '',
    category: 'Concert',
    banner_image_url: '',
    venue_name: '',
    country: 'HT',
    city: 'Port-au-Prince',
    commune: '',
    address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    timezone: 'America/Port-au-Prince',
    ticket_tiers: [{ name: 'General Admission', price: '0', quantity: '100' }],
    currency: 'USD',
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

        setEventDraft({
          title: event.title || '',
          description: event.description || '',
          category: event.category || '',
          banner_image_url: event.cover_image_url || '',
          venue_name: event.venue_name || '',
          country: (event as any).country || 'HT',
          city: event.city || '',
          commune: event.commune || '',
          address: event.address || '',
          start_date: startDate.toISOString().split('T')[0],
          start_time: formatTime(startDate),
          end_date: endDate.toISOString().split('T')[0],
          end_time: formatTime(endDate),
          timezone: 'America/Port-au-Prince',
          ticket_tiers: formattedTicketTiers,
          currency: event.currency || 'USD',
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

  // Generic update function - any step can update any field
  const updateDraft = (updates: Partial<EventDraft>) => {
    setEventDraft(prev => ({ ...prev, ...updates }));
  };

  // Step validation - only runs on final submit
  const validateAllSteps = (): boolean => {
    if (!eventDraft.title.trim()) {
      Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredEventTitle'));
      setCurrentStep(1);
      return false;
    }
    if (!eventDraft.venue_name.trim()) {
      Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredVenueName'));
      setCurrentStep(2);
      return false;
    }
    if (!eventDraft.start_date || !eventDraft.start_time || !eventDraft.end_date || !eventDraft.end_time) {
      Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredDatesTimes'));
      setCurrentStep(3);
      return false;
    }
    if (eventDraft.ticket_tiers.length === 0) {
      Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredTickets'));
      setCurrentStep(4);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submit
      if (validateAllSteps()) {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userProfile?.id) {
      Alert.alert(t('common.error'), t('organizerCreateEventFlow.authRequired'));
      return;
    }

    // Match web restrictions: paid US/CA events require Stripe Connect.
    const draftCountry = String((eventDraft as any).country || 'HT').toUpperCase();
    const isStripeCountry = draftCountry === 'US' || draftCountry === 'CA';
    const hasPaidTickets = (eventDraft.ticket_tiers || []).some((tier) => {
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
          Alert.alert(
            t('organizerEarnings.stripeConnectRequired.title'),
            t('organizerEarnings.stripeConnectRequired.body')
          );
          setCurrentStep(2);
          return;
        }
      } catch {
        Alert.alert(
          t('organizerEarnings.stripeConnectRequired.title'),
          t('organizerEarnings.stripeConnectRequired.body')
        );
        setCurrentStep(2);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEditMode && eventId) {
        // Update existing event
        await updateEvent(eventId, userProfile.id, eventDraft);
        console.log('Event updated with ID:', eventId);
        
        Alert.alert(
          t('common.success'),
          t('organizerCreateEventFlow.updateSuccessBody'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        // Create new event
        const newEventId = await createEvent(userProfile.id, eventDraft);
        console.log('Event created with ID:', newEventId);
        
        Alert.alert(
          t('common.success'),
          t('organizerCreateEventFlow.createSuccessBody'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Event save error:', error);
      Alert.alert(
        t('common.error'),
        error.message || (isEditMode ? t('organizerCreateEventFlow.saveFailedUpdate') : t('organizerCreateEventFlow.saveFailedCreate'))
      );
    } finally {
      setSaving(false);
    }
  };

  // Render only the active step - prevents gesture conflicts
  const renderActiveStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Basics draft={eventDraft} updateDraft={updateDraft} />;
      case 2:
        return <Step2Location draft={eventDraft} updateDraft={updateDraft} />;
      case 3:
        return <Step3ScheduleRefactored draft={eventDraft} updateDraft={updateDraft} />;
      case 4:
        return <Step4Tickets draft={eventDraft} updateDraft={updateDraft} />;
      case 5:
        return <Step5Preview draft={eventDraft} updateDraft={updateDraft} />;
      default:
        return null;
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
              onPress={() => {
                Alert.alert(t('organizerCreateEventFlow.discardTitle'), t('organizerCreateEventFlow.discardBody'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('organizerCreateEventFlow.leave'), style: 'destructive', onPress: () => navigation.goBack() },
                ]);
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditMode ? t('organizerCreateEventFlow.headerEdit') : t('organizerCreateEventFlow.headerCreate')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress Bar - clickable */}
          <View style={styles.progressWrapper}>
            <View style={styles.progressContainer}>
              {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                  <TouchableOpacity
                    style={styles.stepItem}
                    onPress={() => setCurrentStep(step.id)}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        currentStep >= step.id && styles.stepCircleActive,
                      ]}
                    >
                      <Text style={[styles.stepNumber, currentStep >= step.id && styles.stepNumberActive]}>
                        {step.id}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, currentStep >= step.id && styles.stepLabelActive]}>
                      {t(step.titleKey)}
                    </Text>
                  </TouchableOpacity>
                  {index < STEPS.length - 1 && (
                    <View style={[styles.line, currentStep > step.id && styles.lineActive]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Active Step Content - scrollable */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: isKeyboardVisible ? 20 : 120,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            {renderActiveStep()}
          </ScrollView>

          {/* Footer - absolutely positioned, hidden when keyboard visible */}
          {!isKeyboardVisible && (
            <View style={styles.footer}>
              {currentStep > 1 && (
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  <Text style={styles.buttonSecondaryText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, currentStep === 1 && styles.buttonFull]}
                onPress={handleNext}
                disabled={saving}
              >
                <Text style={styles.buttonPrimaryText}>
                  {currentStep === 5
                    ? (isEditMode ? t('organizerCreateEventFlow.updateEvent') : t('organizerCreateEventFlow.createEvent'))
                    : t('common.continue')}
                </Text>
                {currentStep < 5 && <Ionicons name="arrow-forward" size={20} color={colors.white} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  progressWrapper: {
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 50,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  lineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonFull: {
    flex: 1,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
