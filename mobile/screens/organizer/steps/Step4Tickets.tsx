import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../contexts/I18nContext';
import type { EventDraft } from '../CreateEventFlowRefactored';

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step4Tickets({ draft, updateDraft }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const addTier = () => {
    const newTiers = [...draft.ticket_tiers, { name: '', price: '', quantity: '' }];
    updateDraft({ ticket_tiers: newTiers });
  };

  const removeTier = (index: number) => {
    if (draft.ticket_tiers.length > 1) {
      const newTiers = draft.ticket_tiers.filter((_, i) => i !== index);
      updateDraft({ ticket_tiers: newTiers });
    }
  };

  const updateTier = (index: number, field: string, value: string) => {
    const newTiers = [...draft.ticket_tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    updateDraft({ ticket_tiers: newTiers });
  };

  const getCurrencySymbol = () => (draft.currency === 'HTG' ? 'HTG' : '$');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('organizerCreateEvent.tickets.title')}</Text>
      <Text style={styles.subtitle}>{t('organizerCreateEvent.tickets.subtitle')}</Text>

      {/* Currency Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.tickets.currency')} <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.currencyRow}>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              draft.currency === 'USD' && styles.currencyButtonActive,
            ]}
            onPress={() => updateDraft({ currency: 'USD' })}
          >
            <Text
              style={[
                styles.currencyButtonText,
                draft.currency === 'USD' && styles.currencyButtonTextActive,
              ]}
            >
              {t('organizerCreateEvent.tickets.currencyUsd')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.currencyButton,
              draft.currency === 'HTG' && styles.currencyButtonActive,
            ]}
            onPress={() => updateDraft({ currency: 'HTG' })}
          >
            <Text
              style={[
                styles.currencyButtonText,
                draft.currency === 'HTG' && styles.currencyButtonTextActive,
              ]}
            >
              {t('organizerCreateEvent.tickets.currencyHtg')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket Tiers */}
      {draft.ticket_tiers.map((tier, index) => (
        <View key={index} style={styles.tierCard}>
          <View style={styles.tierHeader}>
            <Text style={styles.tierTitle}>
              {t('organizerCreateEvent.tickets.tier')} {index + 1}
            </Text>
            {draft.ticket_tiers.length > 1 && (
              <TouchableOpacity onPress={() => removeTier(index)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tierFormGroup}>
            <Text style={styles.tierLabel}>{t('organizerCreateEvent.tickets.tierName')} *</Text>
            <TextInput
              style={styles.tierInput}
              placeholder={t('organizerCreateEvent.tickets.tierNamePlaceholder')}
              value={tier.name}
              onChangeText={(text) => updateTier(index, 'name', text)}
            />
          </View>

          <View style={styles.tierRow}>
            <View style={[styles.tierFormGroup, styles.tierFormGroupHalf]}>
              <Text style={styles.tierLabel}>
                {t('organizerCreateEvent.tickets.price')} ({getCurrencySymbol()}) *
              </Text>
              <TextInput
                style={styles.tierInput}
                placeholder={t('organizerCreateEvent.tickets.pricePlaceholder')}
                value={tier.price}
                onChangeText={(text) => updateTier(index, 'price', text)}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.tierFormGroup, styles.tierFormGroupHalf]}>
              <Text style={styles.tierLabel}>{t('organizerCreateEvent.tickets.quantity')} *</Text>
              <TextInput
                style={styles.tierInput}
                placeholder={t('organizerCreateEvent.tickets.quantityPlaceholder')}
                value={tier.quantity}
                onChangeText={(text) => updateTier(index, 'quantity', text)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      ))}

      {/* Add Tier Button */}
      <TouchableOpacity style={styles.addTierButton} onPress={addTier}>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
        <Text style={styles.addTierText}>{t('organizerCreateEvent.tickets.addTier')}</Text>
      </TouchableOpacity>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          {t('organizerCreateEvent.tickets.infoText')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
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
  currencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  tierFormGroup: {
    marginBottom: 12,
  },
  tierFormGroupHalf: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  tierInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 12,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
});
