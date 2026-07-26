import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { X } from 'lucide-react-native';
import { useFilters } from '../contexts/FiltersContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { 
  CATEGORIES,
  COUNTRIES,
  CITIES_BY_COUNTRY,
  getPriceFiltersForCountry,
  CURRENCY_BY_COUNTRY,
  DATE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  DateFilter,
  PriceFilter,
  EventTypeFilter
} from '../types/filters';
import { useTheme } from '../contexts/ThemeContext';

export default function EventFiltersSheet() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, language } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';
  const {
    draftFilters,
    isModalOpen,
    setDraftFilters,
    closeFiltersModal,
    applyFilters,
    resetFilters,
    countActiveFilters
  } = useFilters();

  const activeCount = countActiveFilters();

  // Price buckets are currency-aware: they follow the currently-selected FILTER
  // country (HTG for Haiti, USD for US, CAD for Canada, EUR for France) rather
  // than being hardcoded to HTG. Thresholds + symbols come from CURRENCY_BY_COUNTRY.
  const filterCountry = draftFilters.country || 'HT';
  const priceOptions = getPriceFiltersForCountry(filterCountry);
  const priceCurrencyCode = CURRENCY_BY_COUNTRY[filterCountry]?.code || 'HTG';

  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (date: DateFilter) => {
    if (date === 'pick-date') {
      // Show date picker
      setShowDatePicker(true);
    }
    setDraftFilters({ 
      ...draftFilters, 
      date, 
      pickedDate: date === 'pick-date' ? draftFilters.pickedDate : undefined 
    });
  };

  const handleDatePicked = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
    
    if (event.type === 'set' && selectedDate) {
      // Format date as ISO string
      const isoDate = selectedDate.toISOString().split('T')[0];
      setDraftFilters({ 
        ...draftFilters, 
        date: 'pick-date',
        pickedDate: isoDate
      });
    }
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
  };

  const handleCityChange = (city: string) => {
    setDraftFilters({ 
      ...draftFilters, 
      city: draftFilters.city === city ? '' : city, 
      commune: undefined 
    });
  };

  const handleCategoryToggle = (category: string) => {
    const categories = draftFilters.categories.includes(category)
      ? draftFilters.categories.filter(c => c !== category)
      : [...draftFilters.categories, category];
    setDraftFilters({ ...draftFilters, categories });
  };

  const handlePriceChange = (price: PriceFilter) => {
    setDraftFilters({ 
      ...draftFilters, 
      price,
      customPriceRange: price === 'custom' ? draftFilters.customPriceRange || { min: 0, max: 2000 } : undefined
    });
  };

  const handleCustomPriceChange = (type: 'min' | 'max', value: number) => {
    const currentRange = draftFilters.customPriceRange || { min: 0, max: 2000 };
    setDraftFilters({
      ...draftFilters,
      price: 'custom',
      customPriceRange: {
        ...currentRange,
        [type]: value
      }
    });
  };

  const handleEventTypeChange = (eventType: EventTypeFilter) => {
    setDraftFilters({ ...draftFilters, eventType });
  };

  return (
    <Modal
      visible={isModalOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeFiltersModal}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t('filters.title')}</Text>
            {activeCount > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{activeCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={closeFiltersModal}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.date').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {DATE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.chip,
                    draftFilters.date === option.value && styles.chipActive
                  ]}
                  onPress={() => handleDateChange(option.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.date === option.value && styles.chipTextActive
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Date Picker */}
            {draftFilters.date === 'pick-date' && (
              <>
                {showDatePicker && (
                  <DateTimePicker
                    value={draftFilters.pickedDate ? new Date(draftFilters.pickedDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDatePicked}
                    minimumDate={new Date()}
                  />
                )}
                {draftFilters.pickedDate && !showDatePicker && (
                  <TouchableOpacity 
                    style={styles.selectedDateContainer}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.selectedDateText}>
                      {t('filters.selected')}: {new Date(draftFilters.pickedDate).toLocaleDateString(locale)}
                    </Text>
                    <Text style={styles.selectedDateHint}>{t('filters.tapToChange')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Event Type Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.eventType').toUpperCase()}</Text>
            <View style={styles.segmentedControl}>
              {EVENT_TYPE_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.segment,
                    index === 0 && styles.segmentFirst,
                    index === EVENT_TYPE_OPTIONS.length - 1 && styles.segmentLast,
                    draftFilters.eventType === option.value && styles.segmentActive
                  ]}
                  onPress={() => handleEventTypeChange(option.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      draftFilters.eventType === option.value && styles.segmentTextActive
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.price').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {priceOptions.map(option => {
                // Numeric buckets carry a currency-aware label (e.g. "≤ $5",
                // "> 500 HTG"); any/free/custom stay translated.
                const isBucket = option.value === '<=500' || option.value === '>500';
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      draftFilters.price === option.value && styles.chipActive
                    ]}
                    onPress={() => handlePriceChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draftFilters.price === option.value && styles.chipTextActive
                      ]}
                    >
                      {isBucket ? option.label : t(option.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Custom Price Range Slider */}
            {draftFilters.price === 'custom' && (
              <View style={styles.priceSliderContainer}>
                <View style={styles.priceRangeHeader}>
                  <Text style={styles.priceRangeLabel}>
                    {t('filters.min')}: {draftFilters.customPriceRange?.min || 0} {priceCurrencyCode}
                  </Text>
                  <Text style={styles.priceRangeLabel}>
                    {t('filters.max')}: {draftFilters.customPriceRange?.max || 2000} {priceCurrencyCode}
                  </Text>
                </View>
                
                <Text style={styles.sliderLabel}>{t('filters.minimumPrice')}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={2000}
                  step={50}
                  value={draftFilters.customPriceRange?.min || 0}
                  onValueChange={(value) => handleCustomPriceChange('min', value)}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
                
                <Text style={styles.sliderLabel}>{t('filters.maximumPrice')}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5000}
                  step={100}
                  value={draftFilters.customPriceRange?.max || 2000}
                  onValueChange={(value) => handleCustomPriceChange('max', value)}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
                />
              </View>
            )}
          </View>

          {/* Categories Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.categories').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.chip,
                    draftFilters.categories.includes(category) && styles.chipActive
                  ]}
                  onPress={() => handleCategoryToggle(category)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.categories.includes(category) && styles.chipTextActive
                    ]}
                  >
                    {getCategoryLabel(t, category)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.country').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {COUNTRIES.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.chip,
                    (draftFilters.country || 'HT') === country.code && styles.chipActive
                  ]}
                  onPress={() => setDraftFilters({ ...draftFilters, country: country.code, city: '' })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      (draftFilters.country || 'HT') === country.code && styles.chipTextActive
                    ]}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>{t('filters.city').toUpperCase()}</Text>
            <View style={styles.chipsRow}>
              {(CITIES_BY_COUNTRY[draftFilters.country || 'HT'] || []).map(city => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.chip,
                    draftFilters.city === city && styles.chipActive
                  ]}
                  onPress={() => handleCityChange(city)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.city === city && styles.chipTextActive
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom padding for footer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer with Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>{t('filters.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={applyFilters}
          >
            <Text style={styles.applyButtonText}>
              {t('filters.apply')} {activeCount > 0 ? `(${activeCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 30,
    color: colors.text,
    letterSpacing: 0.2,
  },
  activeBadge: {
    backgroundColor: colors.primary,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: {
    backgroundColor: colors.white,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentFirst: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentLast: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.surfaceRaised,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: colors.surface,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  selectedDateContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedDateHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceSliderContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
  },
  priceRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
