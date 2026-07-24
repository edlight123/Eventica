import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ticket } from 'lucide-react-native';
import { auth } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { RADIUS } from '../../config/brand';
import { useStaffEvents } from '../../hooks/useStaffEvents';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import InfoNotice from '../../components/organizer/InfoNotice';
import StaffEventCard from '../../components/organizer/StaffEventCard';
import EmptyState from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';

export default function StaffEventsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const { events, loading, refreshing, refresh } = useStaffEvents();
  const uid = auth.currentUser?.uid || null;

  const emptyText = useMemo(() => {
    if (!uid) return t('staffEvents.signIn');
    return t('staffEvents.noAssigned');
  }, [uid, t]);

  return (
    <View style={styles.container}>
      <OrganizerScreenHeader
        title={t('staffEvents.assignedTitle')}
        subtitle={t('staffEvents.assignedSubtitle')}
      />

      <View style={styles.notice}>
        <InfoNotice text={t('staffEvents.staffModeSubtitle')} />
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 16 + insets.bottom },
          events.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingList}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width="100%" height={84} radius={RADIUS.lg} style={{ marginBottom: 12 }} />
              ))}
            </View>
          ) : (
            <EmptyState icon={Ticket} title={emptyText} />
          )
        }
        renderItem={({ item }) => (
          <StaffEventCard
            title={item.title}
            subtitle={`${item.venue_name ? item.venue_name : t('common.venue')}${item.city ? ` • ${item.city}` : ''}`}
            meta={t('staffEvents.openScanner')}
            onPress={() => (navigation as any).navigate('TicketScanner', { eventId: item.id })}
          />
        )}
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notice: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  listEmpty: {
    flexGrow: 1,
  },
  loadingList: {
    paddingTop: 8,
  },
});
