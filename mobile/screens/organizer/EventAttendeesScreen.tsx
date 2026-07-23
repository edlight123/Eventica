import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useI18n } from '../../contexts/I18nContext';
import { useLocaleFormat } from '../../lib/format';
import ExportAttendeesButton from '../../components/ExportAttendeesButton';
import { SPACING, RADIUS } from '../../config/brand';
import { Skeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import StatusChip from '../../components/StatusChip';
import MoneyText from '../../components/MoneyText';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import SegmentedTabs from '../../components/organizer/SegmentedTabs';
import { Users } from 'lucide-react-native';

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
  currency?: string;
  purchased_at: any;
  checked_in_at: any;
  checked_in?: boolean;
  status: string;
}

/** A ticket is checked in if any of the three signals say so. */
const isCheckedIn = (a: Attendee): boolean =>
  !!a.checked_in_at || a.checked_in === true || String(a.status || '').toLowerCase() === 'checked_in';

export default function EventAttendeesScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<RouteProp<RouteParams, 'EventAttendees'>>();
  const navigation = useNavigation();
  const { eventId } = route.params;

  const insets = useSafeAreaInsets();

  const { t } = useI18n();
  const { formatDate } = useLocaleFormat();

  const [attendees, setAttendees] = useState<Attendee[]>([]);
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

  // Derive the visible list from the source data + filters — no effect/state
  // shadow copy to keep in sync.
  const filteredAttendees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attendees.filter((a) => {
      if (q && !(
        a.attendee_name?.toLowerCase().includes(q) ||
        a.attendee_email?.toLowerCase().includes(q)
      )) {
        return false;
      }
      if (filterStatus === 'checked_in') return isCheckedIn(a);
      if (filterStatus === 'not_checked_in') return !isCheckedIn(a);
      return true;
    });
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

  const renderAttendee = ({ item }: { item: Attendee }) => {
    const checkedIn = isCheckedIn(item);

    return (
      <View style={styles.attendeeCard}>
        <View style={styles.attendeeHeader}>
          <View style={styles.attendeeInfo}>
            <Text style={styles.attendeeName} numberOfLines={1}>{item.attendee_name || t('common.na')}</Text>
            <Text style={styles.attendeeEmail} numberOfLines={1}>{item.attendee_email || t('common.na')}</Text>
          </View>
          <StatusChip
            status={checkedIn ? 'success' : 'pending'}
            label={checkedIn ? t('organizerAttendees.status.checkedIn') : t('organizerAttendees.status.notCheckedIn')}
          />
        </View>

        <View style={styles.attendeeDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="ticket-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.tier_name || t('common.general')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <MoneyText amount={item.price_paid || 0} currency={item.currency as any} style={styles.priceText} />
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatDate(item.purchased_at)}
            </Text>
          </View>
        </View>

        {checkedIn && item.checked_in_at && (
          <View style={styles.checkedInInfo}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.checkedInText}>
              {t('organizerAttendees.checkedInPrefix')}{formatDate(item.checked_in_at, 'MMM d, yyyy • h:mm a')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <OrganizerScreenHeader title={t('organizerAttendees.headerTitle')} onBack={() => navigation.goBack()} />
        <View style={{ padding: SPACING.lg }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={132} radius={RADIUS.lg} style={{ marginBottom: SPACING.md }} />
          ))}
        </View>
      </View>
    );
  }

  const checkedInCount = attendees.filter(isCheckedIn).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <OrganizerScreenHeader
        title={t('organizerAttendees.headerTitle')}
        onBack={() => navigation.goBack()}
        right={<ExportAttendeesButton eventId={eventId} attendees={attendees} />}
      />

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
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterTabsWrap}>
        <SegmentedTabs
          value={filterStatus}
          onChange={(key) => setFilterStatus(key as 'all' | 'checked_in' | 'not_checked_in')}
          tabs={[
            { key: 'all', label: t('organizerAttendees.filters.all'), count: attendees.length },
            { key: 'checked_in', label: t('organizerAttendees.filters.checkedIn'), count: checkedInCount },
            { key: 'not_checked_in', label: t('organizerAttendees.filters.notCheckedIn'), count: attendees.length - checkedInCount },
          ]}
        />
      </View>

      {/* Attendees list */}
      <FlatList
        data={filteredAttendees}
        renderItem={renderAttendee}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Users}
            title={searchQuery ? t('organizerAttendees.empty.filtered') : t('organizerAttendees.empty.default')}
          />
        }
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  statsBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  filterTabsWrap: {
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  attendeeCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendeeInfo: {
    flex: 1,
    marginRight: 12,
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
  priceText: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.textSecondary,
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
});
