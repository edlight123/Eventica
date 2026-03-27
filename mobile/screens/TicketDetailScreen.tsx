import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { Calendar, MapPin, User as UserIcon, Ticket as TicketIcon, Send, Star, RotateCcw } from 'lucide-react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';
import QRCode from 'react-native-qrcode-svg';
import TransferTicketModal from '../components/TransferTicketModal';
import AddToWalletButton from '../components/AddToWalletButton';
import { useI18n } from '../contexts/I18nContext';
import { useNavigation } from '@react-navigation/native';

export default function TicketDetailScreen({ route }: any) {
  const { ticketId } = route.params;
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<any>(null);

  useEffect(() => {
    fetchTicketDetails();
    fetchPendingTransfer();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        const data = ticketDoc.data();
        setTicket({ 
          id: ticketDoc.id, 
          ...data,
          event_date: data.event_date?.toDate ? data.event_date.toDate() : data.event_date ? new Date(data.event_date) : null,
          purchase_date: data.purchase_date?.toDate ? data.purchase_date.toDate() : data.purchase_date ? new Date(data.purchase_date) : null
        });
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert(t('common.error'), t('ticketDetail.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTransfer = async () => {
    try {
      const { getDocs, collection, query, where } = await import('firebase/firestore');
      const transfersQuery = query(
        collection(db, 'ticket_transfers'),
        where('ticket_id', '==', ticketId),
        where('status', '==', 'pending')
      );
      const transfersSnapshot = await getDocs(transfersQuery);
      
      if (!transfersSnapshot.empty) {
        const transferDoc = transfersSnapshot.docs[0];
        const data = transferDoc.data();
        setPendingTransfer({
          id: transferDoc.id,
          ...data,
          expires_at: data.expires_at?.toDate ? data.expires_at.toDate() : data.expires_at ? new Date(data.expires_at) : null,
        });
      }
    } catch (error) {
      console.error('Error fetching pending transfer:', error);
    }
  };

  const handleCancelTransfer = async () => {
    if (!pendingTransfer) return;

    Alert.alert(
      t('ticketDetail.transfer.cancelTitle'),
      t('ticketDetail.transfer.cancelBody'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('ticketDetail.transfer.yesCancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { updateDoc, doc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'ticket_transfers', pendingTransfer.id), {
                status: 'cancelled',
                updated_at: new Date().toISOString()
              });
              setPendingTransfer(null);
              Alert.alert(t('common.success'), t('ticketDetail.transfer.cancelSuccess'));
            } catch (error) {
              console.error('Error cancelling transfer:', error);
              Alert.alert(t('common.error'), t('ticketDetail.transfer.cancelError'));
            }
          }
        }
      ]
    );
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{t('ticketDetail.notFound')}</Text>
      </View>
    );
  }

  // Check if event has ended (ticket expired)
  const now = new Date();
  const eventEnd = new Date(ticket.end_datetime || ticket.event_date || ticket.start_datetime);
  const isExpired = now > eventEnd;

  const statusLabel = (() => {
    if (isExpired) return t('ticketDetail.status.expired');
    const raw = String(ticket.status || '').toLowerCase();
    if (raw === 'confirmed') return t('ticketDetail.status.confirmed');
    if (raw === 'used') return t('ticketDetail.status.used');
    if (raw === 'active') return t('ticketDetail.status.active');
    return String(ticket.status || '').toUpperCase();
  })();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header with Title */}
          <View style={styles.header}>
            <Text style={styles.eventTitle}>{ticket.event_title}</Text>
          </View>

          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            isExpired && styles.statusExpired,
            !isExpired && ticket.status === 'confirmed' && styles.statusConfirmed,
            !isExpired && ticket.status === 'used' && styles.statusUsed,
          ]}>
            <Text style={styles.statusText}>
              {statusLabel}
            </Text>
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={[styles.qrContainer, isExpired && styles.qrContainerDimmed]}>
              <QRCode
                value={ticket.qr_code || ticketId}
                size={220}
                backgroundColor="white"
                color={COLORS.primary}
                logo={require('../assets/eventica_logo_color.png')}
                logoSize={48}
                logoBackgroundColor="white"
                logoBorderRadius={6}
              />
            </View>
            <Text style={styles.qrInstruction}>
              {isExpired 
                ? t('ticketDetail.qr.expiredBody')
                : t('ticketDetail.qr.instruction')
              }
            </Text>
          </View>

          {/* Transfer Button */}
          {(ticket.status === 'confirmed' || ticket.status === 'active') && (
            <>
              {/* Pending Transfer Status */}
              {pendingTransfer && (
                <View style={styles.pendingTransferCard}>
                  <View style={styles.pendingTransferHeader}>
                    <View style={styles.pendingTransferBadge}>
                      <Text style={styles.pendingTransferBadgeText}>⏳ {t('ticketDetail.transfer.pending')}</Text>
                    </View>
                  </View>
                  <Text style={styles.pendingTransferEmail}>
                    {t('ticketDetail.transfer.sentTo')} <Text style={styles.pendingTransferEmailBold}>{pendingTransfer.to_email}</Text>
                  </Text>
                  {pendingTransfer.expires_at && (
                    <Text style={styles.pendingTransferExpiry}>
                      {t('ticketDetail.transfer.expires')} {format(pendingTransfer.expires_at, 'MMM dd, yyyy h:mm a')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.cancelTransferButton}
                    onPress={handleCancelTransfer}
                  >
                    <Text style={styles.cancelTransferButtonText}>{t('ticketDetail.transfer.cancelButton')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Transfer Button - Only show if no pending transfer */}
              {!pendingTransfer && (
                <TouchableOpacity
                  style={styles.transferButton}
                  onPress={() => setShowTransferModal(true)}
                >
                  <View style={styles.transferButtonContent}>
                    <View style={styles.transferButtonIcon}>
                      <Send size={22} color="#FFF" />
                    </View>
                    <View style={styles.transferButtonTextContainer}>
                      <Text style={styles.transferButtonTitle}>{t('ticketDetail.transfer.buttonTitle')}</Text>
                      <Text style={styles.transferButtonSubtitle}>{t('ticketDetail.transfer.buttonSubtitle')}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Key Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>{t('ticketDetail.labels.dateTime')}</Text>
                <Text style={styles.infoCardValue}>
                  {ticket.event_date && format(ticket.event_date, 'MMM dd, yyyy')}
                </Text>
                <Text style={styles.infoCardSubvalue}>
                  {ticket.event_date && format(ticket.event_date, 'h:mm a')}
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <MapPin size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>{t('ticketDetail.labels.venue')}</Text>
                <Text style={styles.infoCardValue}>{ticket.venue_name}</Text>
                <Text style={styles.infoCardSubvalue}>{ticket.city}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoCardIcon}>
                <UserIcon size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>{t('ticketDetail.labels.attendee')}</Text>
                <Text style={styles.infoCardValue}>{ticket.user_name}</Text>
                <Text style={styles.infoCardSubvalue}>{ticket.user_email}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <TicketIcon size={20} color={COLORS.primary} />
              <Text style={styles.detailsTitle}>{t('ticketDetail.details.title')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('ticketDetail.details.type')}</Text>
              <Text style={styles.detailValue}>{ticket.ticket_type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('ticketDetail.details.quantity')}</Text>
              <Text style={styles.detailValue}>{ticket.quantity}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('ticketDetail.details.price')}</Text>
              <Text style={styles.detailValue}>{ticket.currency} {ticket.price}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('ticketDetail.details.ticketId')}</Text>
              <Text style={[styles.detailValue, styles.ticketId]} numberOfLines={1}>
                {ticket.id}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('ticketDetail.details.purchaseDate')}</Text>
              <Text style={styles.detailValue}>
                {ticket.purchase_date && format(ticket.purchase_date, 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>

          {/* Add to Wallet Button */}
          {(ticket.status === 'confirmed' || ticket.status === 'active') && (
            <View style={styles.walletSection}>
              <AddToWalletButton
                ticketId={ticket.id}
                qrCodeData={ticket.qr_code || ticket.id}
                eventTitle={ticket.event_title}
                eventDate={ticket.event_date ? format(ticket.event_date, 'MMMM dd, yyyy h:mm a') : ''}
                venueName={ticket.venue_name}
                ticketNumber={1}
                totalTickets={ticket.quantity || 1}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsSection}>
            {/* Request Refund Button - Only show for upcoming events */}
            {!isExpired && (ticket.status === 'confirmed' || ticket.status === 'active') && 
             !ticket.refund_status && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('RefundRequest', { ticketId: ticket.id })}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.error + '15' }]}>
                  <RotateCcw size={20} color={COLORS.error} />
                </View>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>{t('ticketDetail.actions.requestRefund') || 'Request Refund'}</Text>
                  <Text style={styles.actionButtonSubtitle}>{t('ticketDetail.actions.refundSubtitle') || 'Get your money back'}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Refund Status Badge */}
            {ticket.refund_status && ticket.refund_status !== 'none' && (
              <View style={[styles.refundStatusBadge, 
                ticket.refund_status === 'requested' && styles.refundStatusPending,
                ticket.refund_status === 'approved' && styles.refundStatusApproved,
                ticket.refund_status === 'denied' && styles.refundStatusDenied,
              ]}>
                <RotateCcw size={16} color={
                  ticket.refund_status === 'approved' ? COLORS.success :
                  ticket.refund_status === 'denied' ? COLORS.error : '#B45309'
                } />
                <Text style={[styles.refundStatusText,
                  ticket.refund_status === 'approved' && { color: COLORS.success },
                  ticket.refund_status === 'denied' && { color: COLORS.error },
                ]}>
                  {ticket.refund_status === 'requested' ? (t('ticketDetail.refund.pending') || 'Refund Pending') :
                   ticket.refund_status === 'approved' ? (t('ticketDetail.refund.approved') || 'Refund Approved') :
                   (t('ticketDetail.refund.denied') || 'Refund Denied')}
                </Text>
              </View>
            )}

            {/* Leave Review Button - Only show for past events */}
            {isExpired && (ticket.status === 'used' || ticket.status === 'confirmed') && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Review', { 
                  ticketId: ticket.id, 
                  eventId: ticket.event_id,
                  eventTitle: ticket.event_title 
                })}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: '#FFB800' + '20' }]}>
                  <Star size={20} color="#FFB800" />
                </View>
                <View style={styles.actionButtonText}>
                  <Text style={styles.actionButtonTitle}>{t('ticketDetail.actions.leaveReview') || 'Leave a Review'}</Text>
                  <Text style={styles.actionButtonSubtitle}>{t('ticketDetail.actions.reviewSubtitle') || 'Share your experience'}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('ticketDetail.footer.keepSafe')}</Text>
            <Text style={styles.footerSubtext}>
              {t('ticketDetail.footer.qrEntryPass')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Transfer Modal */}
      <TransferTicketModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        ticketId={ticketId}
        eventTitle={ticket.event_title}
        transferCount={ticket.transfer_count || 0}
        onTransferSuccess={() => {
          fetchPendingTransfer();
          setShowTransferModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 30,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.border,
  },
  statusConfirmed: {
    backgroundColor: '#10B981',
  },
  statusUsed: {
    backgroundColor: COLORS.textSecondary,
  },
  statusExpired: {
    backgroundColor: '#FF8C00', // Orange color for expired
  },
  statusText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrContainer: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrContainerDimmed: {
    opacity: 0.5, // Dim the QR code for expired tickets
  },
  qrInstruction: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoCards: {
    gap: 16,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 16,
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
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoCardSubvalue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  ticketId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    backgroundColor: COLORS.primary + '10',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  footerSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  walletSection: {
    marginBottom: 24,
  },
  pendingTransferCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  pendingTransferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingTransferBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingTransferBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pendingTransferEmail: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 6,
  },
  pendingTransferEmailBold: {
    fontWeight: '700',
  },
  pendingTransferExpiry: {
    fontSize: 13,
    color: '#B45309',
    marginBottom: 12,
  },
  cancelTransferButton: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  cancelTransferButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  transferButton: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 0,
  },
  transferButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  transferButtonTextContainer: {
    flex: 1,
  },
  transferButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 3,
  },
  transferButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  actionButtonsSection: {
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionButtonText: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refundStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  refundStatusPending: {
    backgroundColor: '#FEF3C7',
  },
  refundStatusApproved: {
    backgroundColor: '#D1FAE5',
  },
  refundStatusDenied: {
    backgroundColor: '#FEE2E2',
  },
  refundStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
  },
});
