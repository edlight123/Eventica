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
  Animated
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
  Clock, 
  Ticket, 
  Users,
  TrendingUp,
  Star,
  Shield,
  ExternalLink,
  ChevronRight
} from 'lucide-react-native';
import { doc, getDoc, collection, addDoc, Timestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import EventStatusBadge from '../components/EventStatusBadge';
import TicketAvailabilityBar from '../components/TicketAvailabilityBar';
import PaymentModal from '../components/PaymentModal';
import TieredTicketSelector from '../components/TieredTicketSelector';
import { getCategoryLabel } from '../lib/categories';
import FreeTicketModal from '../components/FreeTicketModal';
import AddToCalendarButton from '../components/AddToCalendarButton';
import JoinWaitlistButton from '../components/JoinWaitlistButton';
import FollowButton from '../components/FollowButton';

const { width } = Dimensions.get('window');

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
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
        message: `${t('eventDetail.share.checkOut')} ${event.title}!\n\n${event.description?.substring(0, 100)}...\n\n${t('eventDetail.share.date')}: ${event.start_datetime && format(event.start_datetime, 'EEEE, MMMM dd, yyyy')}\n${t('eventDetail.share.venue')}: ${event.venue_name}\n${t('eventDetail.share.organizer')}: ${event.users?.full_name || event.organizer_name || t('eventDetail.organizerFallback')}\n\nhttps://joineventica.com/events/${eventId}`,
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
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        {/* Hero Image with Overlay Title & Actions */}
        <View style={styles.heroContainer}>
          {(event.banner_image_url || event.cover_image_url) ? (
            <Image 
              source={{ uri: event.banner_image_url || event.cover_image_url }} 
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Tag size={48} color={COLORS.primary + '40'} />
            </View>
          )}
          
          {/* Dark Gradient Overlay - Bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
          />
          
          {/* Top Right Actions: Share & Save */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleShare}
            >
              <Share2 size={20} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleFavorite}
              disabled={favoriteLoading}
            >
              <Heart 
                size={20} 
                color="#FFF"
                fill={isFavorite ? '#FFF' : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          
          {/* Bottom Left: Badges + Title */}
          <View style={styles.heroOverlay}>
            {/* Badges Row */}
            <View style={styles.heroBadges}>
              <View style={styles.categoryBadgeHero}>
                <Text style={styles.categoryTextHero}>{getCategoryLabel(t, event.category)}</Text>
              </View>
              {isVIP && <EventStatusBadge status="VIP" size="small" />}
              {isTrending && <EventStatusBadge status="Trending" size="small" />}
              {isSoldOut && <EventStatusBadge status="Sold Out" size="small" />}
              {selloutSoon && !isSoldOut && <EventStatusBadge status="Last Chance" size="small" />}
            </View>
            
            {/* Event Title - 2 lines max */}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Event Details Section */}
          <Text style={styles.sectionTitleMain}>{t('eventDetail.sections.details')}</Text>
          
          <View style={styles.infoCards}>
            {/* Date & Time Card */}
            <View style={styles.infoCard}>
              <View style={[styles.infoCardIcon, { backgroundColor: '#F59E0B' }]}>
                <Calendar size={20} color="#FFF" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>{t('eventDetail.labels.dateTime')}</Text>
                <Text style={styles.infoCardValue}>
                  {event.start_datetime && format(event.start_datetime, 'MMM d, yyyy')}
                </Text>
                <Text style={styles.infoCardSubvalue}>
                  {event.start_datetime && format(event.start_datetime, 'h:mm a')}
                  {event.end_datetime && ` - ${format(event.end_datetime, 'h:mm a')}`}
                </Text>
              </View>
            </View>

            {/* Location Card with Map Link */}
            <TouchableOpacity 
              style={styles.infoCard}
              onPress={openInMaps}
              activeOpacity={0.7}
            >
              <View style={[styles.infoCardIcon, { backgroundColor: COLORS.primary }]}>
                <MapPin size={20} color="#FFF" />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>{t('eventDetail.labels.location')}</Text>
                <Text style={styles.infoCardValue}>{event.venue_name}</Text>
                <Text style={styles.infoCardSubvalue}>
                  {event.address || ''}{event.address && ', '}{event.city}
                </Text>
              </View>
              <ExternalLink size={16} color={COLORS.primary} />
            </TouchableOpacity>

            {/* Tickets Availability Card with Progress Bar */}
            {(event.total_tickets > 0) && (
              <View style={styles.infoCard}>
                <View style={[styles.infoCardIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Users size={20} color="#FFF" />
                </View>
                <View style={[styles.infoCardContent, { flex: 1 }]}>
                  <Text style={styles.infoCardLabel}>{t('eventDetail.labels.ticketAvailability')}</Text>
                  <Text style={styles.ticketsAvailable}>
                    <Text style={styles.ticketsAvailableBold}>
                      {remainingTickets} {t('eventDetail.tickets.available')}
                    </Text>
                  </Text>
                  <Text style={styles.ticketsSold}>
                    {event.tickets_sold || 0} / {event.total_tickets} {t('common.sold')}
                  </Text>
                  <TicketAvailabilityBar
                    totalTickets={event.total_tickets}
                    ticketsSold={event.tickets_sold || 0}
                    style={{ marginTop: 8 }}
                  />
                </View>
              </View>
            )}
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
            
            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsTitle}>{t('eventDetail.sections.tags')}</Text>
                <View style={styles.tagsRow}>
                  {event.tags.map((tag: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

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
                    <View style={styles.verifiedBadgeInline}>
                      <Shield size={12} color="#3B82F6" />
                      <Text style={styles.verifiedTextInline}>{t('eventDetail.verified')}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {event.organizer_id && (
                <FollowButton 
                  organizerId={event.organizer_id} 
                  style={styles.followButtonInCard}
                />
              )}
            </View>
          </View>

          {/* Venue Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{t('eventDetail.sections.venueInfo')}</Text>
            </View>
            <View style={styles.venueDetails}>
              <View style={styles.venueRow}>
                <Text style={styles.venueLabel}>{t('eventDetail.venue.venueName')}</Text>
                <Text style={styles.venueValue}>{event.venue_name}</Text>
              </View>
              <View style={styles.venueRow}>
                <Text style={styles.venueLabel}>{t('eventDetail.venue.address')}</Text>
                <Text style={styles.venueValue}>
                  {event.address || t('eventDetail.venue.addressNotSpecified')}
                </Text>
                <Text style={styles.venueValue}>
                  {event.commune && `${event.commune}, `}{event.city}
                </Text>
              </View>
              <View style={styles.mapLinksRow}>
                <TouchableOpacity 
                  style={styles.mapLink}
                  onPress={() => Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(event.address || `${event.venue_name}, ${event.city}`)}`)}
                >
                  <MapPin size={14} color={COLORS.primary} />
                  <Text style={styles.mapLinkText}>{t('eventDetail.maps.apple')}</Text>
                </TouchableOpacity>
                <Text style={styles.mapSeparator}>|</Text>
                <TouchableOpacity 
                  style={styles.mapLink}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address || `${event.venue_name}, ${event.city}`)}`)}
                >
                  <MapPin size={14} color={COLORS.primary} />
                  <Text style={styles.mapLinkText}>{t('eventDetail.maps.google')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Date & Time Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>{t('eventDetail.sections.dateAndTime')}</Text>
            </View>
            <View style={styles.dateDetails}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{t('eventDetail.date.start')}</Text>
                <Text style={styles.dateValue}>
                  {event.start_datetime && format(event.start_datetime, 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={styles.dateTime}>
                  {event.start_datetime && format(event.start_datetime, 'h:mm a')}
                </Text>
              </View>
              {event.end_datetime && (
                <View style={styles.dateRow}>
                  <Text style={styles.dateLabel}>{t('eventDetail.date.end')}</Text>
                  <Text style={styles.dateValue}>
                    {format(event.end_datetime, 'EEEE, MMMM d, yyyy')}
                  </Text>
                  <Text style={styles.dateTime}>
                    {format(event.end_datetime, 'h:mm a')}
                  </Text>
                </View>
              )}
            </View>
          </View>

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
        <View style={styles.floatingContent}>
          {/* Left Side: Price Info */}
          <View style={styles.floatingPriceSection}>
            {isSoldOut ? (
              <>
                <Text style={styles.soldOutMainText}>{t('badges.soldout')}</Text>
                <Text style={styles.floatingSecondaryText}>{t('eventDetail.floating.noTicketsAvailable')}</Text>
              </>
            ) : isFree ? (
              <>
                <Text style={styles.floatingPriceMain}>{t('common.free').toUpperCase()}</Text>
                <Text style={styles.floatingSecondaryText}>{t('eventDetail.floating.freeEntry')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.floatingPriceMain}>
                  {event.currency || 'HTG'} {(event.ticket_price || 0).toLocaleString()}
                </Text>
                <Text style={styles.floatingSecondaryText}>
                  {selloutSoon ? t('eventDetail.floating.almostSoldOut') : t('eventDetail.floating.ticketsAvailable')}
                </Text>
              </>
            )}
          </View>
          
          {/* Right Side: CTA Button */}
          {isPastEvent ? (
            <View style={styles.floatingButtonDisabled}>
              <Text style={styles.floatingButtonDisabledText}>{t('eventDetail.floating.eventEnded')}</Text>
            </View>
          ) : isSoldOut ? (
            <View style={styles.floatingButtonDisabled}>
              <Text style={styles.floatingButtonDisabledText}>{t('badges.soldout')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.floatingButton, purchasing && styles.floatingButtonProcessing]}
              onPress={handlePurchaseTicket}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.floatingButtonText}>
                  {isFree ? t('eventDetail.floating.claimTicket') : t('eventDetail.floating.getTickets')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
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
    height: 320,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
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
    color: COLORS.text,
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

  // Content Area
  content: {
    padding: 16,
  },
  sectionTitleMain: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoCardSubvalue: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  
  // Ticket Availability Enhancements
  ticketsAvailable: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
  },
  ticketsAvailableBold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  ticketsSold: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 23,
  },
  
  // Tags
  tagsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tagsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  verifiedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTextInline: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 14,
    color: COLORS.primary,
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
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  venueValue: {
    fontSize: 15,
    color: COLORS.text,
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
    color: COLORS.primary,
    fontWeight: '600',
  },
  mapSeparator: {
    color: COLORS.border,
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
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Floating Bottom CTA Pill Card
  floatingBottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    ...(Platform.OS === 'ios' && {
      backdropFilter: 'blur(10px)',
    }),
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
    color: COLORS.primary,
    marginBottom: 2,
  },
  floatingSecondaryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  soldOutMainText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  
  // Floating Button (Pill-shaped CTA)
  floatingButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 140,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonProcessing: {
    opacity: 0.7,
  },
  floatingButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  floatingButtonDisabled: {
    backgroundColor: COLORS.textSecondary + '25',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  floatingButtonDisabledText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
