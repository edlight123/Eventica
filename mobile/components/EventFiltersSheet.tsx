import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  TextInput,
  PanResponder,
  LayoutChangeEvent
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X } from 'lucide-react-native';
import { useFilters } from '../contexts/FiltersContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { 
  CATEGORIES,
  COUNTRIES,
  CITIES_BY_COUNTRY,
  CURRENCY_BY_COUNTRY,
  DATE_OPTIONS,
  EVENT_TYPE_OPTIONS,
  DateFilter,
  PriceFilter,
  EventTypeFilter
} from '../types/filters';
import { useTheme } from '../contexts/ThemeContext';

type RangeSliderProps = {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
  colors: ReturnType<typeof useTheme>['colors'];
};

/**
 * A pure-JS dual-thumb range slider — min + max on ONE track. Built with
 * PanResponder so it needs no native module (the installed
 * @react-native-community/slider is single-thumb only, which is why the price
 * range used to be two stacked sliders). OTA-safe.
 */
function RangeSlider({ min, max, step, low, high, onChange, colors }: RangeSliderProps) {
  const THUMB = 26;
  const [trackW, setTrackW] = useState(0);
  const usable = Math.max(1, trackW - THUMB);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const valueToX = (v: number, u: number) => ((clamp(v, min, max) - min) / (max - min || 1)) * u;
  const xToValue = (x: number, u: number) => {
    const raw = min + (clamp(x, 0, u) / u) * (max - min);
    return clamp(Math.round(raw / step) * step, min, max);
  };

  // The PanResponders are created once; refs feed them the latest values so
  // their closures never go stale.
  const refs = useRef({ low, high, usable, onChange }).current;
  refs.low = low;
  refs.high = high;
  refs.usable = usable;
  refs.onChange = onChange;
  const startVal = useRef(0);

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal.current = refs.low;
      },
      onPanResponderMove: (_e, g) => {
        const u = refs.usable;
        const v = Math.min(xToValue(valueToX(startVal.current, u) + g.dx, u), refs.high);
        refs.onChange(v, refs.high);
      },
    }),
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal.current = refs.high;
      },
      onPanResponderMove: (_e, g) => {
        const u = refs.usable;
        const v = Math.max(xToValue(valueToX(startVal.current, u) + g.dx, u), refs.low);
        refs.onChange(refs.low, v);
      },
    }),
  ).current;

  const lowX = valueToX(low, usable);
  const highX = valueToX(high, usable);

  return (
    <View style={rangeStyles.wrap} onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}>
      <View style={[rangeStyles.track, { backgroundColor: colors.border }]} />
      <View
        style={[
          rangeStyles.fill,
          { backgroundColor: colors.primary, left: lowX + THUMB / 2, width: Math.max(0, highX - lowX) },
        ]}
      />
      <View
        {...lowPan.panHandlers}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[rangeStyles.thumb, { left: lowX, backgroundColor: colors.primary, borderColor: colors.background }]}
      />
      <View
        {...highPan.panHandlers}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[rangeStyles.thumb, { left: highX, backgroundColor: colors.primary, borderColor: colors.background }]}
      />
    </View>
  );
}

const rangeStyles = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center', marginTop: 6, marginBottom: 2 },
  track: { height: 4, borderRadius: 2, marginHorizontal: 13 },
  fill: { position: 'absolute', top: 20, height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', top: 9, width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
});

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
  const priceCurrencyCode = CURRENCY_BY_COUNTRY[filterCountry]?.code || 'HTG';
  const priceCurrencySymbol = CURRENCY_BY_COUNTRY[filterCountry]?.symbol || 'HTG';

  // The custom min–max range is now the STANDARD price control. Its ceiling and
  // step scale with the selected country's currency (low-denomination HTG/DOP
  // need a higher ceiling than USD/CAD/EUR).
  const isHighDenomination = priceCurrencyCode === 'HTG' || priceCurrencyCode === 'DOP';
  const priceCeiling = isHighDenomination ? 10000 : 200;
  const priceStep = isHighDenomination ? 100 : 5;

  const formatPrice = (amount: number) =>
    priceCurrencySymbol === 'HTG' || priceCurrencySymbol === 'RD$'
      ? `${amount} ${priceCurrencySymbol}`
      : `${priceCurrencySymbol}${amount}`;

  const priceIsCustom = draftFilters.price === 'custom';
  const rangeMin = priceIsCustom ? draftFilters.customPriceRange?.min ?? 0 : 0;
  const rawMax = priceIsCustom ? draftFilters.customPriceRange?.max ?? priceCeiling : priceCeiling;
  // An upper bound at (or above) the ceiling means "and up" — stored as Infinity
  // so applyFilters imposes no maximum.
  const maxIsOpen = !Number.isFinite(rawMax) || rawMax >= priceCeiling;
  const sliderMax = maxIsOpen ? priceCeiling : rawMax;
  const rangeReadout =
    draftFilters.price === 'free'
      ? t('filters.priceOptions.free')
      : !priceIsCustom
        ? t('filters.priceOptions.any')
        : maxIsOpen
          ? `${formatPrice(rangeMin)}+`
          : `${formatPrice(rangeMin)} – ${formatPrice(sliderMax)}`;

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

  // Single dual-thumb range handler. Dragging either thumb switches the price
  // filter to the custom standard. At the ceiling the max is open-ended
  // (Infinity) so pricey tickets aren't excluded ("min+" readout).
  const handleRange = (lo: number, hi: number) => {
    const nextMax = hi >= priceCeiling ? Number.POSITIVE_INFINITY : hi;
    setDraftFilters({
      ...draftFilters,
      price: 'custom',
      customPriceRange: { min: lo, max: nextMax },
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

          {/* Price Filter — the custom min–max range is the standard control.
              "Any" and "Free" remain as quick shortcuts. */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('filters.price').toUpperCase()}</Text>

            <View style={styles.chipsRow}>
              {(['any', 'free'] as const).map(value => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, draftFilters.price === value && styles.chipActive]}
                  onPress={() => handlePriceChange(value)}
                >
                  <Text
                    style={[styles.chipText, draftFilters.price === value && styles.chipTextActive]}
                  >
                    {t(`filters.priceOptions.${value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.priceRangeCard}>
              <View style={styles.priceRangeTop}>
                <View style={styles.priceRangeTopText}>
                  <Text style={styles.priceRangeCaption}>{t('filters.priceRange')}</Text>
                  <Text style={styles.priceRangeValue}>{rangeReadout}</Text>
                </View>
                <Text style={styles.priceRangeCurrency}>{priceCurrencyCode}</Text>
              </View>

              <RangeSlider
                min={0}
                max={priceCeiling}
                step={priceStep}
                low={rangeMin}
                high={sliderMax}
                onChange={handleRange}
                colors={colors}
              />

              <Text style={styles.priceRangeHint}>{t('filters.priceRangeHint')}</Text>
            </View>
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
  priceRangeCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
  },
  priceRangeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceRangeTopText: {
    flex: 1,
  },
  priceRangeCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  priceRangeValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  priceRangeCurrency: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceRangeHint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
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
