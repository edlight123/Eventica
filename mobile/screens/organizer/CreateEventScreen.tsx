import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';

const STEPS = [
  { id: 1, titleKey: 'organizerCreateEventFlow.steps.basics', icon: 'document-text-outline' },
  { id: 2, titleKey: 'organizerCreateEventFlow.steps.location', icon: 'location-outline' },
  { id: 3, titleKey: 'organizerCreateEventFlow.steps.schedule', icon: 'time-outline' },
  { id: 4, titleKey: 'organizerCreateEventFlow.steps.tickets', icon: 'ticket-outline' },
  { id: 5, titleKey: 'common.details', icon: 'image-outline' },
];

const CATEGORIES = ['Concert', 'Party', 'Conference', 'Festival', 'Workshop', 'Sports', 'Theater', 'Other'];
const CITIES = ['Port-au-Prince', 'Cap-Haïtien', 'Gonaïves', 'Les Cayes', 'Jacmel', 'Port-de-Paix', 'Jérémie', 'Saint-Marc'];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Concert: 'organizerCreateEventLegacy.categories.concert',
  Party: 'organizerCreateEventLegacy.categories.party',
  Conference: 'organizerCreateEventLegacy.categories.conference',
  Festival: 'organizerCreateEventLegacy.categories.festival',
  Workshop: 'organizerCreateEventLegacy.categories.workshop',
  Sports: 'organizerCreateEventLegacy.categories.sports',
  Theater: 'organizerCreateEventLegacy.categories.theater',
  Other: 'organizerCreateEventLegacy.categories.other',
};

function getLegacyCategoryLabel(t: (key: string) => string, category: string) {
  const key = CATEGORY_LABEL_KEYS[category];
  return key ? t(key) : category;
}

export default function CreateEventScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Concert',
    venue_name: '',
    city: 'Port-au-Prince',
    commune: '',
    address: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    ticket_tiers: [{ name: 'General Admission', price: '', quantity: '' }] as Array<{name: string, price: string, quantity: string}>,
    currency: 'USD',
    banner_image_url: '',
    tags: [] as string[],
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getCurrencySymbol = () => {
    return formData.currency === 'HTG' ? 'HTG' : '$';
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredEventTitle'));
          return false;
        }
        if (!formData.description.trim()) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredEventDescription'));
          return false;
        }
        return true;
      case 2:
        if (!formData.venue_name.trim()) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredVenueName'));
          return false;
        }
        if (!formData.address.trim()) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredAddress'));
          return false;
        }
        return true;
      case 3:
        if (!formData.start_date || !formData.start_time) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredStartDateTime'));
          return false;
        }
        if (!formData.end_date || !formData.end_time) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredEndDateTime'));
          return false;
        }
        // Check if event starts in the past
        const parseTime = (timeStr: string) => {
          const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!match) return { hours: 0, minutes: 0 };
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return { hours, minutes };
        };
        const startTime = parseTime(formData.start_time);
        const startDate = new Date(formData.start_date + 'T00:00:00');
        startDate.setHours(startTime.hours, startTime.minutes);
        const now = new Date();
        if (startDate < now) {
          Alert.alert(t('organizerCreateEventLegacy.validation.invalidDateTitle'), t('organizerCreateEvent.schedule.errors.startInPast'));
          return false;
        }
        return true;
      case 4:
        if (formData.ticket_tiers.length === 0) {
          Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventFlow.requiredTickets'));
          return false;
        }
        for (let tier of formData.ticket_tiers) {
          if (!tier.name.trim()) {
            Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredTierNameAll'));
            return false;
          }
          if (!tier.price || parseFloat(tier.price) < 0) {
            Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredTierPriceAll'));
            return false;
          }
          if (!tier.quantity || parseInt(tier.quantity) <= 0) {
            Alert.alert(t('organizerCreateEventFlow.requiredTitle'), t('organizerCreateEventLegacy.validation.requiredTierQuantityAll'));
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const checkEventDuration = () => {
    if (!formData.start_date || !formData.start_time || !formData.end_date || !formData.end_time) {
      return true;
    }

    // Parse times (handle AM/PM format)
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return { hours: 0, minutes: 0 };
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return { hours, minutes };
    };

    const startTime = parseTime(formData.start_time);
    const endTime = parseTime(formData.end_time);

    const startDate = new Date(formData.start_date + 'T00:00:00');
    startDate.setHours(startTime.hours, startTime.minutes);

    const endDate = new Date(formData.end_date + 'T00:00:00');
    endDate.setHours(endTime.hours, endTime.minutes);

    const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    if (diffHours > 8) {
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          t('organizerCreateEventLegacy.duration.title'),
          `${t('organizerCreateEventLegacy.duration.bodyPrefix')}${Math.round(diffHours)}${t('organizerCreateEventLegacy.duration.bodySuffix')}`,
          [
            { text: t('organizerCreateEventLegacy.duration.reviewDates'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('organizerCreateEventLegacy.duration.continueAnyway'), onPress: () => resolve(true) },
          ]
        );
      });
    }
    return true;
  };

  const nextStep = async () => {
    // Only validate on the last step before submitting
    if (currentStep === 5) {
      // Validate all steps before final submit
      for (let i = 1; i <= 4; i++) {
        if (!validateStep(i)) {
          setCurrentStep(i); // Go back to the invalid step
          return;
        }
      }
      // Check duration warning
      const canProceed = await checkEventDuration();
      if (!canProceed) {
        setCurrentStep(3); // Go back to schedule step
        return;
      }
      handleSubmit();
    } else {
      // Just move to next step without validation
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // TODO: Implement Firebase event creation
      Alert.alert(t('common.success'), t('organizerCreateEventFlow.createSuccessBody'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('organizerCreateEventFlow.saveFailedCreate'));
    } finally {
      setSaving(false);
    }
  };

  const renderProgressBar = () => (
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
                currentStep > step.id && styles.stepCircleComplete,
              ]}
            >
              {currentStep > step.id ? (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    currentStep >= step.id && styles.stepNumberActive,
                  ]}
                >
                  {step.id}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                currentStep >= step.id && styles.stepLabelActive,
              ]}
            >
              {t(step.titleKey)}
            </Text>
          </TouchableOpacity>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.progressLine,
                currentStep > step.id && styles.progressLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Basics formData={formData} updateField={updateField} />;
      case 2:
        return <Step2Location formData={formData} updateField={updateField} />;
      case 3:
        return <Step3Schedule formData={formData} updateField={updateField} />;
      case 4:
        return <Step4Tickets formData={formData} updateField={updateField} />;
      case 5:
        return <Step5Details formData={formData} updateField={updateField} />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            Alert.alert(t('organizerCreateEventFlow.discardTitle'), t('organizerCreateEventFlow.discardBody'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('organizerCreateEventFlow.leave'), style: 'destructive', onPress: () => navigation.goBack() },
            ])
          }
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('organizerCreateEventFlow.headerCreate')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressScroll}
        >
          {renderProgressBar()}
        </ScrollView>
      </View>

      {/* Step Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={previousStep}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.buttonSecondaryText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, currentStep === 1 && styles.buttonFull]}
          onPress={nextStep}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.buttonPrimaryText}>
                {currentStep === 5 ? t('organizerCreateEventFlow.createEvent') : t('common.continue')}
              </Text>
              {currentStep < 5 && <Ionicons name="arrow-forward" size={20} color={colors.white} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Step 1: Basics
function Step1Basics({ formData, updateField }: any) {
  const { t } = useI18n();
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(t('organizerCreateEventLegacy.media.permissionTitle'), t('organizerCreateEventLegacy.media.permissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateField('banner_image_url', result.assets[0].uri);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('organizerCreateEvent.basics.title')}</Text>
      <Text style={styles.stepSubtitle}>{t('organizerCreateEvent.basics.subtitle')}</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.basics.eventImage')}</Text>
        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          {formData.banner_image_url ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: formData.banner_image_url }} style={styles.imagePreview} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera-outline" size={32} color={colors.white} />
                <Text style={styles.imageOverlayText}>{t('organizerCreateEvent.basics.changeImage')}</Text>
              </View>
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color={colors.primary} />
              <Text style={styles.imageUploadText}>{t('organizerCreateEvent.basics.uploadImage')}</Text>
              <Text style={styles.imageUploadSubtext}>{t('organizerCreateEvent.basics.aspectRatio')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.basics.eventTitle')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => updateField('title', text)}
          placeholder={t('organizerCreateEvent.basics.eventTitlePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.basics.description')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          placeholder={t('organizerCreateEvent.basics.descriptionPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.basics.category')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                formData.category === category && styles.categoryChipActive,
              ]}
              onPress={() => updateField('category', category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  formData.category === category && styles.categoryChipTextActive,
                ]}
              >
                {getLegacyCategoryLabel(t, category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// Step 2: Location
function Step2Location({ formData, updateField }: any) {
  const { t } = useI18n();
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('organizerCreateEvent.location.title')}</Text>
      <Text style={styles.stepSubtitle}>{t('organizerCreateEvent.location.subtitle')}</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.venueName')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={formData.venue_name}
          onChangeText={(text) => updateField('venue_name', text)}
          placeholder={t('organizerCreateEvent.location.venuePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.location.city')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.categoryChip,
                formData.city === city && styles.categoryChipActive,
              ]}
              onPress={() => updateField('city', city)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  formData.city === city && styles.categoryChipTextActive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.location.communeOptional')}</Text>
        <TextInput
          style={styles.input}
          value={formData.commune}
          onChangeText={(text) => updateField('commune', text)}
          placeholder={t('organizerCreateEvent.location.communePlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.streetAddress')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(text) => updateField('address', text)}
          placeholder={t('organizerCreateEvent.location.addressPlaceholder')}
          placeholderTextColor={colors.textSecondary}
        />
      </View>
    </View>
  );
}

// Step 3: Schedule
function Step3Schedule({ formData, updateField }: any) {
  const { t } = useI18n();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const closeAllPickers = () => {
    setShowStartDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      closeAllPickers();
    }
    if (selectedDate && event.type !== 'dismissed') {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      updateField('start_date', formattedDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false);
    }
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      updateField('start_time', `${displayHours}:${minutes} ${ampm}`);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      closeAllPickers();
    }
    if (selectedDate && event.type !== 'dismissed') {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      updateField('end_date', formattedDate);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      updateField('end_time', `${displayHours}:${minutes} ${ampm}`);
    }
  };

  const getDateValue = (dateString: string) => {
    return dateString ? new Date(dateString + 'T00:00:00') : new Date();
  };

  const getTimeValue = (timeString: string) => {
    if (timeString) {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date;
    }
    return new Date();
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('organizerCreateEvent.schedule.title')}</Text>
      <Text style={styles.stepSubtitle}>{t('organizerCreateEvent.schedule.subtitle')}</Text>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, styles.formGroupHalf]}>
          <Text style={styles.label}>
            {t('organizerCreateEvent.schedule.startDate')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              closeAllPickers();
              setShowStartDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {formData.start_date || t('organizerCreateEvent.schedule.selectDate')}
            </Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={getDateValue(formData.start_date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
            />
          )}
        </View>

        <View style={[styles.formGroup, styles.formGroupHalf]}>
          <Text style={styles.label}>
            {t('organizerCreateEvent.schedule.startTime')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              closeAllPickers();
              setShowStartTimePicker(true);
            }}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {formData.start_time || t('organizerCreateEvent.schedule.selectTime')}
            </Text>
          </TouchableOpacity>
          {showStartTimePicker && Platform.OS === 'ios' && (
            <Modal
              visible={showStartTimePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowStartTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                      <Text style={styles.modalButton}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('organizerCreateEvent.schedule.modalStartTime')}</Text>
                    <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                      <Text style={[styles.modalButton, styles.modalButtonDone]}>{t('common.done')}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={getTimeValue(formData.start_time)}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleStartTimeChange}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </Modal>
          )}
          {showStartTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={getTimeValue(formData.start_time)}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleStartTimeChange}
            />
          )}
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, styles.formGroupHalf]}>
          <Text style={styles.label}>
            {t('organizerCreateEvent.schedule.endDate')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              closeAllPickers();
              setShowEndDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {formData.end_date || t('organizerCreateEvent.schedule.selectDate')}
            </Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={getDateValue(formData.end_date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
              minimumDate={formData.start_date ? new Date(formData.start_date) : undefined}
            />
          )}
        </View>

        <View style={[styles.formGroup, styles.formGroupHalf]}>
          <Text style={styles.label}>
            {t('organizerCreateEvent.schedule.endTime')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              closeAllPickers();
              setShowEndTimePicker(true);
            }}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.dateButtonText}>
              {formData.end_time || t('organizerCreateEvent.schedule.selectTime')}
            </Text>
          </TouchableOpacity>
          {showEndTimePicker && Platform.OS === 'ios' && (
            <Modal
              visible={showEndTimePicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowEndTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={styles.modalButton}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('organizerCreateEvent.schedule.modalEndTime')}</Text>
                    <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                      <Text style={[styles.modalButton, styles.modalButtonDone]}>{t('common.done')}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={getTimeValue(formData.end_time)}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleEndTimeChange}
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </Modal>
          )}
          {showEndTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={getTimeValue(formData.end_time)}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleEndTimeChange}
            />
          )}
        </View>
      </View>

      <View style={styles.helpCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.helpText}>
          {t('organizerCreateEventLegacy.schedule.timezoneHelp')}
        </Text>
      </View>
    </View>
  );
}

// Step 4: Tickets
function Step4Tickets({ formData, updateField }: any) {
  const { t } = useI18n();
  const getCurrencySymbol = () => {
    return formData.currency === 'HTG' ? 'HTG' : '$';
  };

  const addTier = () => {
    const newTiers = [...formData.ticket_tiers, { name: '', price: '', quantity: '' }];
    updateField('ticket_tiers', newTiers);
  };

  const removeTier = (index: number) => {
    if (formData.ticket_tiers.length > 1) {
      const newTiers = formData.ticket_tiers.filter((_: any, i: number) => i !== index);
      updateField('ticket_tiers', newTiers);
    }
  };

  const updateTier = (index: number, field: string, value: string) => {
    const newTiers = [...formData.ticket_tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    updateField('ticket_tiers', newTiers);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>{t('organizerCreateEvent.tickets.title')}</Text>
      <Text style={styles.stepSubtitle}>{t('organizerCreateEvent.tickets.subtitle')}</Text>

      {formData.ticket_tiers.map((tier: any, index: number) => (
        <View key={index} style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierTitle}>{t('organizerCreateEvent.tickets.tier')} {index + 1}</Text>
            {formData.ticket_tiers.length > 1 && (
              <TouchableOpacity onPress={() => removeTier(index)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('organizerCreateEvent.tickets.tierName')} <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={tier.name}
              onChangeText={(text) => updateTier(index, 'name', text)}
              placeholder={t('organizerCreateEvent.tickets.tierNamePlaceholder')}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                {t('organizerCreateEvent.tickets.price')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInput}>
                <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
                <TextInput
                  style={styles.priceField}
                  value={tier.price}
                  onChangeText={(text) => updateTier(index, 'price', text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>
                {t('organizerCreateEvent.tickets.quantity')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={tier.quantity}
                onChangeText={(text) => updateTier(index, 'quantity', text)}
                placeholder={t('organizerCreateEvent.tickets.quantityPlaceholder')}
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addTierButton} onPress={addTier}>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        <Text style={styles.addTierText}>{t('organizerCreateEvent.tickets.addTier')}</Text>
      </TouchableOpacity>

      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.tickets.currency')}</Text>
        <View style={styles.currencyButtons}>
          {['USD', 'HTG'].map((currency) => (
            <TouchableOpacity
              key={currency}
              style={[
                styles.currencyButton,
                formData.currency === currency && styles.currencyButtonActive,
              ]}
              onPress={() => updateField('currency', currency)}
            >
              <Text
                style={[
                  styles.currencyButtonText,
                  formData.currency === currency && styles.currencyButtonTextActive,
                ]}
              >
                {currency === 'USD' ? t('organizerCreateEvent.tickets.currencyUsd') : t('organizerCreateEvent.tickets.currencyHtg')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.helpCard}>
        <Ionicons name="bulb-outline" size={20} color={colors.warning} />
        <Text style={styles.helpText}>
          {t('organizerCreateEvent.tickets.infoText')}
        </Text>
      </View>
    </View>
  );
}

// Step 5: Preview & Publish
function Step5Details({ formData, updateField }: any) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<'card' | 'page'>('page');
  
  const totalTickets = formData.ticket_tiers.reduce((sum: number, tier: any) => 
    sum + (parseInt(tier.quantity) || 0), 0
  );

  const getCurrencySymbol = () => {
    return formData.currency === 'HTG' ? 'HTG' : '$';
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert(t('organizerCreateEventLegacy.media.permissionTitle'), t('organizerCreateEventLegacy.media.permissionBody'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateField('banner_image_url', result.assets[0].uri);
    }
  };

  if (viewMode === 'card') {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, styles.toggleButtonActive]}
            onPress={() => setViewMode('card')}
          >
            <Ionicons name="card-outline" size={20} color={colors.white} />
            <Text style={styles.toggleButtonTextActive}>{t('organizerCreateEvent.preview.cardView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setViewMode('page')}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
            <Text style={styles.toggleButtonText}>{t('organizerCreateEvent.preview.pageView')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventCard}>
          {formData.banner_image_url ? (
            <Image source={{ uri: formData.banner_image_url }} style={styles.cardImage} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardCategory}>
              <Text style={styles.cardCategoryText}>{getLegacyCategoryLabel(t, formData.category)}</Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{formData.title}</Text>
            <View style={styles.cardInfo}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.cardInfoText}>{formData.start_date}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.cardInfoText}>{formData.city}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>{getCurrencySymbol()} {formData.ticket_tiers[0]?.price || '0'}</Text>
              <Text style={styles.cardTickets}>{totalTickets} {t('organizerCreateEvent.preview.tickets')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.changeImageText}>{t('organizerCreateEvent.preview.changeEventImage')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.viewToggle}>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setViewMode('card')}
        >
          <Ionicons name="card-outline" size={20} color={colors.text} />
          <Text style={styles.toggleButtonText}>{t('organizerCreateEvent.preview.cardView')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, styles.toggleButtonActive]}
          onPress={() => setViewMode('page')}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.white} />
          <Text style={styles.toggleButtonTextActive}>{t('organizerCreateEvent.preview.pageView')}</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Section */}
      <View style={styles.eventPageHero}>
        {formData.banner_image_url ? (
          <Image source={{ uri: formData.banner_image_url }} style={styles.pageHeroImage} />
        ) : (
          <View style={styles.pageHeroPlaceholder}>
            <Ionicons name="image-outline" size={60} color={colors.textSecondary} />
            <Text style={styles.placeholderText}>{t('organizerCreateEvent.preview.noImageSelected')}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
          <Ionicons name="camera" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Event Details */}
      <View style={styles.eventPageContent}>
        <View style={styles.pageCategory}>
          <Text style={styles.pageCategoryText}>{getLegacyCategoryLabel(t, formData.category)}</Text>
        </View>
        
        <Text style={styles.pageTitle}>{formData.title}</Text>
        
        <View style={styles.pageInfoRow}>
          <View style={styles.pageInfoItem}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View style={styles.pageInfoTextContainer}>
                <Text style={styles.pageInfoLabel}>{t('organizerCreateEvent.preview.date')}</Text>
              <Text style={styles.pageInfoValue}>{formData.start_date}</Text>
            </View>
          </View>
          <View style={styles.pageInfoItem}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <View style={styles.pageInfoTextContainer}>
              <Text style={styles.pageInfoLabel}>{t('organizerCreateEvent.preview.time')}</Text>
              <Text style={styles.pageInfoValue}>{formData.start_time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageInfoRow}>
          <View style={styles.pageInfoItem}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.pageInfoTextContainer}>
              <Text style={styles.pageInfoLabel}>{t('organizerCreateEvent.preview.location')}</Text>
              <Text style={styles.pageInfoValue}>{formData.venue_name}</Text>
              <Text style={styles.pageInfoSubtext}>{formData.city}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pageDivider} />

        <Text style={styles.pageSectionTitle}>{t('organizerCreateEvent.preview.about')}</Text>
        <Text style={styles.pageDescription}>{formData.description}</Text>

        <View style={styles.pageDivider} />

        <Text style={styles.pageSectionTitle}>{t('organizerCreateEvent.preview.ticketOptions')}</Text>
        {formData.ticket_tiers.map((tier: any, index: number) => (
          <View key={index} style={styles.pageTicketTier}>
            <View style={styles.pageTicketInfo}>
              <Text style={styles.pageTicketName}>{tier.name}</Text>
              <Text style={styles.pageTicketAvailable}>{tier.quantity} {t('organizerCreateEvent.preview.available')}</Text>
            </View>
            <Text style={styles.pageTicketPrice}>{getCurrencySymbol()} {tier.price}</Text>
          </View>
        ))}

        <View style={styles.helpCard}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.helpText}>
            {t('organizerCreateEvent.preview.helpText')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  progressWrapper: {
    backgroundColor: colors.white,
    zIndex: 9,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  progressScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleComplete: {
    backgroundColor: colors.success,
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
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepContainer: {
    gap: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 4,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textarea: {
    height: 100,
    paddingTop: 16,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  priceField: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 15,
    color: colors.text,
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  currencyButtonTextActive: {
    color: colors.white,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  imageUploadButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  imageOverlayText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  imageUploadSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  tierCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
    marginBottom: 12,
  },
  addTierText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 100,
  },
  previewValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  tierPreview: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierPreviewName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tierPreviewDetails: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalButtonDone: {
    color: colors.primary,
    fontWeight: '600',
  },
  timePicker: {
    height: 200,
    width: '100%',
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toggleButtonTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardCategory: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  cardTickets: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  changeImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  eventPageHero: {
    position: 'relative',
    marginBottom: 16,
  },
  pageHeroImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
  },
  pageHeroPlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  eventPageContent: {
    padding: 16,
  },
  pageCategory: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  pageCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 34,
  },
  pageInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pageInfoItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
  },
  pageInfoTextContainer: {
    flex: 1,
  },
  pageInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pageInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfoSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pageDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  pageSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  pageDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  pageTicketTier: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  pageTicketInfo: {
    flex: 1,
  },
  pageTicketName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  pageTicketAvailable: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  pageTicketPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
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
