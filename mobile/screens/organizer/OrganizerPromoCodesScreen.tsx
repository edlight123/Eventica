import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { getEventById } from '../../lib/api/organizer';

type RouteParams = {
  OrganizerPromoCodes: {
    eventId: string;
  };
};

type DiscountType = 'percentage' | 'fixed';

type PromoCodeDoc = {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | Timestamp | null;
  event_id: string;
  organizer_id?: string | null;
};

type PromoCodeItem = PromoCodeDoc & { id: string };

function parseExpiresAt(value: PromoCodeDoc['expires_at']): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function normalizeNumber(value: string): number | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function OrganizerPromoCodesScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'OrganizerPromoCodes'>>();
  const { eventId } = route.params;

  const { t, language } = useI18n();
  const { userProfile } = useAuth();

  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';

  const [eventTitle, setEventTitle] = useState<string>('');
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const promoCodesCollection = useMemo(() => collection(db, 'promo_codes'), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [event, promos] = await Promise.all([
        getEventById(eventId),
        (async () => {
          const q = query(promoCodesCollection, where('event_id', '==', eventId));
          const snap = await getDocs(q);
          const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as PromoCodeDoc) }));
          rows.sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
          return rows as PromoCodeItem[];
        })(),
      ]);

      setEventTitle(event?.title || '');
      setPromoCodes(promos);
    } catch (e) {
      console.error('Failed to load promo codes', e);
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [eventId, promoCodesCollection, t]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const resetForm = () => {
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMaxUses('');
    setExpiresAt('');
  };

  const handleCreate = async () => {
    const trimmedCode = (code || '').trim().toUpperCase();
    const discount = normalizeNumber(discountValue);
    const maxUsesNum = normalizeNumber(maxUses);

    if (!trimmedCode || discount === null) {
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.missingFields'));
      return;
    }

    if (discount <= 0) {
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.invalidDiscount'));
      return;
    }

    if (maxUses && (maxUsesNum === null || maxUsesNum < 1)) {
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.invalidMaxUses'));
      return;
    }

    let expiresAtValue: string | null = null;
    if ((expiresAt || '').trim()) {
      const parsed = new Date(expiresAt.trim());
      if (Number.isNaN(parsed.getTime())) {
        Alert.alert(t('common.error'), t('organizerPromoCodes.errors.invalidExpiresAt'));
        return;
      }
      expiresAtValue = parsed.toISOString();
    }

    const exists = promoCodes.some((p) => String(p.code || '').toUpperCase() === trimmedCode);
    if (exists) {
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.duplicateCode'));
      return;
    }

    setSaving(true);
    try {
      await addDoc(promoCodesCollection, {
        code: trimmedCode,
        event_id: eventId,
        organizer_id: userProfile?.id || null,
        discount_type: discountType,
        discount_value: discount,
        max_uses: maxUsesNum ?? null,
        expires_at: expiresAtValue,
        is_active: true,
        uses_count: 0,
        created_at: new Date().toISOString(),
      } as any);

      resetForm();
      setShowForm(false);
      await load();
    } catch (e) {
      console.error('Failed to create promo code', e);
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.createFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo: PromoCodeItem) => {
    try {
      await updateDoc(doc(db, 'promo_codes', promo.id), { is_active: !promo.is_active });
      setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, is_active: !promo.is_active } : p)));
    } catch (e) {
      console.error('Failed to toggle promo code', e);
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.updateFailed'));
    }
  };

  const handleDelete = async (promo: PromoCodeItem) => {
    Alert.alert(t('organizerPromoCodes.delete.title'), t('organizerPromoCodes.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('organizerPromoCodes.delete.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'promo_codes', promo.id));
            setPromoCodes((prev) => prev.filter((p) => p.id !== promo.id));
          } catch (e) {
            console.error('Failed to delete promo code', e);
            Alert.alert(t('common.error'), t('organizerPromoCodes.errors.deleteFailed'));
          }
        },
      },
    ]);
  };

  const renderDiscount = (promo: PromoCodeItem) => {
    if (promo.discount_type === 'percentage') {
      return `-${promo.discount_value}%`;
    }

    try {
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(promo.discount_value);
      return `-${formatted}`;
    } catch {
      return `-${promo.discount_value}`;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerPromoCodes.loading')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>{t('organizerPromoCodes.title')}</Text>
          {!!eventTitle && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {eventTitle}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.createToggle} onPress={() => setShowForm((v) => !v)} activeOpacity={0.8}>
            <View style={styles.createToggleLeft}>
              <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
              <Text style={styles.createToggleText}>
                {showForm ? t('organizerPromoCodes.create.hide') : t('organizerPromoCodes.create.show')}
              </Text>
            </View>
            <Ionicons name={showForm ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{t('organizerPromoCodes.create.title')}</Text>

              <Text style={styles.label}>{t('organizerPromoCodes.fields.code')}</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder={t('organizerPromoCodes.placeholders.code')}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>{t('organizerPromoCodes.fields.discountType')}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, discountType === 'percentage' && styles.toggleButtonActive]}
                  onPress={() => setDiscountType('percentage')}
                >
                  <Text style={[styles.toggleButtonText, discountType === 'percentage' && styles.toggleButtonTextActive]}>
                    {t('organizerPromoCodes.discountTypes.percentage')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, discountType === 'fixed' && styles.toggleButtonActive]}
                  onPress={() => setDiscountType('fixed')}
                >
                  <Text style={[styles.toggleButtonText, discountType === 'fixed' && styles.toggleButtonTextActive]}>
                    {t('organizerPromoCodes.discountTypes.fixed')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('organizerPromoCodes.fields.discountValue')}</Text>
              <TextInput
                style={styles.input}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="numeric"
                placeholder={t('organizerPromoCodes.placeholders.discountValue')}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>{t('organizerPromoCodes.fields.maxUses')}</Text>
              <TextInput
                style={styles.input}
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="numeric"
                placeholder={t('organizerPromoCodes.placeholders.maxUses')}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.label}>{t('organizerPromoCodes.fields.expiresAt')}</Text>
              <TextInput
                style={styles.input}
                value={expiresAt}
                onChangeText={setExpiresAt}
                placeholder={t('organizerPromoCodes.placeholders.expiresAt')}
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.formButtonSecondary]}
                  onPress={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={saving}
                >
                  <Text style={[styles.formButtonText, styles.formButtonTextSecondary]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, saving && styles.formButtonDisabled]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Text style={styles.formButtonText}>
                    {saving ? t('organizerPromoCodes.create.creating') : t('organizerPromoCodes.create.create')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('organizerPromoCodes.list.title')}</Text>

          {promoCodes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('organizerPromoCodes.list.empty')}</Text>
            </View>
          ) : (
            promoCodes.map((promo) => {
              const expiry = parseExpiresAt(promo.expires_at);
              const expiryText = expiry
                ? expiry.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
                : null;

              const maxUsesText = promo.max_uses ? String(promo.max_uses) : t('organizerPromoCodes.list.unlimited');
              const usesText = `${promo.uses_count || 0} / ${maxUsesText}`;

              return (
                <View key={promo.id} style={styles.promoCard}>
                  <View style={styles.promoHeader}>
                    <View style={styles.promoHeaderLeft}>
                      <Text style={styles.promoCode}>{String(promo.code || '').toUpperCase()}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: promo.is_active ? `${colors.success}20` : `${colors.textSecondary}20` },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: promo.is_active ? colors.success : colors.textSecondary }]}>
                          {promo.is_active ? t('organizerPromoCodes.list.active') : t('organizerPromoCodes.list.inactive')}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(promo)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.promoDetail}>{renderDiscount(promo)}</Text>
                  <Text style={styles.promoMeta}>
                    {t('organizerPromoCodes.list.uses')}: {usesText}
                    {expiryText ? ` • ${t('organizerPromoCodes.list.expires')}: ${expiryText}` : ''}
                  </Text>

                  <View style={styles.promoActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, promo.is_active ? styles.actionButtonSecondary : styles.actionButtonPrimary]}
                      onPress={() => handleToggleActive(promo)}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          promo.is_active ? styles.actionButtonTextSecondary : styles.actionButtonTextPrimary,
                        ]}
                      >
                        {promo.is_active ? t('organizerPromoCodes.list.deactivate') : t('organizerPromoCodes.list.activate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  createToggle: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createToggleText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  toggleButtonActive: {
    backgroundColor: `${colors.primary}20`,
  },
  toggleButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.primary,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  formButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    minWidth: 110,
    alignItems: 'center',
  },
  formButtonSecondary: {
    backgroundColor: colors.background,
  },
  formButtonDisabled: {
    opacity: 0.6,
  },
  formButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  formButtonTextSecondary: {
    color: colors.text,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  promoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  promoCode: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconButton: {
    padding: 6,
  },
  promoDetail: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  promoMeta: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  promoActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: `${colors.primary}20`,
  },
  actionButtonText: {
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: colors.white,
  },
  actionButtonTextSecondary: {
    color: colors.primary,
  },
});
