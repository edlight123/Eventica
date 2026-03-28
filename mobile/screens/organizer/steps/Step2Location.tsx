import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../contexts/I18nContext';
import { COUNTRIES, CITIES_BY_COUNTRY } from '../../../types/filters';
import type { EventDraft } from '../CreateEventFlowRefactored';

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step2Location({ draft, updateDraft }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t } = useI18n();
  const selectedCountry = (draft as any).country || 'HT';
  const cities = CITIES_BY_COUNTRY[selectedCountry] || [];

  const handleCountryChange = (countryCode: string) => {
    const newCities = CITIES_BY_COUNTRY[countryCode] || [];
    updateDraft({ 
      country: countryCode,
      city: newCities[0] || '',
      commune: ''
    } as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('organizerCreateEvent.location.title')}</Text>
      <Text style={styles.subtitle}>{t('organizerCreateEvent.location.subtitle')}</Text>

      {/* Country */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.country')} <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScroll}
        >
          {COUNTRIES.map((country) => (
            <TouchableOpacity
              key={country.code}
              style={[
                styles.cityChip,
                selectedCountry === country.code && styles.cityChipActive,
              ]}
              onPress={() => handleCountryChange(country.code)}
            >
              <Text
                style={[
                  styles.cityChipText,
                  selectedCountry === country.code && styles.cityChipTextActive,
                ]}
              >
                {country.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Venue Name */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.venueName')} <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder={t('organizerCreateEvent.location.venuePlaceholder')}
            value={draft.venue_name}
            onChangeText={(text) => updateDraft({ venue_name: text })}
          />
        </View>
      </View>

      {/* City */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.city')} <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScroll}
        >
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                draft.city === city && styles.cityChipActive,
              ]}
              onPress={() => updateDraft({ city })}
            >
              <Text
                style={[
                  styles.cityChipText,
                  draft.city === city && styles.cityChipTextActive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Commune */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.location.communeOptional')}</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="map-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder={t('organizerCreateEvent.location.communePlaceholder')}
            value={draft.commune}
            onChangeText={(text) => updateDraft({ commune: text })}
          />
        </View>
      </View>

      {/* Address */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.location.streetAddress')} <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder={t('organizerCreateEvent.location.addressPlaceholder')}
            value={draft.address}
            onChangeText={(text) => updateDraft({ address: text })}
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          {t('organizerCreateEvent.location.infoText')}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -12,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  cityScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  cityChipTextActive: {
    color: colors.white,
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
});
