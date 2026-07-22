import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Briefcase, ChevronDown, ChevronRight, Compass, ExternalLink, Heart, LogOut, MapPin, Settings, User, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';

import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { useI18n } from '../contexts/I18nContext';
import { useFilters } from '../contexts/FiltersContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isDemoMode, storage } from '../config/firebase';
import { SHADOWS, RADIUS } from '../config/brand';
import { getStaffEventIds } from '../lib/staffAssignments';
import { getVerificationRequest, type VerificationRequest } from '../lib/verification';
import { useNavigation } from '@react-navigation/native';
import { CITIES_BY_COUNTRY, COUNTRIES } from '../types/filters';
import { updateSocialProfile } from '../lib/api/social';
import {
  DEFAULT_PRIVACY,
  normalizeSocialHandle,
  type AttendanceVisibility,
  type ProfileVisibility,
} from '../types/social';
import StatTriplet from '../components/StatTriplet';
import VerifiedBadge from '../components/VerifiedBadge';
import StatusChip from '../components/StatusChip';
import PosterEventCard from '../components/PosterEventCard';
import EmptyState from '../components/EmptyState';

const WEBSITE_BASE_URL = 'https://tikem.co';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Two-column poster wall inside the 16px-padded scroll content (12px gutter).
const PROFILE_POSTER_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const navigation: any = useNavigation();
  const { user, userProfile, signOut, updateUserProfile, refreshUserProfile } = useAuth();
  const { mode, setMode } = useAppMode();
  const { language, setLanguage, t } = useI18n();
  const { setUserCountry, applyFiltersDirectly, appliedFilters } = useFilters();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editedName, setEditedName] = useState(userProfile?.full_name || '');
  const [editedCity, setEditedCity] = useState(userProfile?.default_city || '');
  const [editedCountry, setEditedCountry] = useState(userProfile?.default_country || 'HT');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Social profile + privacy (edited together with the rest of the profile form)
  const [editedBio, setEditedBio] = useState(userProfile?.bio || '');
  const [editedInstagram, setEditedInstagram] = useState(userProfile?.social_links?.instagram || '');
  const [editedTiktok, setEditedTiktok] = useState(userProfile?.social_links?.tiktok || '');
  const [editedTwitter, setEditedTwitter] = useState(userProfile?.social_links?.twitter || '');
  const [editedFacebook, setEditedFacebook] = useState(userProfile?.social_links?.facebook || '');
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    userProfile?.privacy?.profile_visibility || DEFAULT_PRIVACY.profile_visibility
  );
  const [attendanceVisibility, setAttendanceVisibility] = useState<AttendanceVisibility>(
    userProfile?.privacy?.attendance_visibility || DEFAULT_PRIVACY.attendance_visibility
  );
  const [discoverableByPhone, setDiscoverableByPhone] = useState<boolean>(
    userProfile?.privacy?.discoverable_by_phone ?? DEFAULT_PRIVACY.discoverable_by_phone
  );

  const [phonePrefix, setPhonePrefix] = useState<'+509' | '+1'>('+509');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [verificationStatus, setVerificationStatus] = useState<VerificationRequest | null>(null);
  const [accountStats, setAccountStats] = useState({ eventsAttended: 0, following: 0, followers: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  // The poster wall — every event this user holds a ticket to (newest first).
  // Gives the profile a POSH poster-forward identity instead of a settings list.
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [staffEventIds, setStaffEventIdsState] = useState<string[]>([]);

  const parsePhone = useCallback((raw: string) => {
    const normalized = String(raw || '').trim();
    if (normalized.startsWith('+1')) {
      setPhonePrefix('+1');
      setPhoneDigits(normalized.replace(/^\+1\s*/, '').replace(/\D/g, ''));
      return;
    }
    if (normalized.startsWith('+509')) {
      setPhonePrefix('+509');
      setPhoneDigits(normalized.replace(/^\+509\s*/, '').replace(/\D/g, ''));
      return;
    }

    // Default to Haiti prefix
    setPhonePrefix('+509');
    setPhoneDigits(normalized.replace(/\D/g, ''));
  }, []);

  const canUseOrganizerMode =
    userProfile?.role === 'organizer' ||
    userProfile?.role === 'admin' ||
    verificationStatus?.status === 'approved';
  const canUseStaffTools = staffEventIds.length > 0;

  const displayName = useMemo(() => {
    const name = (userProfile?.full_name || '').trim();
    return name.length ? name : user?.email || '';
  }, [userProfile?.full_name, user?.email]);

  const locationLabel = useMemo(() => {
    const city = (userProfile?.default_city || '').trim();
    return city.length ? city : t('profile.notSet');
  }, [userProfile?.default_city, t]);

  const openWebUrl = useCallback(
    async (url: string) => {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          Alert.alert(t('common.error'), t('organizerEarnings.errors.unableToOpenLinkTitle'));
          return;
        }
        await Linking.openURL(url);
      } catch {
        Alert.alert(t('common.error'), t('organizerEarnings.errors.unableToOpenLinkTitle'));
      }
    },
    [t]
  );

  const loadVerificationStatus = useCallback(async () => {
    if (!user?.uid) {
      setVerificationStatus(null);
      return;
    }

    try {
      const req = await getVerificationRequest(user.uid);
      setVerificationStatus(req);
    } catch {
      setVerificationStatus(null);
    }
  }, [user?.uid]);

  const loadStaffIds = useCallback(async () => {
    try {
      const ids = await getStaffEventIds();
      setStaffEventIdsState(ids);
    } catch {
      setStaffEventIdsState([]);
    }
  }, []);

  const loadAccountStats = useCallback(async () => {
    if (!user?.uid) {
      setAccountStats({ eventsAttended: 0, following: 0, followers: 0 });
      setMyEvents([]);
      setStatsLoaded(true);
      return;
    }

    try {
      const followsRef = collection(db, 'organizer_follows');

      const [followingSnap, followersSnap] = await Promise.all([
        getDocs(query(followsRef, where('follower_id', '==', user.uid))),
        getDocs(query(followsRef, where('organizer_id', '==', user.uid))),
      ]);

      const ticketsSnap = await getDocs(query(collection(db, 'tickets'), where('user_id', '==', user.uid)));
      const ticketDocs = ticketsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      const eventIds = Array.from(new Set(ticketDocs.map((t) => String(t.event_id || '')).filter(Boolean)));

      let attended = 0;
      let posterEvents: any[] = [];
      if (eventIds.length) {
        const now = new Date();
        const eventSnaps = await Promise.all(
          eventIds.map((eventId) => getDocs(query(collection(db, 'events'), where('__name__', '==', eventId))))
        );

        // Normalize dates once so downstream cards get real Date objects (guarded).
        const toDate = (v: any): Date | null =>
          v?.toDate ? v.toDate() : v ? new Date(v) : null;

        const events = eventSnaps
          .map((s) => {
            if (s.empty) return null;
            const raw = { id: s.docs[0].id, ...s.docs[0].data() } as any;
            return {
              ...raw,
              start_datetime: toDate(raw.start_datetime),
              end_datetime: toDate(raw.end_datetime),
            };
          })
          .filter(Boolean) as any[];

        attended = events.filter((e) => {
          const cutoff = e.end_datetime || e.start_datetime;
          return cutoff && cutoff < now;
        }).length;

        // Poster wall: newest first, undated events sink to the bottom.
        posterEvents = [...events].sort((a, b) => {
          const at = a.start_datetime ? a.start_datetime.getTime() : 0;
          const bt = b.start_datetime ? b.start_datetime.getTime() : 0;
          return bt - at;
        });
      }

      setMyEvents(posterEvents);
      setAccountStats({
        eventsAttended: attended,
        following: followingSnap.size,
        followers: followersSnap.size,
      });
    } catch {
      setAccountStats({ eventsAttended: 0, following: 0, followers: 0 });
      setMyEvents([]);
    } finally {
      setStatsLoaded(true);
    }
  }, [user?.uid]);

  const refreshAll = useCallback(async () => {
    if (!user?.uid) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refreshUserProfile(),
        loadVerificationStatus(),
        loadAccountStats(),
        loadStaffIds(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadAccountStats, loadStaffIds, loadVerificationStatus, refreshUserProfile, user?.uid]);

  useEffect(() => {
    loadVerificationStatus();
    loadAccountStats();
    loadStaffIds();
  }, [loadAccountStats, loadStaffIds, loadVerificationStatus]);

  useEffect(() => {
    if (!isEditing) {
      setEditedName(userProfile?.full_name || '');
      setEditedCity(userProfile?.default_city || '');
      setEditedCountry(userProfile?.default_country || 'HT');
      parsePhone(userProfile?.phone_number || '');
      setEditedBio(userProfile?.bio || '');
      setEditedInstagram(userProfile?.social_links?.instagram || '');
      setEditedTiktok(userProfile?.social_links?.tiktok || '');
      setEditedTwitter(userProfile?.social_links?.twitter || '');
      setEditedFacebook(userProfile?.social_links?.facebook || '');
      setProfileVisibility(userProfile?.privacy?.profile_visibility || DEFAULT_PRIVACY.profile_visibility);
      setAttendanceVisibility(userProfile?.privacy?.attendance_visibility || DEFAULT_PRIVACY.attendance_visibility);
      setDiscoverableByPhone(userProfile?.privacy?.discoverable_by_phone ?? DEFAULT_PRIVACY.discoverable_by_phone);
    }
  }, [isEditing, parsePhone, userProfile?.default_city, userProfile?.default_country, userProfile?.full_name, userProfile?.phone_number, userProfile?.bio, userProfile?.social_links?.instagram, userProfile?.social_links?.tiktok, userProfile?.social_links?.twitter, userProfile?.social_links?.facebook, userProfile?.privacy?.profile_visibility, userProfile?.privacy?.attendance_visibility, userProfile?.privacy?.discoverable_by_phone]);

  // Get cities for selected country
  const citiesForCountry = useMemo(() => {
    return CITIES_BY_COUNTRY[editedCountry] || CITIES_BY_COUNTRY['HT'] || [];
  }, [editedCountry]);

  const allCities = useMemo(() => {
    return citiesForCountry;
  }, [citiesForCountry]);

  const filteredCities = useMemo(() => {
    const q = editedCity.trim().toLowerCase();
    if (!q) return [];
    return allCities
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allCities, editedCity]);

  const pickAndUploadAvatar = useCallback(async () => {
    if (!user?.uid) return;

    if (isDemoMode) {
      Alert.alert(t('common.error'), 'Avatar upload is disabled in demo mode.');
      return;
    }

    try {
      setUploadingPhoto(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('common.error'), 'Photo permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      const res = await fetch(uri);
      const blob = await res.blob();

      const path = `profile-images/${user.uid}/avatar_${Date.now()}.jpg`;
      const fileRef = storageRef(storage, path);

      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      await updateUserProfile({ photo_url: url });

      await loadAccountStats();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [loadAccountStats, t, updateUserProfile, user?.uid]);

  const saveProfile = useCallback(async () => {
    if (!user?.uid) return;

    const name = editedName.trim();
    if (!name) {
      Alert.alert(t('profile.missingNameTitle'), t('profile.missingNameBody'));
      return;
    }

    try {
      setSaving(true);

      const digits = phoneDigits.replace(/\D/g, '');
      const combinedPhone = digits.length ? `${phonePrefix}${digits}` : '';

      await updateUserProfile({
        full_name: name,
        phone_number: combinedPhone,
        default_city: editedCity,
        default_country: editedCountry,
      });

      // Persist social handles + bio + privacy via the shared backend endpoint.
      await updateSocialProfile({
        bio: editedBio.trim(),
        socialLinks: {
          instagram: normalizeSocialHandle(editedInstagram),
          tiktok: normalizeSocialHandle(editedTiktok),
          twitter: normalizeSocialHandle(editedTwitter),
          facebook: normalizeSocialHandle(editedFacebook),
        },
        privacy: {
          profile_visibility: profileVisibility,
          attendance_visibility: attendanceVisibility,
          discoverable_by_phone: discoverableByPhone,
        },
      });
      await refreshUserProfile();

      // Update filters to use new country
      setUserCountry(editedCountry);
      applyFiltersDirectly({
        ...appliedFilters,
        country: editedCountry,
        city: '', // Reset city filter when country changes
      });
      
      setIsEditing(false);
      Alert.alert(t('profile.saveSuccessTitle'), t('profile.saveSuccessBody'));
    } catch {
      Alert.alert(t('profile.saveErrorTitle'), t('profile.saveErrorBody'));
    } finally {
      setSaving(false);
    }
  }, [appliedFilters, applyFiltersDirectly, editedBio, editedCity, editedCountry, editedFacebook, editedInstagram, editedName, editedTiktok, editedTwitter, attendanceVisibility, discoverableByPhone, profileVisibility, phoneDigits, phonePrefix, refreshUserProfile, setUserCountry, t, updateUserProfile, user?.uid]);

  const confirmSignOut = useCallback(() => {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut, t]);

  const verificationState = useMemo<'approved' | 'pending' | null>(() => {
    if (!verificationStatus?.status) return null;
    if (verificationStatus.status === 'approved') return 'approved';
    if (
      verificationStatus.status === 'pending' ||
      verificationStatus.status === 'pending_review' ||
      verificationStatus.status === 'in_review'
    ) {
      return 'pending';
    }
    return null;
  }, [verificationStatus?.status]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
        <View style={styles.centerEmpty}>
          <Text style={styles.emptyTitle}>{t('auth.loginRequiredTitle')}</Text>
          <Text style={styles.emptyBody}>{t('tickets.loginRequiredBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View
        style={[styles.header, { top: insets.top, paddingTop: 8 }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h && h !== headerHeight) setHeaderHeight(h);
        }}
      >
        <Text style={styles.headerTitle}>{t('profile.account')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Notifications', { userId: user?.uid || '' })}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Bell size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setIsEditing((v) => !v)}
            accessibilityLabel={t('profile.edit')}
            hitSlop={8}
          >
            <Settings size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Header is positioned below the safe-area; include that offset.
            paddingTop: insets.top + headerHeight + 4,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={styles.avatar}
              onPress={isEditing ? pickAndUploadAvatar : undefined}
              disabled={!isEditing || uploadingPhoto}
              accessibilityLabel={t('profile.changePhoto')}
            >
              {userProfile?.photo_url ? (
                <Image source={{ uri: userProfile.photo_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <User size={30} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.profileMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText} numberOfLines={1}>
                  {displayName}
                </Text>
                {verificationState === 'approved' ? (
                  <VerifiedBadge size="small" />
                ) : verificationState === 'pending' ? (
                  <StatusChip status="pending" label={t('profile.verificationPending')} />
                ) : null}
              </View>

              <View style={styles.locationRow}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </View>

              {isEditing ? <Text style={styles.editHint}>{t('profile.editProfileHint')}</Text> : null}
            </View>
          </View>

          <View style={styles.statBlock}>
            <StatTriplet
              items={[
                { label: t('profile.eventsAttended'), value: statsLoaded ? accountStats.eventsAttended : null },
                { label: t('profile.following'), value: statsLoaded ? accountStats.following : null },
                { label: t('profile.followers'), value: statsLoaded ? accountStats.followers : null },
              ]}
            />
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={styles.fieldLabel}>{t('profile.fullName')}</Text>
              <TextInput
                style={styles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder={t('profile.placeholders.name')}
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
              />

              <Text style={styles.fieldLabel}>{t('profile.phone')}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefixRow}>
                  {(['+509', '+1'] as const).map((p) => {
                    const active = phonePrefix === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.prefixPill, active && styles.prefixPillActive]}
                        onPress={() => setPhonePrefix(p)}
                      >
                        <Text style={[styles.prefixPillText, active && styles.prefixPillTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  value={phoneDigits}
                  onChangeText={(value) => setPhoneDigits(value.replace(/\D/g, ''))}
                  placeholder={t('profile.placeholders.phone')}
                  placeholderTextColor={colors.textTertiary}
                  selectionColor={colors.primary}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.fieldLabel}>{t('profile.defaultCountry') || 'Country'}</Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <Text style={styles.countrySelectorText}>
                  {COUNTRIES.find(c => c.code === editedCountry)?.name || 'Select Country'}
                </Text>
                <ChevronDown size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              {showCountryPicker && (
                <View style={styles.countryList}>
                  {COUNTRIES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryOption,
                        editedCountry === country.code && styles.countryOptionActive
                      ]}
                      onPress={() => {
                        setEditedCountry(country.code);
                        setEditedCity(''); // Reset city when country changes
                        setShowCountryPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.countryOptionText,
                        editedCountry === country.code && styles.countryOptionTextActive
                      ]}>
                        {country.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>{t('profile.defaultCity')}</Text>
              <TextInput
                style={styles.input}
                value={editedCity}
                onChangeText={(value) => {
                  setEditedCity(value);
                  setShowCitySuggestions(true);
                }}
                selectionColor={colors.primary}
                onFocus={() => setShowCitySuggestions(true)}
                onBlur={() => {
                  // Let suggestion taps register before hiding.
                  setTimeout(() => setShowCitySuggestions(false), 120);
                }}
                placeholder={t('profile.placeholders.city')}
                placeholderTextColor={colors.textTertiary}
              />

              {showCitySuggestions && filteredCities.length ? (
                <View style={styles.suggestions}>
                  {filteredCities.map((city) => (
                    <TouchableOpacity
                      key={city}
                      style={styles.suggestionRow}
                      onPress={() => {
                        setEditedCity(city);
                        setShowCitySuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Social handles + bio */}
              <View style={styles.formDivider} />
              <Text style={styles.formSubsectionTitle}>{t('profile.social.sectionTitle')}</Text>

              <Text style={styles.fieldLabel}>{t('profile.social.bio')}</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={editedBio}
                onChangeText={(value) => setEditedBio(value.slice(0, 280))}
                placeholder={t('profile.social.bioPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                multiline
                maxLength={280}
              />
              <Text style={styles.charCount}>{editedBio.length}/280</Text>

              <Text style={styles.helperText}>{t('profile.social.handlesHint')}</Text>

              <Text style={styles.fieldLabel}>Instagram</Text>
              <TextInput
                style={styles.input}
                value={editedInstagram}
                onChangeText={setEditedInstagram}
                placeholder="@username"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>TikTok</Text>
              <TextInput
                style={styles.input}
                value={editedTiktok}
                onChangeText={setEditedTiktok}
                placeholder="@username"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>X / Twitter</Text>
              <TextInput
                style={styles.input}
                value={editedTwitter}
                onChangeText={setEditedTwitter}
                placeholder="@username"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>Facebook</Text>
              <TextInput
                style={styles.input}
                value={editedFacebook}
                onChangeText={setEditedFacebook}
                placeholder="username"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.primary}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Privacy */}
              <View style={styles.formDivider} />
              <Text style={styles.formSubsectionTitle}>{t('profile.social.privacyTitle')}</Text>

              <Text style={styles.fieldLabel}>{t('profile.social.profileVisibility')}</Text>
              <View style={styles.segmentRow}>
                {([
                  { value: 'private' as ProfileVisibility, label: t('profile.social.profilePrivate') },
                  { value: 'public' as ProfileVisibility, label: t('profile.social.profilePublic') },
                ]).map((opt) => {
                  const active = profileVisibility === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                      onPress={() => setProfileVisibility(opt.value)}
                    >
                      <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>{t('profile.social.profileHint')}</Text>

              <Text style={styles.fieldLabel}>{t('profile.social.attendanceTitle')}</Text>
              <View style={styles.segmentRow}>
                {([
                  { value: 'nobody' as AttendanceVisibility, label: t('profile.social.attNobody') },
                  { value: 'friends' as AttendanceVisibility, label: t('profile.social.attFriends') },
                  { value: 'everyone' as AttendanceVisibility, label: t('profile.social.attEveryone') },
                ]).map((opt) => {
                  const active = attendanceVisibility === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                      onPress={() => setAttendanceVisibility(opt.value)}
                    >
                      <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setDiscoverableByPhone((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleLabel}>{t('profile.social.discoverable')}</Text>
                  <Text style={styles.toggleHint}>{t('profile.social.discoverableHint')}</Text>
                </View>
                <View style={[styles.switchTrack, discoverableByPhone && styles.switchTrackOn]}>
                  <View style={[styles.switchThumb, discoverableByPhone && styles.switchThumbOn]} />
                </View>
              </TouchableOpacity>

              <View style={styles.editActionsRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.actionButtonHalf]}
                  onPress={() => setIsEditing(false)}
                  disabled={saving || uploadingPhoto}
                >
                  <Text style={styles.secondaryButtonText}>{t('profile.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, styles.actionButtonHalf]}
                  onPress={saveProfile}
                  disabled={saving || uploadingPhoto}
                >
                  <Text style={styles.primaryButtonText}>{saving ? t('profile.saving') : t('profile.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Poster wall — POSH poster-forward identity (§2.1). Hidden while editing. */}
        {!isEditing ? (
          <View style={styles.postersSection}>
            <Text style={styles.postersTitle}>{t('profile.postersTitle')}</Text>
            {myEvents.length > 0 ? (
              <View style={styles.postersGrid}>
                {myEvents.map((event) => (
                  <PosterEventCard
                    key={event.id}
                    event={event}
                    width={PROFILE_POSTER_WIDTH}
                    userCity={userProfile?.default_city}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                icon={Compass}
                title={t('profile.postersEmptyTitle')}
                subtitle={t('profile.postersEmptyBody')}
                actionLabel={t('profile.postersExplore')}
                onAction={() => navigation.navigate('Main', { screen: 'Discover' })}
                compact
              />
            )}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>

          <View style={styles.languageRow}>
            {(['en', 'fr', 'ht'] as const).map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{lang.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.actions')}</Text>

          <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('Favorites')}>
            <View style={styles.rowLeft}>
              <Heart size={18} color={colors.primary} />
              <Text style={styles.rowText}>{t('tabs.favorites')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('Connections')}>
            <View style={styles.rowLeft}>
              <Users size={18} color={colors.primary} />
              <Text style={styles.rowText}>{t('profile.friends')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          {canUseOrganizerMode ? (
            <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('CreateEvent')}>
              <View style={styles.rowLeft}>
                <Briefcase size={18} color={colors.primary} />
                <Text style={styles.rowText}>{t('profile.createEvent')}</Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('OrganizerVerification')}>
              <View style={styles.rowLeft}>
                <Briefcase size={18} color={colors.primary} />
                <Text style={styles.rowText}>{t('profile.becomeOrganizer')}</Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {canUseOrganizerMode && mode !== 'organizer' ? (
            <TouchableOpacity style={styles.rowButton} onPress={() => setMode('organizer')}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowText}>{t('profile.switchToOrganizer')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {canUseStaffTools && mode !== 'staff' ? (
            <TouchableOpacity style={styles.rowButton} onPress={() => setMode('staff')}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowText}>{t('profile.switchToStaff')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {mode !== 'attendee' ? (
            <TouchableOpacity style={styles.rowButton} onPress={() => setMode('attendee')}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowText}>{t('profile.switchToAttendee')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.help')}</Text>

          <TouchableOpacity style={styles.rowButton} onPress={() => openWebUrl(`${WEBSITE_BASE_URL}/support`)}>
            <View style={styles.rowLeft}>
              <ExternalLink size={18} color={colors.primary} />
              <Text style={styles.rowText}>{t('profile.helpCenter')}</Text>
            </View>
            <ExternalLink size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>

          <TouchableOpacity style={styles.rowButton} onPress={() => openWebUrl(`${WEBSITE_BASE_URL}/legal/terms`)}>
            <View style={styles.rowLeft}>
              <ExternalLink size={18} color={colors.primary} />
              <Text style={styles.rowText}>{t('profile.terms')}</Text>
            </View>
            <ExternalLink size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowButton} onPress={() => openWebUrl(`${WEBSITE_BASE_URL}/legal/privacy`)}>
            <View style={styles.rowLeft}>
              <ExternalLink size={18} color={colors.primary} />
              <Text style={styles.rowText}>{t('profile.privacy')}</Text>
            </View>
            <ExternalLink size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.rowButton} onPress={confirmSignOut}>
            <View style={styles.rowLeft}>
              <LogOut size={18} color={colors.error} />
              <Text style={[styles.rowText, { color: colors.error }]}>{t('profile.signOut')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 16,
  },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefixPill: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  prefixPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  prefixPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  prefixPillTextActive: {
    color: colors.surface,
  },
  phoneInput: {
    flex: 1,
  },
  suggestions: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  countrySelectorText: {
    fontSize: 15,
    color: colors.text,
  },
  countryList: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  countryOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  countryOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  countryOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  countryOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Elevation, not borders (POSH §1): the card separates from the canvas by
  // being a brightness step lighter, never by drawing a 1px box.
  card: {
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.borderLight,
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  profileMeta: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flex: 1,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  locationRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  editHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statBlock: {
    marginTop: 16,
  },
  editForm: {
    marginTop: 16,
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Grouped-disclosure field: a raised surface row, no 1px box (POSH §1 / item 7).
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surfaceRaised,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginTop: 18,
    marginBottom: 4,
  },
  formSubsectionTitle: {
    marginTop: 6,
    marginBottom: 2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: colors.white,
  },
  toggleRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toggleHint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  editActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonHalf: {
    flex: 1,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.borderLight,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  sectionCard: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  postersSection: {
    marginTop: 24,
    marginBottom: 4,
  },
  postersTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
    marginBottom: 14,
  },
  postersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    fontWeight: '800',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.white,
  },
  rowButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  centerEmpty: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
