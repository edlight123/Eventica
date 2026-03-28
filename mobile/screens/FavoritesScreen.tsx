import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, MapPin, Heart, Share2, Ticket } from 'lucide-react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDocs as getDocsFirestore } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { getCategoryLabel } from '../lib/categories';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

export default function FavoritesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [favoriteEvents, setFavoriteEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get favorite event IDs
      const favoritesRef = collection(db, 'event_favorites');
      const favoritesQuery = query(favoritesRef, where('user_id', '==', user.uid));
      const favoritesSnapshot = await getDocs(favoritesQuery);
      
      if (favoritesSnapshot.empty) {
        setFavoriteEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const eventIds = favoritesSnapshot.docs.map(doc => doc.data().event_id);

      // Get events (batch by 10 for Firestore 'in' query limit)
      const allEvents: any[] = [];
      for (let i = 0; i < eventIds.length; i += 10) {
        const batch = eventIds.slice(i, i + 10);
        const eventsQuery = query(
          collection(db, 'events'),
          where('__name__', 'in', batch)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        eventsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allEvents.push({
            id: doc.id,
            ...data,
            start_datetime: data.start_datetime?.toDate ? data.start_datetime.toDate() : data.start_datetime ? new Date(data.start_datetime) : null,
            end_datetime: data.end_datetime?.toDate ? data.end_datetime.toDate() : data.end_datetime ? new Date(data.end_datetime) : null
          });
        });
      }

      setFavoriteEvents(allEvents);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const removeFavorite = async (eventId: string) => {
    Alert.alert(
      t('favorites.removeTitle'),
      t('favorites.removeBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              const favoritesRef = collection(db, 'event_favorites');
              const q = query(
                favoritesRef,
                where('user_id', '==', user?.uid),
                where('event_id', '==', eventId)
              );
              const snapshot = await getDocs(q);
              
              snapshot.docs.forEach(async (docSnapshot) => {
                await deleteDoc(doc(db, 'event_favorites', docSnapshot.id));
              });

              // Update local state
              setFavoriteEvents(prev => prev.filter(event => event.id !== eventId));
              
              Alert.alert(t('common.success'), t('favorites.removeSuccess'));
            } catch (error) {
              console.error('Error removing favorite:', error);
              Alert.alert(t('common.error'), t('favorites.removeError'));
            }
          }
        }
      ]
    );
  };

  const handleShare = async (event: any) => {
    try {
      await Share.share({
        message: `Check out ${event.title}!\n\nDate: ${event.start_datetime && format(event.start_datetime, 'EEEE, MMMM dd, yyyy')}\nVenue: ${event.venue_name}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Heart size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>{t('auth.loginRequiredTitle')}</Text>
        <Text style={styles.emptyText}>{t('favorites.loginRequiredBody')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {favoriteEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>{t('favorites.emptyTitle')}</Text>
            <Text style={styles.emptyText}>
              {t('favorites.emptyBody')}
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Discover')}
            >
              <Text style={styles.exploreButtonText}>{t('favorites.explore')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          favoriteEvents.map(event => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            >
              {/* Event Image */}
              {(event.banner_image_url || event.cover_image_url) && (
                <Image
                  source={{ uri: event.banner_image_url || event.cover_image_url }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
              )}

              {/* Category Badge */}
              {event.category && (
                <View style={styles.categoryBadgeOverlay}>
                  <Text style={styles.categoryBadgeText}>{getCategoryLabel(t, event.category)}</Text>
                </View>
              )}

              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                </View>

                <View style={styles.eventDetails}>
                  <View style={styles.eventDetailRow}>
                    <Calendar size={16} color={colors.primary} />
                    <Text style={styles.eventDetailText}>
                      {event.start_datetime && format(event.start_datetime, 'MMM dd, yyyy • h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <MapPin size={16} color={colors.primary} />
                    <Text style={styles.eventDetailText} numberOfLines={1}>
                      {event.venue_name}, {event.city}
                    </Text>
                  </View>
                </View>

                <View style={styles.eventFooter}>
                  <View style={styles.priceSection}>
                    {event.ticket_price > 0 ? (
                      <>
                        <Text style={styles.eventPrice}>
                          {event.currency || 'HTG'} {event.ticket_price}
                        </Text>
                        {event.tickets_sold > 0 && (
                          <Text style={styles.ticketsSold}>
                            {event.tickets_sold} {t('common.sold')}
                          </Text>
                        )}
                      </>
                    ) : (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>{t('common.free')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShare(event);
                      }}
                    >
                      <Share2 size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        removeFavorite(event.id);
                      }}
                    >
                      <Heart size={18} color={colors.error} fill={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.surface,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.surface,
    marginTop: 4,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  eventCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.borderLight,
  },
  categoryBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  categoryBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketsSold: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  freeBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});