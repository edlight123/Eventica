import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { RADIUS } from '../../config/brand';
import { font } from '../../theme/tokens';
import { formatCurrency } from '../../lib/currency';
import { safeFormatForLanguage } from '../../lib/dates';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import WhitePillCTA from '../../components/WhitePillCTA';
import SecondaryPill from '../../components/auth/SecondaryPill';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import { Tag } from 'lucide-react-native';
import { getEventById } from '../../lib/api/organizer';

type RouteParams = {
  OrganizerPromoCodes: {
    eventId: string;
  };
};

type DiscountType = 'percentage' | 'fixed';
type LimitType = 'limited' | 'unlimited';

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
  const styles = getStyles(colors);
  const route = useRoute<RouteProp<RouteParams, 'OrganizerPromoCodes'>>();
  const navigation = useNavigation<any>();
  const { eventId } = route.params;

  // Hide the default native nav bar — this screen renders its own serif
  // OrganizerScreenHeader, so the native "‹ Manage Event / Promo Codes" bar
  // would double up on top of it.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { t, language } = useI18n();
  const { userProfile } = useAuth();

  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';

  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventCurrency, setEventCurrency] = useState<string>('HTG');
  // Full event doc kept around so the per-code share message can enrich itself
  // with the event's date + location (guarded — a sparse event still shares).
  const [eventData, setEventData] = useState<any>(null);
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [limitType, setLimitType] = useState<LimitType>('unlimited');
  const [maxUses, setMaxUses] = useState('');
  // Expiry is optional; null means "no expiry". Stored as a Date, serialized to
  // an ISO string on create (the shape the create logic already expects).
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

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
      setEventCurrency(event?.currency || 'HTG');
      setEventData(event || null);
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
    setLimitType('unlimited');
    setMaxUses('');
    setExpiresAt(null);
    setShowExpiryPicker(false);
  };

  // Native date picker → store the picked Date (or dismiss). Mirrors the
  // iOS-keeps-open / Android-closes handling from components/EventFiltersSheet.tsx.
  const handleExpiryChange = (event: any, selectedDate?: Date) => {
    setShowExpiryPicker(Platform.OS === 'ios');
    if (event?.type === 'set' && selectedDate) {
      setExpiresAt(selectedDate);
    }
    if (Platform.OS === 'android') {
      setShowExpiryPicker(false);
    }
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

    // "Limited quantity" means the code is capped at the first N buyers; an
    // unlimited code never carries a cap (max_uses stays null).
    if (limitType === 'limited' && (maxUsesNum === null || maxUsesNum < 1)) {
      Alert.alert(t('common.error'), t('organizerPromoCodes.errors.invalidMaxUses'));
      return;
    }
    const finalMaxUses = limitType === 'limited' ? maxUsesNum : null;

    const expiresAtValue: string | null =
      expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toISOString() : null;

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
        max_uses: finalMaxUses,
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

  // The discount as a short, human fragment: "20% off" / "500.00 HTG off".
  const discountFragment = (promo: PromoCodeItem) => {
    if (promo.discount_type === 'percentage') {
      return t('organizerPromoCodes.share.percentOff').replace('{value}', String(promo.discount_value));
    }
    const amount = formatCurrency(promo.discount_value, eventCurrency);
    return t('organizerPromoCodes.share.amountOff').replace('{amount}', amount);
  };

  const handleShare = async (promo: PromoCodeItem) => {
    const discount = discountFragment(promo);
    const capped = promo.max_uses != null && promo.max_uses > 0;
    const atClause = eventTitle
      ? t('organizerPromoCodes.share.atEvent').replace('{event}', eventTitle)
      : '';
    const template = capped
      ? t('organizerPromoCodes.share.blurbFirstN')
      : t('organizerPromoCodes.share.blurbOpen');
    const promoLine = template
      .replace('{code}', String(promo.code || '').toUpperCase())
      .replace('{discount}', discount)
      .replace('{at}', atClause)
      .replace('{n}', String(promo.max_uses ?? ''));

    // Enrich with the event's own date · location, each part guarded so a sparse
    // event still shares cleanly.
    const when = eventData?.start_datetime
      ? safeFormatForLanguage(eventData.start_datetime, 'EEE, MMM d · h:mm a', language)
      : '';
    const whereRaw = [eventData?.venue_name, eventData?.city, eventData?.location].find(
      (v) => typeof v === 'string' && v.trim().length > 0
    );
    const where = typeof whereRaw === 'string' ? whereRaw.trim() : '';
    const meta = [when, where].filter(Boolean).join(' · ');

    // The canonical tikem.co event URL. Passed as Share's `url` too so iMessage /
    // WhatsApp render a rich Open Graph preview (this is how the event poster
    // surfaces in the share — the image can't be attached as bytes).
    const url = `https://www.tikem.co/events/${eventId}`;

    const body = [promoLine, meta].filter(Boolean).join('\n');
    const message = `${body}\n\n${url}`;

    try {
      await Share.share({ message, url });
    } catch (e) {
      console.warn('[promo-share] Share failed:', e);
    }
  };

  const renderDiscount = (promo: PromoCodeItem) => {
    if (promo.discount_type === 'percentage') {
      return `-${promo.discount_value}%`;
    }
    return `-${formatCurrency(promo.discount_value, eventCurrency)}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader
          title={t('organizerPromoCodes.title')}
          subtitle={eventTitle || undefined}
          onBack={() => navigation.goBack()}
        />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Skeleton width="100%" height={52} radius={RADIUS.lg} style={{ marginBottom: 16 }} />
            <Skeleton width={140} height={18} radius={6} style={{ marginBottom: 12 }} />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={120} radius={RADIUS.xl} style={{ marginBottom: 10 }} />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OrganizerScreenHeader
        title={t('organizerPromoCodes.title')}
        subtitle={eventTitle || undefined}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              <Text style={styles.formEyebrow}>{t('organizerPromoCodes.create.eyebrow')}</Text>
              <Text style={styles.formTitle}>{t('organizerPromoCodes.create.title')}</Text>

              <Text style={styles.label}>{t('organizerPromoCodes.fields.code')}</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder={t('organizerPromoCodes.placeholders.code')}
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
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
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
              />

              <Text style={styles.label}>{t('organizerPromoCodes.fields.quantity')}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleButton, limitType === 'unlimited' && styles.toggleButtonActive]}
                  onPress={() => setLimitType('unlimited')}
                >
                  <Text style={[styles.toggleButtonText, limitType === 'unlimited' && styles.toggleButtonTextActive]}>
                    {t('organizerPromoCodes.limitTypes.unlimited')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, limitType === 'limited' && styles.toggleButtonActive]}
                  onPress={() => setLimitType('limited')}
                >
                  <Text style={[styles.toggleButtonText, limitType === 'limited' && styles.toggleButtonTextActive]}>
                    {t('organizerPromoCodes.limitTypes.limited')}
                  </Text>
                </TouchableOpacity>
              </View>

              {limitType === 'limited' && (
                <>
                  <TextInput
                    style={[styles.input, styles.inputSpaced]}
                    value={maxUses}
                    onChangeText={setMaxUses}
                    keyboardType="numeric"
                    placeholder={t('organizerPromoCodes.placeholders.quantity')}
                    placeholderTextColor={colors.textTertiary}
                    selectionColor={colors.primary}
                  />
                  <Text style={styles.helperText}>
                    {t('organizerPromoCodes.create.limitHelper').replace('{n}', (maxUses || '200').trim())}
                  </Text>
                </>
              )}

              <Text style={styles.label}>{t('organizerPromoCodes.fields.expiresAt')}</Text>
              <View style={styles.dateFieldRow}>
                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setShowExpiryPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateFieldText, !expiresAt && styles.dateFieldPlaceholder]}>
                    {expiresAt
                      ? safeFormatForLanguage(expiresAt, 'EEE, MMM d, yyyy', language)
                      : t('organizerPromoCodes.placeholders.expiresAt')}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {expiresAt ? (
                  <TouchableOpacity
                    style={styles.dateClearButton}
                    onPress={() => setExpiresAt(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t('common.remove')}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {showExpiryPicker && (
                <DateTimePicker
                  value={expiresAt || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleExpiryChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={styles.formActions}>
                <SecondaryPill
                  style={styles.formActionPill}
                  label={t('common.cancel')}
                  onPress={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={saving}
                />
                <WhitePillCTA
                  style={styles.formActionPill}
                  label={saving ? t('organizerPromoCodes.create.creating') : t('organizerPromoCodes.create.create')}
                  onPress={handleCreate}
                  loading={saving}
                  disabled={saving}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('organizerPromoCodes.list.title')}</Text>

          {promoCodes.length === 0 ? (
            <EmptyState icon={Tag} title={t('organizerPromoCodes.list.empty')} compact />
          ) : (
            promoCodes.map((promo) => {
              const expiry = parseExpiresAt(promo.expires_at);
              const expiryText = expiry
                ? expiry.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
                : null;

              const used = promo.uses_count || 0;
              const cap = promo.max_uses;
              const capped = cap != null && cap > 0;
              const fullyClaimed = capped && used >= (cap as number);
              const pct = capped ? Math.min(100, Math.round((used / (cap as number)) * 100)) : 0;

              const claimedText = capped
                ? t('organizerPromoCodes.list.claimed')
                    .replace('{used}', String(used))
                    .replace('{total}', String(cap))
                : t('organizerPromoCodes.list.used').replace('{used}', String(used));

              return (
                <View key={promo.id} style={[styles.promoCard, fullyClaimed && styles.promoCardClaimed]}>
                  <View style={styles.promoHeader}>
                    <View style={styles.promoHeaderLeft}>
                      <Text style={styles.promoCode}>{String(promo.code || '').toUpperCase()}</Text>
                      <View style={styles.statusInline}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: !fullyClaimed && promo.is_active ? colors.primary : colors.textTertiary },
                          ]}
                        />
                        <Text style={styles.statusLabel}>
                          {fullyClaimed
                            ? t('organizerPromoCodes.list.fullyClaimed')
                            : promo.is_active
                              ? t('organizerPromoCodes.list.active')
                              : t('organizerPromoCodes.list.inactive')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.promoHeaderActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleShare(promo)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={t('organizerPromoCodes.share.action')}
                      >
                        <Ionicons name="share-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDelete(promo)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={t('organizerPromoCodes.delete.confirm')}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.promoDetail}>{renderDiscount(promo)}</Text>

                  <View style={styles.claimedRow}>
                    <Text style={styles.claimedText}>{claimedText}</Text>
                  </View>
                  {capped && (
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                  )}

                  {expiryText ? (
                    <Text style={styles.promoMeta}>
                      {t('organizerPromoCodes.list.expires')}: {expiryText}
                    </Text>
                  ) : null}

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

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 14,
  },
  createToggle: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.xl,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formEyebrow: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  formTitle: {
    fontFamily: font.serif,
    fontSize: 24,
    color: colors.text,
    marginBottom: 10,
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
  },
  inputSpaced: {
    marginTop: 10,
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateField: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateFieldText: {
    flex: 1,
    color: colors.text,
  },
  dateFieldPlaceholder: {
    color: colors.textTertiary,
  },
  dateClearButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  formActionPill: {
    flex: 1,
  },
  promoCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promoCardClaimed: {
    opacity: 0.6,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  promoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  promoHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promoCode: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.text,
  },
  iconButton: {
    padding: 6,
  },
  promoDetail: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },
  claimedRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimedText: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  promoMeta: {
    marginTop: 6,
    fontFamily: font.monoRegular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  promoActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontWeight: '700',
  },
  actionButtonTextPrimary: {
    color: colors.white,
  },
  actionButtonTextSecondary: {
    color: colors.textSecondary,
  },
});
