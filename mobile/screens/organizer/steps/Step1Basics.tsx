import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTheme } from '../../../contexts/ThemeContext';
import { useI18n } from '../../../contexts/I18nContext';
import type { EventDraft } from '../CreateEventFlowRefactored';

const CATEGORIES = [
  'Music', 'Sports', 'Arts', 'Business', 'Food & Drink',
  'Community', 'Education', 'Tech', 'Health', 'Other'
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

interface Props {
  draft: EventDraft;
  updateDraft: (updates: Partial<EventDraft>) => void;
}

export default function Step1Basics({ draft, updateDraft }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const getCategoryLabel = (categoryId: string) => {
    const key = CATEGORY_LABEL_KEYS[categoryId] || CATEGORY_LABEL_KEYS.Other;
    return t(key);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateDraft({ banner_image_url: result.assets[0].uri });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('organizerCreateEvent.basics.title')}</Text>
      <Text style={styles.subtitle}>{t('organizerCreateEvent.basics.subtitle')}</Text>

      {/* Image Upload */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('organizerCreateEvent.basics.eventImage')}</Text>
        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          {draft.banner_image_url ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: draft.banner_image_url }} style={styles.imagePreview} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={32} color={colors.white} />
                <Text style={styles.imageOverlayText}>{t('organizerCreateEvent.basics.changeImage')}</Text>
              </View>
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={48} color={colors.primary} />
              <Text style={styles.imageUploadText}>{t('organizerCreateEvent.basics.uploadImage')}</Text>
              <Text style={styles.imageUploadSubtext}>{t('organizerCreateEvent.basics.aspectRatio')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.basics.eventTitle')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder={t('organizerCreateEvent.basics.eventTitlePlaceholder')}
          value={draft.title}
          onChangeText={(text) => updateDraft({ title: text })}
          maxLength={100}
        />
        <Text style={styles.charCount}>{draft.title.length}/100</Text>
      </View>

      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.basics.category')} <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                draft.category === cat && styles.categoryChipActive,
              ]}
              onPress={() => updateDraft({ category: cat })}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  draft.category === cat && styles.categoryChipTextActive,
                ]}
              >
                {getCategoryLabel(cat)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>
          {t('organizerCreateEvent.basics.description')} <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('organizerCreateEvent.basics.descriptionPlaceholder')}
          value={draft.description}
          onChangeText={(text) => updateDraft({ description: text })}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={2000}
        />
        <Text style={styles.charCount}>{draft.description.length}/2000</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
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
  imageUploadButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 180,
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
});
