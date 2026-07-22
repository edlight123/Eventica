import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  Alert,
  Share,
  StatusBar,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Share2, Ticket, Compass } from 'lucide-react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDocs as getDocsFirestore } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import EmptyState from '../components/EmptyState';
import PosterEventCard from '../components/PosterEventCard';
import { GridSkeleton } from '../components/Skeleton';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const FAV_COLUMN_WIDTH = (width - 32 - 12) / 2;

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
        <EmptyState
          icon={Heart}
          title={t('auth.loginRequiredTitle')}
          subtitle={t('favorites.loginRequiredBody')}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
        </View>
        <GridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{t('favorites.title')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {favoriteEvents.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t('favorites.emptyTitle')}
            subtitle={t('favorites.emptyBody')}
            actionLabel={t('favorites.explore')}
            onAction={() => navigation.navigate('Discover')}
          />
        ) : (
          <View style={styles.eventsGrid}>
            {favoriteEvents.map(event => (
              <PosterEventCard
                key={event.id}
                event={event}
                width={FAV_COLUMN_WIDTH}
                onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                overlay={
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleShare(event)}
                      hitSlop={8}
                    >
                      <Share2 size={15} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => removeFavorite(event.id)}
                      hitSlop={8}
                    >
                      <Heart size={15} color={colors.error} fill={colors.error} />
                    </TouchableOpacity>
                  </View>
                }
              />
            ))}
          </View>
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
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
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