/**
 * CreateEventFlow - Parent stepper component
 *
 * Architecture:
 * - Single source of truth: eventDraft state
 * - Two-choice entry (Sell tickets vs free RSVP) before Step 1 (POSH §2.10)
 * - Only active step is rendered (prevents gesture conflicts)
 * - Each step receives draft + updateDraft + inline per-field `errors`
 * - Inline per-field validation on Continue (no Alert.alert banners)
 * - A confirmation sheet before publishing, with a save-as-draft escape hatch
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import WhitePillCTA from '../../components/WhitePillCTA';
import { font } from '../../theme/tokens';

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmVisible, setConfirmVisible] = useState(false);

  const eventId = route.params?.eventId;
  const isEditMode = !!eventId;

  // In create mode the two-choice entry chooser is shown first; edit mode
  // jumps straight into the stepper (mode derived from the loaded event).
  const [entryChosen, setEntryChosen] = useState(isEditMode);

  // Single source of truth for all form data
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: '',
    description: '',
    category: 'Music',
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

  // Generic update function - any step can update any field
  const updateDraft = (updates: Partial<EventDraft>) => {
    setEventDraft(prev => ({ ...prev, ...updates }));
  };

  // Choose the entry mode (sell tickets vs free RSVP) and enter the stepper.
  const chooseMode = (rsvp: boolean) => {
    updateDraft({ is_rsvp: rsvp });
    setEntryChosen(true);
    setCurrentStep(1);
  };

  /**
   * Validate a single step and set inline per-field errors. Returns true when
   * the step is valid. Replaces the old Alert.alert `validateAllSteps` banner.
   */
  const validateStep = (step: number): boolean => {
    const next: FieldErrors = { ...errors };
    // Clear this step's keys before re-validating.
    const clear = (...keys: string[]) => keys.forEach((k) => delete next[k]);
    let ok = true;

    if (step === 1) {
      clear('title');
      if (!eventDraft.title.trim()) {
        next.title = t('organizerCreateEventFlow.validation.title');
        ok = false;
      }
    } else if (step === 2) {
      clear('venue_name');
      if (!eventDraft.venue_name.trim()) {
        next.venue_name = t('organizerCreateEventFlow.validation.venue');
        ok = false;
      }
    } else if (step === 3) {
      clear('start', 'end');
      if (!eventDraft.start_date || !eventDraft.start_time) {
        next.start = t('organizerCreateEventFlow.validation.startDate');
        ok = false;
      }
      if (!eventDraft.end_date || !eventDraft.end_time) {
        next.end = t('organizerCreateEventFlow.validation.endDate');
        ok = false;
      }
    } else if (step === 4) {
      if (eventDraft.is_rsvp) {
        clear('capacity');
        const cap = parseInt(eventDraft.capacity || '0', 10);
        if (!Number.isFinite(cap) || cap <= 0) {
          next.capacity = t('organizerCreateEventFlow.validation.capacity');
          ok = false;
        }
      } else {
        // Clear all previous tier errors.
        Object.keys(next)
          .filter((k) => k.startsWith('tier_'))
          .forEach((k) => delete next[k]);
        if (eventDraft.ticket_tiers.length === 0) {
          next.tier_0_name = t('organizerCreateEventFlow.validation.tierName');
          ok = false;
        }
        eventDraft.ticket_tiers.forEach((tier, i) => {
          if (!tier.name.trim()) {
            next[`tier_${i}_name`] = t('organizerCreateEventFlow.validation.tierName');
            ok = false;
          }
          const price = parseFloat(tier.price);
          if (tier.price === '' || !Number.isFinite(price) || price < 0) {
            next[`tier_${i}_price`] = t('organizerCreateEventFlow.validation.tierPrice');
            ok = false;
          }
          const qty = parseInt(tier.quantity || '0', 10);
          if (!Number.isFinite(qty) || qty <= 0) {
            next[`tier_${i}_quantity`] = t('organizerCreateEventFlow.validation.tierQuantity');
            ok = false;
          }
        });
      }
    }

    setErrors(next);
    return ok;
  };

  /**
   * Validate every step before submit (the progress bar lets users skip ahead,
   * so a per-step check on Continue isn't enough). Sets all inline errors and
   * jumps to the first offending step. Returns true when the whole draft is valid.
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

    if (Object.keys(errs).length === 0) return true;

    // Jump to the first step that has an error.
    if (errs.title) setCurrentStep(1);
    else if (errs.venue_name) setCurrentStep(2);
    else if (errs.start || errs.end) setCurrentStep(3);
    else setCurrentStep(4);
    return false;
  };

  const handleNext = () => {
    if (currentStep < 5) {
      if (!validateStep(currentStep)) return;
      setCurrentStep(currentStep + 1);
      return;
    }
    // Final step — validate the whole draft before publishing.
    if (!validateForSubmit()) return;
    if (isEditMode) {
      // Edit mode preserves publication state — submit directly.
      handleSubmit({});
    } else {
      // Create mode: confirm before publishing (with save-as-draft escape).
      setConfirmVisible(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
          setCurrentStep(2);
          return;
        }
      } catch {
        setConfirmVisible(false);
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

  // Render only the active step - prevents gesture conflicts
  const renderActiveStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Basics draft={eventDraft} updateDraft={updateDraft} errors={errors} />;
      case 2:
        return <Step2Location draft={eventDraft} updateDraft={updateDraft} errors={errors} />;
      case 3:
        return <Step3ScheduleRefactored draft={eventDraft} updateDraft={updateDraft} errors={errors} />;
      case 4:
        return <Step4Tickets draft={eventDraft} updateDraft={updateDraft} errors={errors} />;
      case 5:
        return <Step5Preview draft={eventDraft} updateDraft={updateDraft} errors={errors} />;
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

  const confirmExit = () => {
    Alert.alert(t('organizerCreateEventFlow.discardTitle'), t('organizerCreateEventFlow.discardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('organizerCreateEventFlow.leave'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  // ── Two-choice entry chooser (create mode only) ──────────────────────────
  if (!entryChosen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('organizerCreateEventFlow.headerCreate')}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.entryBody}>
            <Text style={styles.entryTitle}>{t('organizerCreateEventFlow.entry.title')}</Text>
            <Text style={styles.entrySubtitle}>{t('organizerCreateEventFlow.entry.subtitle')}</Text>

            <TouchableOpacity
              style={styles.entryCard}
              activeOpacity={0.85}
              onPress={() => chooseMode(false)}
            >
              <View style={styles.entryIcon}>
                <Ionicons name="pricetags-outline" size={26} color={colors.text} />
              </View>
              <View style={styles.entryCardText}>
                <Text style={styles.entryCardTitle}>{t('organizerCreateEventFlow.entry.sellTitle')}</Text>
                <Text style={styles.entryCardDesc}>{t('organizerCreateEventFlow.entry.sellDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.entryCard}
              activeOpacity={0.85}
              onPress={() => chooseMode(true)}
            >
              <View style={styles.entryIcon}>
                <Ionicons name="people-outline" size={26} color={colors.text} />
              </View>
              <View style={styles.entryCardText}>
                <Text style={styles.entryCardTitle}>{t('organizerCreateEventFlow.entry.rsvpTitle')}</Text>
                <Text style={styles.entryCardDesc}>{t('organizerCreateEventFlow.entry.rsvpDesc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={styles.backButtonText}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}
              <WhitePillCTA
                label={
                  currentStep === 5
                    ? (isEditMode ? t('organizerCreateEventFlow.updateEvent') : t('organizerCreateEventFlow.createEvent'))
                    : t('common.continue')
                }
                onPress={handleNext}
                disabled={saving}
                style={styles.footerCta}
              />
            </View>
          )}
        </View>
      </SafeAreaView>

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
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },

  // ── Entry chooser ──
  entryBody: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  entryTitle: {
    fontFamily: font.serif,
    fontSize: 40,
    lineHeight: 44,
    color: colors.text,
    marginTop: 8,
  },
  entrySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: RADIUS.xl,
    backgroundColor: colors.surfaceRaised,
  },
  entryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCardText: {
    flex: 1,
    gap: 4,
  },
  entryCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  entryCardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  progressWrapper: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    // Teal = the active-state marker (semantic, POSH §1).
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
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 20,
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
