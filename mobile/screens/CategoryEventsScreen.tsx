import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Inbox } from 'lucide-react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import EventListCard from '../components/EventListCard';
import { ListSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { getCategoryLabel } from '../lib/categories';

export default function CategoryEventsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);

  const { category, title } = route.params || {};

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!category) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Single equality filter only — avoids a Firestore composite index.
        const snap = await getDocs(
          query(collection(db, 'events'), where('category', '==', category))
        );
        const now = new Date();
        const rows = snap.docs
          .map((d) => {
            const data: any = d.data();
            return {
              id: d.id,
              ...data,
              start_datetime: data.start_datetime?.toDate
                ? data.start_datetime.toDate()
                : data.start_datetime
                ? new Date(data.start_datetime)
                : null,
            };
          })
          // Client-side filter: published + upcoming only.
          .filter(
            (e: any) =>
              e.is_published !== false && e.start_datetime && e.start_datetime >= now
          )
          .sort(
            (a: any, b: any) => a.start_datetime.getTime() - b.start_datetime.getTime()
          );
        setEvents(rows);
      } catch (err) {
        console.error('Failed to load category events', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [category]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {(title || getCategoryLabel(t, category) || category || '').toString().toLowerCase()}
        </Text>
      </View>

      {loading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventListCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
          ListEmptyComponent={
            <EmptyState
              icon={Inbox}
              title={t('home.emptyTitle')}
              subtitle={t('home.emptySubtitle')}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      flex: 1,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 26,
      color: colors.text,
      letterSpacing: 0,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
      flexGrow: 1,
    },
  });
