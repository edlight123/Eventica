import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Check, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useFilters } from '../contexts/FiltersContext';
import { COUNTRIES, getFeaturedCities } from '../types/filters';
import { RADIUS, SPACING } from '../config/brand';

interface LocationPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Currently selected city ('' = all areas). */
  selectedCity?: string;
  /** Called with the chosen city ('' means "all areas" in the country). */
  onSelect: (city: string) => void;
}

/**
 * Bottom-sheet location picker. Location is the primary way people browse here
 * (Haiti-first), so tapping the header location opens this to switch country
 * and jump to a town.
 */
export default function LocationPickerSheet({
  visible,
  onClose,
  selectedCity = '',
  onSelect,
}: LocationPickerSheetProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { userCountry, setUserCountry } = useFilters();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  const cities = getFeaturedCities(userCountry);

  const renderCityRow = (label: string, value: string) => {
    const active = selectedCity === value;
    return (
      <TouchableOpacity
        key={value || '__all__'}
        style={[styles.cityRow, active && styles.cityRowActive]}
        onPress={() => onSelect(value)}
        activeOpacity={0.8}
      >
        <MapPin size={18} color={active ? colors.primary : colors.textSecondary} />
        <Text style={[styles.cityText, active && styles.cityTextActive]}>{label}</Text>
        {active && <Check size={18} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('location.title')}</Text>
            <Text style={styles.subtitle}>{t('location.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Country switcher */}
        <Text style={styles.sectionLabel}>{t('location.country').toUpperCase()}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.countryRow}
        >
          {COUNTRIES.map((c) => {
            const active = userCountry === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryChip, active && styles.countryChipActive]}
                onPress={() => setUserCountry(c.code)}
                activeOpacity={0.8}
              >
                <Text style={[styles.countryChipText, active && styles.countryChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Cities */}
        <Text style={styles.sectionLabel}>{t('location.area').toUpperCase()}</Text>
        <ScrollView style={styles.cityList} showsVerticalScrollIndicator={false}>
          {renderCityRow(t('location.allAreas'), '')}
          {cities.map((city) => renderCityRow(city, city))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      paddingHorizontal: SPACING.lg,
      paddingTop: 10,
      maxHeight: '80%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    countryRow: {
      gap: SPACING.sm,
      paddingBottom: 4,
    },
    countryChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    countryChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    countryChipText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    countryChipTextActive: {
      color: colors.white,
    },
    cityList: {
      marginTop: 14,
      marginBottom: 4,
    },
    cityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: 'transparent',
      marginBottom: 8,
      backgroundColor: colors.surfaceMuted,
    },
    cityRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    cityText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cityTextActive: {
      color: colors.primarySoftText,
      fontWeight: '700',
    },
  });
