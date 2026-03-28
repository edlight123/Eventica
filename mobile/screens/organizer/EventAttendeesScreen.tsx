import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useI18n } from '../../contexts/I18nContext';
import ExportAttendeesButton from '../../components/ExportAttendeesButton';

type RouteParams = {
  EventAttendees: {
    eventId: string;
  };
};

interface Attendee {
  id: string;
  attendee_name: string;
  attendee_email: string;
  tier_name: string;
  price_paid: number;
  purchased_at: any;
  checked_in_at: any;
  checked_in?: boolean;
  status: string;
}

export default function EventAttendeesScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'EventAttendees'>>();
  const navigation = useNavigation();
  const { eventId } = route.params;

  const insets = useSafeAreaInsets();

  const { t, language } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');

  useEffect(() => {
    loadAttendees();
  }, [eventId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendees();
    setRefreshing(false);
  };

  useEffect(() => {
    filterAttendees();
  }, [attendees, searchQuery, filterStatus]);

  const loadAttendees = async () => {
    try {
      const q = query(
        collection(db, 'tickets'),
        where('event_id', '==', eventId)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Attendee[];

      setAttendees(data);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendees = () => {
    let filtered = [...attendees];

    const isCheckedIn = (a: Attendee) => {
      return !!a.checked_in_at || a.checked_in === true || String(a.status || '').toLowerCase() === 'checked_in';
    };

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.attendee_name?.toLowerCase().includes(query) ||
          a.attendee_email?.toLowerCase().includes(query)
      );
    }

    // Filter by check-in status
    if (filterStatus === 'checked_in') {
      filtered = filtered.filter((a) => isCheckedIn(a));
    } else if (filterStatus === 'not_checked_in') {
      filtered = filtered.filter((a) => !isCheckedIn(a));
    }

    setFilteredAttendees(filtered);
  };

  const renderAttendee = ({ item }: { item: Attendee }) => {
    const checkedIn = !!item.checked_in_at || item.checked_in === true || String(item.status || '').toLowerCase() === 'checked_in';
    const purchaseDate = item.purchased_at?.toDate
      ? item.purchased_at.toDate()
      : new Date(item.purchased_at);

    return (
      <View style={styles.attendeeCard}>
        <View style={styles.attendeeHeader}>
          <View style={styles.attendeeInfo}>
            <Text style={styles.attendeeName}>{item.attendee_name || t('common.na')}</Text>
            <Text style={styles.attendeeEmail}>{item.attendee_email || t('common.na')}</Text>
          </View>
          <View style={[styles.statusBadge, checkedIn && styles.statusBadgeCheckedIn]}>
            <Ionicons
              name={checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={16}
              color={checkedIn ? colors.success : colors.warning}
            />
            <Text
              style={[styles.statusText, checkedIn && styles.statusTextCheckedIn]}
            >
              {checkedIn ? t('organizerAttendees.status.checkedIn') : t('organizerAttendees.status.notCheckedIn')}
            </Text>
          </View>
        </View>

        <View style={styles.attendeeDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.tier_name || t('common.general')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              ${item.price_paid?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {purchaseDate.toLocaleDateString(locale)}
            </Text>
          </View>
        </View>

        {checkedIn && item.checked_in_at && (
          <View style={styles.checkedInInfo}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.checkedInText}>
              {t('organizerAttendees.checkedInPrefix')}{
                item.checked_in_at.toDate
                  ? item.checked_in_at.toDate().toLocaleString(locale)
                  : new Date(item.checked_in_at).toLocaleString(locale)
              }
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('organizerAttendees.loading')}</Text>
      </View>
    );
  }

  const checkedInCount = attendees.filter((a) => a.checked_in_at || a.checked_in === true || String(a.status || '').toLowerCase() === 'checked_in').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('organizerAttendees.headerTitle')}</Text>
        <View style={styles.headerActions}>
          <ExportAttendeesButton eventId={eventId} attendees={attendees} />
        </View>
      </View>
      
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsBarText}>
          {checkedInCount}/{attendees.length} {t('organizerAttendees.headerCheckedInSuffix')}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('organizerAttendees.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'all' && styles.filterTabTextActive,
            ]}
          >
            {t('organizerAttendees.filters.all')} ({attendees.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'checked_in' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('checked_in')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'checked_in' && styles.filterTabTextActive,
            ]}
          >
            {t('organizerAttendees.filters.checkedIn')} ({checkedInCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filterStatus === 'not_checked_in' && styles.filterTabActive,
          ]}
          onPress={() => setFilterStatus('not_checked_in')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'not_checked_in' && styles.filterTabTextActive,
            ]}
          >
            {t('organizerAttendees.filters.notCheckedIn')} ({attendees.length - checkedInCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Attendees list */}
      <FlatList
        data={filteredAttendees}
        renderItem={renderAttendee}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>
              {searchQuery ? t('organizerAttendees.empty.filtered') : t('organizerAttendees.empty.default')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerStats: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statsBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  attendeeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  attendeeEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warningLight,
  },
  statusBadgeCheckedIn: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 4,
  },
  statusTextCheckedIn: {
    color: colors.success,
  },
  attendeeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  checkedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkedInText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
