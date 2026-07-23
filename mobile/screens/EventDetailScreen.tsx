import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  Linking,
  Platform,
  Animated,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Tag, 
  Share2, 
  Heart, 
  Ticket,
  TrendingUp,
  Star,
  ExternalLink,
  ChevronRight,
  PlayCircle
} from 'lucide-react-native';
import { doc, getDoc, collection, addDoc, Timestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { backendJson } from '../lib/api/backend';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { colors as T, font } from '../theme/tokens';
import { format } from 'date-fns';
import { isValidDate } from '../lib/dates';
import WhitePillCTA from '../components/WhitePillCTA';
import VerifiedBadge from '../components/VerifiedBadge';
import PaymentModal from '../components/PaymentModal';
import TieredTicketSelector from '../components/TieredTicketSelector';
import { resolvePosterTheme } from '../lib/posterGradient';
import FreeTicketModal from '../components/FreeTicketModal';
import AddToCalendarButton from '../components/AddToCalendarButton';
import JoinWaitlistButton from '../components/JoinWaitlistButton';
import FollowButton from '../components/FollowButton';
import CountdownTimer from '../components/CountdownTimer';
import WhosGoing from '../components/WhosGoing';
const { width } = Dimensions.get('window');
const POSTER_W = width * 0.86;

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTierSelector, setShowTierSelector] = useState(false);
  const [showFreeTicketModal, setShowFreeTicketModal] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedTierPrice, setSelectedTierPrice] = useState<number>(0);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState<string | undefined>();
  // Password-gate state. accessGranted: null = unknown/not-yet-checked, true =
  // an access_grants/{uid} doc exists (or unlock succeeded), false = gated.
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [accessError, setAccessError] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatingBarAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchEventDetails();
    checkFavoriteStatus();
  }, [eventId]);

  // Animate floating bar entrance
  useEffect(() => {
    if (event) {
      Animated.timing(floatingBarAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [event]);

  // Once the event (and its is_password_protected flag) is loaded, check whether
  // the signed-in user already holds an access grant. Access proof is the mere
  // existence of events/{id}/access_grants/{uid} (written only by the server
  // verify endpoint). Non-protected events are always "granted".
  useEffect(() => {
    let cancelled = false;
    const checkAccessGrant = async () => {
      if (!event) return;
      if (!event.is_password_protected) {
        if (!cancelled) setAccessGranted(true);
        return;
      }
      if (!user) {
        if (!cancelled) setAccessGranted(false);
        return;
      }
      try {
        const grantSnap = await getDoc(doc(db, 'events', eventId, 'access_grants', user.uid));
        if (!cancelled) setAccessGranted(grantSnap.exists());
      } catch (err) {
        console.error('Error checking access grant:', err);
        if (!cancelled) setAccessGranted(false);
      }
    };
    checkAccessGrant();
    return () => {
      cancelled = true;
    };
  }, [event, user, eventId]);

  // Verify the typed code against the web endpoint. On { ok:true } the server
  // has written the access grant; mark unlocked and continue into purchase.
  const handleUnlock = async () => {
    const code = accessCodeInput.trim();
    if (!code || unlocking) return;
    setUnlocking(true);
    setAccessError('');
    try {
      const res = await backendJson<{ ok?: boolean }>('/api/events/verify-access', {
        method: 'POST',
        body: JSON.stringify({ eventId, code }),
      });
      if (res?.ok) {
        setAccessGranted(true);
        setShowAccessGate(false);
        setAccessCodeInput('');
        // Grant now exists downstream — proceed to the right purchase flow.
        if (isFree) {
          setShowFreeTicketModal(true);
        } else {
          setShowTierSelector(true);
        }
      } else {
        setAccessError(t('eventAccess.wrongCode'));
      }
    } catch (err) {
      // backendJson throws on non-2xx (403 wrong code) — treat as incorrect.
      setAccessError(t('eventAccess.wrongCode'));
    } finally {
      setUnlocking(false);
    }
  };

  const fetchEventDetails = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        
        // Fetch organizer data
        let organizerData = null;
        if (data.organizer_id) {
          try {
            const organizerDoc = await getDoc(doc(db, 'users', data.organizer_id));
            if (organizerDoc.exists()) {
              organizerData = organizerDoc.data();
            }
          } catch (err) {
            console.error('Error fetching organizer:', err);
          }
        }
        
        setEvent({ 
          id: eventDoc.id, 
          ...data,
          start_datetime: data.start_datetime?.toDate ? data.start_datetime.toDate() : data.start_datetime ? new Date(data.start_datetime) : null,
          end_datetime: data.end_datetime?.toDate ? data.end_datetime.toDate() : data.end_datetime ? new Date(data.end_datetime) : null,
          users: organizerData ? {
            full_name: organizerData.full_name || '',
            is_verified: organizerData.is_verified ?? false
          } : {
            full_name: '',
            is_verified: false
          }
        });
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert(t('common.error'), t('eventDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    try {
      const q = query(
        collection(db, 'event_favorites'),
        where('user_id', '==', user.uid),
        where('event_id', '==', eventId)
      );
      const snapshot = await getDocs(q);
      setIsFavorite(!snapshot.empty);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequiredTitle'), t('eventDetail.favorites.loginBody'));
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const q = query(
          collection(db, 'event_favorites'),
          where('user_id', '==', user.uid),
          where('event_id', '==', eventId)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, 'event_favorites', docSnapshot.id));
        });
        setIsFavorite(false);
        Alert.alert(t('common.success'), t('eventDetail.favorites.removed'));
      } else {
        // Add to favorites
        await addDoc(collection(db, 'event_favorites'), {
          user_id: user.uid,
          event_id: eventId,
          created_at: Timestamp.now()
        });
        setIsFavorite(true);
        Alert.alert(t('common.success'), t('eventDetail.favorites.saved'));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert(t('common.error'), t('eventDetail.favorites.updateError'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('eventDetail.share.checkOut')} ${event.title}!\n\n${event.description?.substring(0, 100)}...\n\n${t('eventDetail.share.date')}: ${event.start_datetime && format(event.start_datetime, 'EEEE, MMMM dd, yyyy')}\n${t('eventDetail.share.venue')}: ${event.venue_name}\n${t('eventDetail.share.organizer')}: ${event.users?.full_name || event.organizer_name || t('eventDetail.organizerFallback')}\n\nhttps://tikem.co/events/${eventId}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openInMaps = () => {
    const address = event.address || `${event.venue_name}, ${event.city}`;
    const encodedAddress = encodeURIComponent(address);
    
    Alert.alert(
      t('eventDetail.maps.title'),
      t('eventDetail.maps.body'),
      [
        {
          text: t('eventDetail.maps.apple'),
          onPress: () => Linking.openURL(`http://maps.apple.com/?q=${encodedAddress}`)
        },
        {
          text: t('eventDetail.maps.google'),
          onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`)
        },
        { text: t('common.cancel'), style: 'cancel' }
      ]
    );
  };

  const openPromoVideo = async () => {
    const raw = (event as any)?.video_url;
    if (typeof raw !== 'string' || !raw.trim()) return;
    const trimmed = raw.trim();
    // The URL is organizer-supplied. Only open web links — a bare domain gets
    // https:// prepended, but anything carrying another scheme (javascript:,
    // file:, a custom app/deep-link scheme, etc.) is rejected outright.
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;
    if (!/^https?:\/\//i.test(candidate)) {
      console.warn('Blocked non-http(s) promo video URL');
      return;
    }
    try {
      await Linking.openURL(candidate);
    } catch (error) {
      console.error('Error opening promo video:', error);
    }
  };

  const navigateToOrganizerProfile = () => {
    if (event.organizer_id) {
      navigation.navigate('OrganizerProfile', { organizerId: event.organizer_id });
    }
  };

  const handlePurchaseTicket = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequiredTitle'), t('eventDetail.purchase.loginBody'));
      return;
    }

    // Prevent purchase for past events
    if (isPastEvent) {
      Alert.alert(t('eventDetail.purchase.pastTitle'), t('eventDetail.purchase.pastBody'));
      return;
    }

    // Password gate — a protected event with no access grant must be unlocked
    // (code verified server-side) before any purchase flow opens.
    if (event.is_password_protected && accessGranted !== true) {
      setAccessError('');
      setShowAccessGate(true);
      return;
    }

    // For free events, show free ticket modal
    if (isFree) {
      setShowFreeTicketModal(true);
    } else {
      // For paid events, show tier selector
      setShowTierSelector(true);
    }
  };

  const handleFreeTicketSuccess = () => {
    // Refresh event data to show updated ticket count
    fetchEventDetails();
    // Navigate to Main tab navigator, then to Tickets tab
    navigation.navigate('Main', { screen: 'Tickets' });
  };

  const handleTierSelection = (tierId: string, finalPrice: number, quantity: number, promo?: string) => {
    // Store tier selection
    setSelectedTierId(tierId);
    setSelectedTierPrice(finalPrice);
    setTicketQuantity(quantity);
    setPromoCode(promo);
    
    // Close tier selector and open payment modal
    setShowTierSelector(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (_paymentMethod: string, _transactionId: string) => {
    Alert.alert(
      t('screens.payment.successTitle'),
      t('screens.payment.successBody'),
      [{ text: t('common.ok'), onPress: () => navigation.navigate('Tickets') }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('eventDetail.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('eventDetail.notFound')}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchEventDetails}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
  const isSoldOut = remainingTickets <= 0 && (event.total_tickets || 0) > 0;
  const isFree = !event.ticket_price || event.ticket_price === 0;
  
  // Prevent purchase only after the event has ended (not after it has started).
  const purchaseCutoffDate = event.end_datetime || event.start_datetime;
  const isPastEvent = purchaseCutoffDate && new Date(purchaseCutoffDate) < new Date();
  
  // Premium badge logic (matching PWA)
  const isVIP = (event.ticket_price || 0) > 100;
  const isTrending = (event.tickets_sold || 0) > 10;
  const selloutSoon = !isSoldOut && remainingTickets > 0 && remainingTickets < 10;

  // Guarded dates — never hand an Invalid Date to date-fns `format` (it throws).
  const startValid = isValidDate(event.start_datetime) ? event.start_datetime : null;
  const endValid = isValidDate(event.end_datetime) ? event.end_datetime : null;
  const priceSubLabel = `${t('common.from')} ${(event.ticket_price || 0).toLocaleString()} ${event.currency || 'HTG'}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Animated.ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero — same poster blurred as backdrop, sharp poster centered */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={resolvePosterTheme(event, event.id || event.title, event.category).colors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {(event.banner_image_url || event.cover_image_url) && (
            <Image
              source={{ uri: event.banner_image_url || event.cover_image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              blurRadius={28}
            />
          )}
          <View style={styles.heroBackdropScrim} />

          {/* Centered sharp poster */}
          <View style={styles.heroPoster}>
            <LinearGradient
              colors={resolvePosterTheme(event, event.id || event.title, event.category).colors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {(event.banner_image_url || event.cover_image_url) && (
              <Image
                source={{ uri: event.banner_image_url || event.cover_image_url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Bottom blend into page background */}
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.heroBottomBlend}
          />

          {/* Top scrim for button legibility */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            style={styles.heroTopScrim}
          />

          {/* Top Right Actions: Share & Save */}
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.iconButton} onPress={handleShare} hitSlop={8}>
              <Share2 size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFavorite}
              disabled={favoriteLoading}
              hitSlop={8}
            >
              <Heart 
                size={20} 
                color="#FFF"
                fill={isFavorite ? '#FFF' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title block — text-first, under the poster */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Countdown to event */}
          {startValid && startValid > new Date() && (
            <CountdownTimer targetDate={startValid} />
          )}

          {/* Key facts — clean text rows. Icons are neutral grey; teal stays
              reserved for semantic use (verified / links / live). */}
          <View style={styles.factList}>
            <View style={styles.factRow}>
              <Calendar size={18} color={colors.textSecondary} />
              <View style={styles.factText}>
                <Text style={styles.factValue}>
                  {startValid && format(startValid, 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={styles.factSub}>
                  {startValid && format(startValid, 'h:mm a')}
                  {endValid && ` – ${format(endValid, 'h:mm a')}`}
                </Text>
              </View>
            </View>

            <View style={styles.factDivider} />

            <TouchableOpacity style={styles.factRow} onPress={openInMaps} activeOpacity={0.6}>
              <MapPin size={18} color={colors.textSecondary} />
              <View style={styles.factText}>
                <Text style={styles.factValue}>{event.venue_name}</Text>
                <Text style={styles.factSub}>
                  {event.address || ''}{event.address && ', '}{event.city}
                </Text>
              </View>
              <ExternalLink size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Calendar & Waitlist */}
          <View style={styles.quickActionsRow}>
            <AddToCalendarButton 
              event={{
                id: eventId,
                title: event.title,
                description: event.description,
                start_datetime: event.start_datetime,
                end_datetime: event.end_datetime,
                venue_name: event.venue_name,
                address: event.address,
                city: event.city,
              }}
              style={styles.quickActionButton}
            />
            {isSoldOut && (
              <JoinWaitlistButton
                eventId={eventId}
                eventTitle={event.title}
                isSoldOut={isSoldOut}
                style={styles.quickActionButton}
              />
            )}
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('eventDetail.sections.about')}</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Promo Video — only when a valid URL is provided */}
          {typeof (event as any).video_url === 'string' && (event as any).video_url.trim() !== '' && (
            <TouchableOpacity
              style={styles.promoVideoRow}
              onPress={openPromoVideo}
              activeOpacity={0.7}
            >
              <PlayCircle size={20} color={colors.primary} />
              <Text style={styles.promoVideoText}>{t('organizerCreateEventFlow.canvas.trailer')}</Text>
              <ExternalLink size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Hosted By Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('eventDetail.sections.hostedBy')}</Text>
            <View style={styles.hostedByCard}>
              <TouchableOpacity 
                style={styles.hostedByMain}
                onPress={navigateToOrganizerProfile}
                activeOpacity={0.7}
              >
                <View style={styles.hostedByAvatar}>
                  <Text style={styles.hostedByAvatarText}>
                    {(event.users?.full_name || event.organizer_name || 'E')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.hostedByInfo}>
                  <Text style={styles.hostedByName}>
                    {event.users?.full_name || event.organizer_name || t('eventDetail.organizerFallback')}
                  </Text>
                  {(event.users?.is_verified || event.is_verified) && (
                    <VerifiedBadge
                      showLabel
                      label={t('eventDetail.verified')}
                      size="small"
                      style={styles.verifiedBadgeInline}
                    />
                  )}
                </View>
                <ChevronRight size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {event.organizer_id && (
                <FollowButton 
                  organizerId={event.organizer_id} 
                  style={styles.followButtonInCard}
                />
              )}
            </View>
          </View>

          {/* Who's Going - social attendance (hidden when organizer disables the guest list) */}
          {(event as any).show_guestlist !== false && (
            <WhosGoing eventId={eventId} />
          )}

          {/* Bottom padding for floating CTA */}
          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Floating Bottom CTA Pill Card */}
      <Animated.View 
        style={[
          styles.floatingBottomCard,
          {
            bottom: insets.bottom + 8,
            opacity: floatingBarAnim,
            transform: [{
              translateY: floatingBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            }],
          }
        ]}
      >
        {isPastEvent ? (
          <View style={styles.ctaDisabled}>
            <Text style={styles.ctaDisabledText}>{t('eventDetail.floating.eventEnded')}</Text>
          </View>
        ) : isSoldOut ? (
          <View style={styles.ctaDisabled}>
            <Text style={styles.ctaDisabledText}>{t('badges.soldout')}</Text>
          </View>
        ) : (
          // Adaptive white-pill primary action (POSH §2.2): free → RSVP,
          // paid → Get Tickets with a muted price sub-label.
          <WhitePillCTA
            variant={isFree ? 'rsvp' : 'paid'}
            label={isFree ? t('common.rsvp') : t('eventDetail.floating.getTickets')}
            subLabel={isFree ? undefined : priceSubLabel}
            onPress={handlePurchaseTicket}
            loading={purchasing}
          />
        )}
      </Animated.View>

      {/* Tiered Ticket Selector */}
      <TieredTicketSelector
        visible={showTierSelector}
        onClose={() => setShowTierSelector(false)}
        eventId={eventId}
        onPurchase={handleTierSelection}
        currency={event?.currency || 'HTG'}
      />

      {/* Free Ticket Modal */}
      <FreeTicketModal
        visible={showFreeTicketModal}
        onClose={() => setShowFreeTicketModal(false)}
        eventId={eventId}
        eventTitle={event?.title || ''}
        userId={user?.uid || ''}
        userEmail={userProfile?.email || user?.email || ''}
        userName={userProfile?.full_name || t('common.guest')}
        event={event}
        onSuccess={handleFreeTicketSuccess}
      />

      {/* Password gate — code prompt shown when a protected event has no grant */}
      <Modal
        visible={showAccessGate}
        transparent
        animationType="fade"
        onRequestClose={() => !unlocking && setShowAccessGate(false)}
      >
        <View style={styles.accessBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => !unlocking && setShowAccessGate(false)}
          />
          <View style={styles.accessCard}>
            <Text style={styles.accessTitle}>🔒 {t('eventAccess.locked')}</Text>
            <TextInput
              style={styles.accessInput}
              placeholder={t('eventAccess.enterCode')}
              placeholderTextColor={colors.textSecondary}
              value={accessCodeInput}
              onChangeText={(text) => {
                setAccessCodeInput(text);
                if (accessError) setAccessError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.primary}
              editable={!unlocking}
              onSubmitEditing={handleUnlock}
              returnKeyType="go"
            />
            {!!accessError && <Text style={styles.accessError}>{accessError}</Text>}
            <TouchableOpacity
              style={[styles.accessButton, (unlocking || !accessCodeInput.trim()) && styles.accessButtonDisabled]}
              onPress={handleUnlock}
              disabled={unlocking || !accessCodeInput.trim()}
              activeOpacity={0.8}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color={T.onTeal} />
              ) : (
                <Text style={styles.accessButtonText}>{t('eventAccess.unlock')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        eventId={eventId}
        eventTitle={event?.title || ''}
        userId={user?.uid || ''}
        quantity={ticketQuantity}
        totalAmount={selectedTierPrice || event?.ticket_price || 0}
        currency={event?.currency || 'HTG'}
        country={event?.country || ''}
        tierId={selectedTierId || undefined}
        promoCodeId={promoCode}
        onSuccess={handlePaymentSuccess}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Hero Section with Overlay
  heroContainer: {
    position: 'relative',
    width: width,
    height: 600,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroBackdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  heroPoster: {
    width: POSTER_W,
    aspectRatio: 4 / 5,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  heroBottomBlend: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTopScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
  },
  
  // Top Right Actions (Share & Save)
  heroActions: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Bottom Left Overlay (Badges + Title)
  heroOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadgeHero: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
  },
  categoryTextHero: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // Content Area — text-first
  content: {
    paddingHorizontal: 18,
    paddingTop: 9,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    color: colors.text,
    lineHeight: 38,
    letterSpacing: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  factList: {
    marginTop: 18,
    marginBottom: 4,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
  },
  factText: {
    flex: 1,
    gap: 2,
  },
  factValue: {
    fontFamily: font.mono,
    fontSize: 13.5,
    letterSpacing: 0.3,
    color: colors.text,
  },
  factSub: {
    fontFamily: font.monoRegular,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  factDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  sectionTitleMain: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    marginTop: 4,
  },

  // Info Cards - More Compact
  infoCards: {
    gap: 10,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  infoCardSubvalue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  
  // Ticket Availability Enhancements
  ticketsAvailable: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  ticketsAvailableBold: {
    fontWeight: '700',
    color: colors.text,
  },
  ticketsSold: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    paddingVertical: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
  },

  // Promo video row
  promoVideoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  promoVideoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  // Tags
  tagsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tagsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },

  // Hosted By Section
  hostedByCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  hostedByAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostedByAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  hostedByInfo: {
    flex: 1,
  },
  hostedByName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  verifiedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTextInline: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '500',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  hostedByMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  followButtonInCard: {
    marginLeft: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
  },

  // Venue Details
  venueDetails: {
    gap: 16,
  },
  venueRow: {
    gap: 4,
  },
  venueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  venueValue: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  mapLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  mapSeparator: {
    color: colors.border,
    fontSize: 14,
  },

  // Date Details
  dateDetails: {
    gap: 16,
  },
  dateRow: {
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  dateTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Floating Bottom CTA — transparent bar, single full-width button (Posh-style)
  floatingBottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: T.onTeal,
    fontSize: 16,
    fontWeight: '800',
  },
  ctaButtonPrice: {
    fontFamily: font.mono,
    color: T.onTeal,
    opacity: 0.7,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  ctaDisabled: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaDisabledText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  floatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingPriceSection: {
    flex: 1,
    marginRight: 12,
  },
  floatingPriceMain: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  floatingSecondaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  soldOutMainText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  
  // Floating Button (Pill-shaped CTA)
  floatingButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 140,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonProcessing: {
    opacity: 0.7,
  },
  floatingButtonText: {
    color: T.onTeal,
    fontSize: 15,
    fontWeight: '800',
  },
  floatingButtonDisabled: {
    backgroundColor: colors.textSecondary + '25',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  floatingButtonDisabledText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Password gate modal ──
  accessBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  accessCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    gap: 14,
  },
  accessTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  accessInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  accessError: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  accessButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessButtonDisabled: {
    opacity: 0.5,
  },
  accessButtonText: {
    color: T.onTeal,
    fontSize: 16,
    fontWeight: '800',
  },
});
