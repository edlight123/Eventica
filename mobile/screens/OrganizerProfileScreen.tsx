import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Linking,
  Platform,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Calendar,
  Users,
  Star,
  MapPin,
  Globe,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react-native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import ConnectButton from '../components/ConnectButton';
import PosterEventCard from '../components/PosterEventCard';
import StatTriplet from '../components/StatTriplet';
import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import { fetchConnections } from '../lib/api/social';
import { type FriendshipState } from '../types/social';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 300;
// Two-column flyer grid inside the 16px-padded content area.
const PROFILE_COLUMN_WIDTH = (width - 32 - 12) / 2;

interface SocialLink {
  type: 'website' | 'instagram' | 'facebook' | 'tiktok' | 'whatsapp' | 'email';
  url: string;
  icon: any;
  color: string;
}

export default function OrganizerProfileScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const { organizerId } = route.params;
  const { user } = useAuth();
  const { t } = useI18n();
  const scrollViewRef = React.useRef<ScrollView>(null);
  
  const [organizer, setOrganizer] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState<string | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [stats, setStats] = useState({
    followerCount: 0,
    totalEvents: 0,
    totalTicketsSold: 0,
    rating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendship, setFriendship] = useState<FriendshipState>('none');
  const [friendshipLoaded, setFriendshipLoaded] = useState(false);

  // Resolve the viewer's friendship with this profile (drives connect button + privacy gating)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        if (active) { setFriendship('none'); setFriendshipLoaded(true); }
        return;
      }
      if (user.uid === organizerId) {
        if (active) { setFriendship('self'); setFriendshipLoaded(true); }
        return;
      }
      try {
        const { friends, incoming, outgoing } = await fetchConnections();
        if (!active) return;
        if (friends.some((f) => f.uid === organizerId)) setFriendship('friends');
        else if (outgoing.some((f) => f.uid === organizerId)) setFriendship('request_sent');
        else if (incoming.some((f) => f.uid === organizerId)) setFriendship('request_received');
        else setFriendship('none');
      } catch {
        if (active) setFriendship('none');
      } finally {
        if (active) setFriendshipLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [user, organizerId]);

  useEffect(() => {
    fetchOrganizerProfile();
    checkFollowStatus();
  }, [organizerId]);

  // Refetch on screen focus to ensure fresh data
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrganizerProfile();
      checkFollowStatus();
    });
    return unsubscribe;
  }, [navigation, organizerId]);

  const fetchOrganizerProfile = async () => {
    try {
      // H4: cross-user read of the organizer's SAFE public projection (name,
      // photo, is_verified, bio, organization_name/logo) instead of users/{uid}.
      // If the projection isn't backfilled yet, fall back to a name/avatar
      // placeholder so the screen still renders (events below still load).
      const organizerDoc = await getDoc(doc(db, 'public_profiles', organizerId));
      const organizerData = organizerDoc.exists()
        ? { id: organizerDoc.id, ...organizerDoc.data() }
        : { id: organizerId };
      setOrganizer(organizerData);

      // Fetch events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', organizerId),
        where('is_published', '==', true)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const now = new Date();
      const upcoming: any[] = [];
      const past: any[] = [];
      let totalSold = 0;

      eventsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const eventData = {
          id: doc.id,
          ...data,
          start_datetime: data.start_datetime?.toDate ? data.start_datetime.toDate() : new Date(data.start_datetime),
          end_datetime: data.end_datetime?.toDate ? data.end_datetime.toDate() : (data.end_datetime ? new Date(data.end_datetime) : null),
        };

        totalSold += data.tickets_sold || 0;

        const cutoff = eventData.end_datetime || eventData.start_datetime;
        if (cutoff && cutoff >= now) {
          upcoming.push(eventData);
        } else {
          past.push(eventData);
        }
      });

      upcoming.sort((a, b) => a.start_datetime.getTime() - b.start_datetime.getTime());
      past.sort((a, b) => b.start_datetime.getTime() - a.start_datetime.getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);

      // Fetch follower count
      const followersQuery = query(
        collection(db, 'organizer_follows'),
        where('organizer_id', '==', organizerId)
      );
      const followersSnapshot = await getDocs(followersQuery);

      setStats({
        followerCount: followersSnapshot.size,
        totalEvents: eventsSnapshot.size,
        totalTicketsSold: totalSold,
        rating: (organizerData as any).rating || 0,
      });

    } catch (error) {
      console.error('Error fetching organizer profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user) return;
    
    try {
      const followQuery = query(
        collection(db, 'organizer_follows'),
        where('organizer_id', '==', organizerId),
        where('follower_id', '==', user.uid)
      );
      const snapshot = await getDocs(followQuery);
      
      if (!snapshot.empty) {
        setIsFollowing(true);
        setFollowDocId(snapshot.docs[0].id);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }

    try {
      if (isFollowing && followDocId) {
        await deleteDoc(doc(db, 'organizer_follows', followDocId));
        setIsFollowing(false);
        setFollowDocId(null);
        setStats(prev => ({ ...prev, followerCount: prev.followerCount - 1 }));
      } else {
        const docRef = await addDoc(collection(db, 'organizer_follows'), {
          organizer_id: organizerId,
          follower_id: user.uid,
          created_at: Timestamp.now(),
        });
        setIsFollowing(true);
        setFollowDocId(docRef.id);
        setStats(prev => ({ ...prev, followerCount: prev.followerCount + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  const getSocialLinks = (): SocialLink[] => {
    const links: SocialLink[] = [];
    
    if (organizer?.website) {
      links.push({
        type: 'website',
        url: organizer.website,
        icon: Globe,
        color: '#6B7280',
      });
    }
    
    if (organizer?.instagram) {
      links.push({
        type: 'instagram',
        url: `https://instagram.com/${organizer.instagram.replace('@', '')}`,
        icon: ExternalLink,
        color: '#E4405F',
      });
    }
    
    if (organizer?.facebook) {
      links.push({
        type: 'facebook',
        url: `https://facebook.com/${organizer.facebook}`,
        icon: ExternalLink,
        color: '#1877F2',
      });
    }
    
    if (organizer?.tiktok) {
      links.push({
        type: 'tiktok',
        url: `https://tiktok.com/@${organizer.tiktok.replace('@', '')}`,
        icon: ExternalLink,
        color: '#000000',
      });
    }

    // H4: whatsapp/email are contact PII and are NOT part of the public
    // projection, so they are intentionally no longer surfaced here.

    return links;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrganizerProfile();
    checkFollowStatus();
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const renderEventCard = (event: any, isCompact = false) => (
    <PosterEventCard
      key={event.id}
      event={event}
      width={PROFILE_COLUMN_WIDTH}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
    />
  );

  const getSubtitle = () => {
    const parts = [];
    if (organizer.categories && organizer.categories.length > 0) {
      parts.push(organizer.categories[0]);
    }
    if (organizer.city) {
      parts.push(organizer.city);
    }
    return parts.join(' · ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('organizerProfile.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!organizer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('organizerProfile.notFound')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchOrganizerProfile();
            }}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const socialLinks = getSocialLinks();
  // "Hosting since" — account age. The projection stores created_at (snake);
  // accept the legacy camelCase too. Value may be an ISO string or a Firestore
  // Timestamp-like { seconds }.
  const createdAtRaw = organizer.created_at ?? organizer.createdAt;
  const hostingSince = createdAtRaw
    ? new Date(createdAtRaw.seconds ? createdAtRaw.seconds * 1000 : createdAtRaw).getFullYear()
    : null;
  const subtitle = getSubtitle();

  // Connect (friend-request) action still sits inline next to the stats.
  // H4: the former "personal bio + social handles" card was gated by the
  // owner's privacy settings and read the personal `social_links` object —
  // neither is part of the public projection, so that card has been removed
  // (email/whatsapp/personal socials can't be exposed publicly).
  const isSelf = !!user && user.uid === organizerId;
  const showConnect = friendshipLoaded && !isSelf && friendship !== 'self';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Premium Hero Section with ImageBackground */}
        <ImageBackground
          source={organizer.coverImageUrl ? { uri: organizer.coverImageUrl } : undefined}
          style={styles.hero}
          resizeMode="cover"
        >
          {/* Dark scrim overlay for readability */}
          <View style={styles.heroScrim} />

          {/* Back Button — a clean chevron-back, consistent with the
              organizer-surface headers (top-left, never over the avatar). */}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={26} color="#FFF" />
          </TouchableOpacity>

          {/* Small Follow Button - Top Right */}
          <TouchableOpacity
            style={[styles.followButtonSmall, { top: insets.top + 8 }, isFollowing && styles.followingButtonSmall]}
            onPress={handleFollow}
          >
            <Text style={[styles.followButtonSmallText, isFollowing && styles.followingButtonSmallText]}>
              {isFollowing ? t('organizerProfile.following') : t('organizerProfile.follow')}
            </Text>
          </TouchableOpacity>

          {/* Hero Content - Bottom Aligned (clears the top-left back control) */}
          <View style={styles.heroContent}>
            {/* Avatar */}
            <View style={styles.avatar}>
              {organizer.avatarUrl ? (
                <Image source={{ uri: organizer.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {(organizer.full_name?.[0] || '?').toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name + Verified Badge (consolidated to the shared VerifiedBadge) */}
            <View style={styles.nameRow}>
              <Text style={styles.organizerName} numberOfLines={1}>
                {organizer.full_name}
              </Text>
              {organizer.is_verified && <VerifiedBadge size="small" showLabel />}
            </View>

            {/* Subtitle - Category · City */}
            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}

            {/* Contact Button - Scrolls to bottom.
                H4: gated only on public brand socials now (no email/whatsapp/phone). */}
            {socialLinks.length > 0 && (
              <TouchableOpacity
                style={styles.contactButtonHero}
                onPress={scrollToBottom}
              >
                <MessageCircle size={16} color="#FFF" />
                <Text style={styles.contactButtonHeroText}>{t('organizerProfile.contactSocial')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>

        <View style={styles.content}>

          {/* Performance triplet — the shared StatTriplet on every host surface
              (POSH §2.3). "•••" shows while the fetch is still in flight. */}
          <View style={styles.statBlock}>
            <StatTriplet
              items={[
                { label: t('organizerProfile.stats.events'), value: loading ? null : stats.totalEvents || 0 },
                { label: t('organizerProfile.stats.followers'), value: loading ? null : stats.followerCount || 0 },
                { label: t('organizerProfile.stats.sold'), value: loading ? null : stats.totalTicketsSold.toLocaleString() },
              ]}
            />
          </View>

          {/* Connect action — a quiet secondary pill inline under the stats,
              not a prominent full-width card. */}
          {showConnect ? (
            <View style={styles.connectRow}>
              <ConnectButton
                targetUserId={organizerId}
                initialState={friendship}
                size="sm"
                variant="secondary"
                onChange={setFriendship}
                onRequireAuth={() => navigation.navigate('Auth')}
              />
            </View>
          ) : null}

          {/* Upcoming Events */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('organizerProfile.upcomingTitle')}</Text>
            <Text style={styles.sectionSubtitle}>
              {upcomingEvents.length}{' '}
              {t(
                upcomingEvents.length === 1
                  ? 'organizerProfile.upcomingCountSingular'
                  : 'organizerProfile.upcomingCountPlural'
              )}
            </Text>

            {upcomingEvents.length > 0 ? (
              <View style={styles.eventsGrid}>
                {upcomingEvents.map((event) => renderEventCard(event, false))}
              </View>
            ) : (
              <EmptyState
                icon={Calendar}
                title={t('organizerProfile.noUpcomingTitle')}
                subtitle={
                  isFollowing
                    ? t('organizerProfile.noUpcomingBodyFollowing')
                    : t('organizerProfile.noUpcomingBodyNotFollowing')
                }
                compact
              />
            )}
          </View>

          {/* Past Events (Collapsible) */}
          {pastEvents.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setShowPastEvents(!showPastEvents)}
              >
                <View>
                  <Text style={styles.sectionTitle}>{t('organizerProfile.pastTitle')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {pastEvents.length}{' '}
                    {t(
                      pastEvents.length === 1
                        ? 'organizerProfile.pastCountSingular'
                        : 'organizerProfile.pastCountPlural'
                    )}
                  </Text>
                </View>
                {showPastEvents ? (
                  <ChevronUp size={24} color={colors.text} />
                ) : (
                  <ChevronDown size={24} color={colors.text} />
                )}
              </TouchableOpacity>

              {showPastEvents && (
                <View style={styles.eventsGrid}>
                  {pastEvents.slice(0, 6).map((event) => renderEventCard(event, true))}
                </View>
              )}
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('organizerProfile.aboutTitle')}</Text>
            
            {organizer.description && (
              <Text style={styles.aboutText}>{organizer.description}</Text>
            )}

            <View style={styles.aboutDetails}>
              {organizer.city && organizer.country && (
                <View style={styles.aboutRow}>
                  <MapPin size={18} color={colors.textSecondary} />
                  <Text style={styles.aboutLabel}>{t('organizerProfile.locationLabel')}</Text>
                  <Text style={styles.aboutValue}>
                    {organizer.city}, {organizer.country}
                  </Text>
                </View>
              )}

              {organizer.languages && organizer.languages.length > 0 && (
                <View style={styles.aboutRow}>
                  <Globe size={18} color={colors.textSecondary} />
                  <Text style={styles.aboutLabel}>{t('organizerProfile.languagesLabel')}</Text>
                  <Text style={styles.aboutValue}>
                    {organizer.languages.join(', ')}
                  </Text>
                </View>
              )}

              {hostingSince && (
                <View style={styles.aboutRow}>
                  <Calendar size={18} color={colors.textSecondary} />
                  <Text style={styles.aboutLabel}>{t('organizerProfile.hostingSinceLabel')}</Text>
                  <Text style={styles.aboutValue}>{hostingSince}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Social & Contact Section */}
          {socialLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('organizerProfile.connectTitle')}</Text>
              <View style={styles.socialLinks}>
                {socialLinks.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.socialButton, { backgroundColor: link.color + '15' }]}
                    onPress={() => openLink(link.url)}
                  >
                    <link.icon size={22} color={link.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('organizerProfile.reviewsTitle')}</Text>
            <EmptyState
              icon={Star}
              title={t('organizerProfile.reviewsComingSoon')}
              compact
            />
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Premium Hero Section
  hero: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceRaised, // neutral fallback behind poster (not decorative teal)
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  // A clean chevron-back in the top-left, on a subtle scrim disc for legibility
  // over any hero image. Content is bottom-aligned so it never sits on this.
  backButton: {
    position: 'absolute',
    top: 16,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  followButtonSmall: {
    position: 'absolute',
    top: 24,
    right: 16,
    height: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    zIndex: 10,
  },
  followingButtonSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  // White pill = the follow CTA (POSH §2.2): black label on white, never teal.
  followButtonSmallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  followingButtonSmallText: {
    color: '#FFF',
  },
  heroContent: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  organizerName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contactButtonHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 6,
  },
  contactButtonHeroText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Content
  content: {
    padding: 16,
    paddingTop: 24,
  },
  statBlock: {
    marginBottom: 24,
  },

  // Friend connection + personal social. Elevation, not a 1px box (POSH §1).
  socialCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  connectRow: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  socialBio: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  socialChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  socialChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Follow Prompt
  followPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  followLink: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Events
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // About Section
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 16,
  },
  aboutDetails: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  aboutValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },

  // Social Links
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

});
