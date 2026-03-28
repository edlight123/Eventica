import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { backendFetch } from '../../lib/api/backend';
import { format } from 'date-fns';

interface RefundRequest {
  id: string;
  ticket_id: string;
  event_title: string;
  attendee_email: string;
  attendee_name: string;
  amount: number;
  reason: string;
  requested_at: string;
  status: 'requested' | 'approved' | 'denied';
}

export default function OrganizerRefundsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed'>('pending');

  const loadData = useCallback(async () => {
    if (!userProfile?.id) return;

    try {
      const response = await backendFetch('/api/organizer/refunds');
      
      if (response.ok) {
        const data = await response.json();
        setRefundRequests(data.refunds || []);
      } else {
        // Fallback: Load from Firebase
        await loadFromFirebase();
      }
    } catch (error) {
      console.error('Error loading refunds:', error);
      await loadFromFirebase();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.id]);

  const loadFromFirebase = async () => {
    try {
      // Get organizer's events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', userProfile?.id)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventIds = eventsSnapshot.docs.map(doc => doc.id);
      const eventsMap = new Map(eventsSnapshot.docs.map(doc => [doc.id, doc.data()]));

      if (eventIds.length === 0) {
        setRefundRequests([]);
        return;
      }

      // Get tickets with refund requests
      const requests: RefundRequest[] = [];
      for (const eventId of eventIds) {
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('event_id', '==', eventId),
          where('refund_status', 'in', ['requested', 'approved', 'denied'])
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        ticketsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const event = eventsMap.get(eventId);
          requests.push({
            id: doc.id,
            ticket_id: doc.id,
            event_title: (event as any)?.title || 'Unknown Event',
            attendee_email: data.attendee_email || '',
            attendee_name: data.attendee_name || '',
            amount: data.price_paid || data.price || 0,
            reason: data.refund_reason || '',
            requested_at: data.refund_requested_at || data.created_at,
            status: data.refund_status,
          });
        });
      }

      // Sort by request date (newest first)
      requests.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
      setRefundRequests(requests);
    } catch (error) {
      console.error('Error loading from Firebase:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleProcessRefund = async (ticketId: string, action: 'approve' | 'deny') => {
    Alert.alert(
      action === 'approve' 
        ? (t('refunds.approveTitle') || 'Approve Refund')
        : (t('refunds.denyTitle') || 'Deny Refund'),
      action === 'approve'
        ? (t('refunds.approveBody') || 'This will initiate a refund to the customer. Continue?')
        : (t('refunds.denyBody') || 'Are you sure you want to deny this refund request?'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm') || 'Confirm',
          style: action === 'deny' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessing(ticketId);
            try {
              const response = await backendFetch('/api/refunds/process', {
                method: 'POST',
                body: JSON.stringify({
                  ticketId,
                  action,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.error || 'Failed to process refund');
              }

              Alert.alert(
                t('common.success'),
                action === 'approve'
                  ? (t('refunds.approvedSuccess') || 'Refund approved and processed')
                  : (t('refunds.deniedSuccess') || 'Refund request denied')
              );

              // Reload data
              loadData();
            } catch (error: any) {
              console.error('Error processing refund:', error);
              Alert.alert(t('common.error'), error.message || 'Failed to process refund');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const filteredRequests = refundRequests.filter(r => {
    if (filter === 'pending') return r.status === 'requested';
    if (filter === 'processed') return r.status !== 'requested';
    return true;
  });

  const pendingCount = refundRequests.filter(r => r.status === 'requested').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('refunds.loading') || 'Loading refund requests...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('refunds.title') || 'Refund Requests'}</Text>
        <View style={styles.badgeContainer}>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['pending', 'processed', 'all'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[styles.filterButton, filter === filterOption && styles.filterButtonActive]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[styles.filterText, filter === filterOption && styles.filterTextActive]}>
              {filterOption === 'pending' ? (t('refunds.pending') || 'Pending') :
               filterOption === 'processed' ? (t('refunds.processed') || 'Processed') :
               (t('refunds.all') || 'All')}
              {filterOption === 'pending' && pendingCount > 0 && ` (${pendingCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {filter === 'pending' 
                ? (t('refunds.noPending') || 'No pending requests')
                : (t('refunds.noRequests') || 'No refund requests')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('refunds.emptyDescription') || 'Refund requests from attendees will appear here'}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.eventTitle} numberOfLines={1}>{request.event_title}</Text>
                <View style={[
                  styles.statusBadge,
                  request.status === 'requested' && styles.statusPending,
                  request.status === 'approved' && styles.statusApproved,
                  request.status === 'denied' && styles.statusDenied,
                ]}>
                  <Text style={styles.statusText}>
                    {request.status === 'requested' ? (t('refunds.statusPending') || 'Pending') :
                     request.status === 'approved' ? (t('refunds.statusApproved') || 'Approved') :
                     (t('refunds.statusDenied') || 'Denied')}
                  </Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{request.attendee_name || request.attendee_email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>${request.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {request.requested_at && format(new Date(request.requested_at), 'MMM dd, yyyy h:mm a')}
                  </Text>
                </View>
              </View>

              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>{t('refunds.reason') || 'Reason'}:</Text>
                <Text style={styles.reasonText}>{request.reason || 'No reason provided'}</Text>
              </View>

              {request.status === 'requested' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyButton]}
                    onPress={() => handleProcessRefund(request.ticket_id, 'deny')}
                    disabled={processing === request.ticket_id}
                  >
                    {processing === request.ticket_id ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={18} color={colors.error} />
                        <Text style={styles.denyButtonText}>{t('refunds.deny') || 'Deny'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleProcessRefund(request.ticket_id, 'approve')}
                    disabled={processing === request.ticket_id}
                  >
                    {processing === request.ticket_id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.approveButtonText}>{t('refunds.approve') || 'Approve'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  badgeContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  requestCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
  },
  statusApproved: {
    backgroundColor: '#D4EDDA',
  },
  statusDenied: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  reasonBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  denyButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
