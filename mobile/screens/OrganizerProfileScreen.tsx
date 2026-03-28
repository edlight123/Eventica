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
import {
  Shield,
  Calendar,
  Users,
  Star,
  ChevronLeft,
  MapPin,
  Globe,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react-native';
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 300;

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
      const organizerDoc = await getDoc(doc(db, 'users', organizerId));
      if (!organizerDoc.exists()) {
        navigation.goBack();
        return;
      }

      const organizerData = {
        id: organizerDoc.id,
        ...organizerDoc.data()
      };
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
    
    if (organizer?.whatsapp) {
      links.push({
        type: 'whatsapp',
        url: `https://wa.me/${organizer.whatsapp}`,
        icon: MessageCircle,
        color: '#25D366',
      });
    }
    
    if (organizer?.email) {
      links.push({
        type: 'email',
        url: `mailto:${organizer.email}`,
        icon: Mail,
        color: '#EF4444',
      });
    }
    
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
    <TouchableOpacity
      key={event.id}
      style={isCompact ? styles.eventCardCompact : styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
      activeOpacity={0.9}
    >
      {event.banner_image_url ? (
        <Image
          source={{ uri: event.banner_image_url }}
          style={isCompact ? styles.eventImageCompact : styles.eventImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[isCompact ? styles.eventImageCompact : styles.eventImage, styles.eventImagePlaceholder]}>
          <Calendar size={isCompact ? 20 : 32} color={colors.primary + '40'} />
        </View>
      )}

      {event.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryLabel(t, event.category)}</Text>
        </View>
      )}

      <View style={styles.eventCardContent}>
        <Text style={isCompact ? styles.eventTitleCompact : styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.eventMeta}>
          <Text style={styles.eventDate}>
            {format(event.start_datetime, 'MMM d, yyyy')}
          </Text>
          {event.city && (
            <Text style={styles.eventLocation} numberOfLines={1}>
              {event.city}
            </Text>
          )}
        </View>

        {!isCompact && (
          <View style={styles.eventFooter}>
            {event.ticket_price > 0 ? (
              <Text style={styles.eventPrice}>
                {event.currency || 'HTG'} {event.ticket_price.toLocaleString()}
              </Text>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>{t('common.free')}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  const hostingSince = organizer.createdAt 
    ? new Date(organizer.createdAt.seconds ? organizer.createdAt.seconds * 1000 : organizer.createdAt).getFullYear()
    : null;
  const subtitle = getSubtitle();

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

          {/* Circular Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 12 }]}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>

          {/* Small Follow Button - Top Right */}
          <TouchableOpacity
            style={[styles.followButtonSmall, { top: insets.top + 24 }, isFollowing && styles.followingButtonSmall]}
            onPress={handleFollow}
          >
            <Text style={[styles.followButtonSmallText, isFollowing && styles.followingButtonSmallText]}>
              {isFollowing ? t('organizerProfile.following') : t('organizerProfile.follow')}
            </Text>
          </TouchableOpacity>

          {/* Hero Content - Bottom Aligned */}
          <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
            {/* Avatar */}
            <View style={styles.avatar}>
              {organizer.avatarUrl ? (
                <Image source={{ uri: organizer.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {organizer.full_name[0].toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name + Verified Badge */}
            <View style={styles.nameRow}>
              <Text style={styles.organizerName} numberOfLines={1}>
                {organizer.full_name}
              </Text>
              {organizer.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Shield size={10} color="#FFF" fill="#FFF" />
                  <Text style={styles.verifiedText}>{t('organizerProfile.verified')}</Text>
                </View>
              )}
            </View>

            {/* Subtitle - Category · City */}
            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}

            {/* Stats In Hero - Horizontal Scroll */}
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Calendar size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatValue}>{stats.totalEvents || 0}</Text>
                <Text style={styles.heroStatLabel}>{t('organizerProfile.stats.events')}</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Users size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatValue}>{stats.followerCount || 0}</Text>
                <Text style={styles.heroStatLabel}>{t('organizerProfile.stats.followers')}</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Star size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroStatValue}>{stats.totalTicketsSold.toLocaleString()}</Text>
                <Text style={styles.heroStatLabel}>{t('organizerProfile.stats.sold')}</Text>
              </View>
            </View>

            {/* Contact Button - Scrolls to bottom */}
            {(organizer.whatsapp || organizer.phone || organizer.email || socialLinks.length > 0) && (
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
              <View style={styles.emptyState}>
                <Calendar size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>{t('organizerProfile.noUpcomingTitle')}</Text>
                <Text style={styles.emptyStateText}>
                  {isFollowing 
                    ? t('organizerProfile.noUpcomingBodyFollowing')
                    : t('organizerProfile.noUpcomingBodyNotFollowing')}
                </Text>
              </View>
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
            <View style={styles.reviewsPlaceholder}>
              <Star size={40} color={colors.textSecondary} />
              <Text style={styles.reviewsPlaceholderText}>
                {t('organizerProfile.reviewsComingSoon')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Premium Hero Section
  hero: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-start',
    backgroundColor: colors.primary, // Fallback color
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
  followButtonSmallText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroStatLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
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

  // Slim Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Content
  content: {
    padding: 16,
    paddingTop: 48,
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
    fontSize: 20,
    fontWeight: '700',
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
    gap: 16,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardCompact: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.borderLight,
  },
  eventImageCompact: {
    width: 100,
    height: 100,
    backgroundColor: colors.borderLight,
  },
  eventImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  eventCardContent: {
    padding: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  eventTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  eventMeta: {
    gap: 4,
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  eventLocation: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  freeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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

  // Reviews Placeholder
  reviewsPlaceholder: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewsPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
});
