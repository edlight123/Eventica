import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ticket, X, Plus, Minus } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { collection, addDoc, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface FreeTicketModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  event: any;
  onSuccess: () => void;
}

export default function FreeTicketModal({
  visible,
  onClose,
  eventId,
  eventTitle,
  userId,
  userEmail,
  userName,
  event,
  onSuccess,
}: FreeTicketModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const remainingTickets = (event.total_tickets || 0) - (event.tickets_sold || 0);
  const maxQuantity = Math.min(10, remainingTickets);

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleClaimTickets = async () => {
    if (remainingTickets <= 0) {
      Alert.alert('Sold Out', 'No tickets available');
      return;
    }

    if (quantity > remainingTickets) {
      Alert.alert('Limited Availability', `Only ${remainingTickets} ticket${remainingTickets !== 1 ? 's' : ''} remaining`);
      return;
    }

    setLoading(true);

    try {
      console.log('=== CLAIMING FREE TICKETS ===');
      console.log('Event ID:', eventId);
      console.log('Quantity:', quantity);
      console.log('User ID:', userId);
      console.log('Remaining tickets:', remainingTickets);
      
      // Create tickets one by one with unique QR codes
      const createdTickets = [];
      
      for (let i = 0; i < quantity; i++) {
        const qrCodeData = `ticket-${eventId}-${userId}-${Date.now()}-${i}`;
        
        // Ensure event_date is a Timestamp or convert it
        let eventDate = event.start_datetime;
        if (eventDate && !(eventDate instanceof Timestamp)) {
          // Convert Date to Timestamp if needed
          eventDate = Timestamp.fromDate(eventDate instanceof Date ? eventDate : new Date(eventDate));
        }
        
        const ticketData = {
          event_id: eventId,
          event_title: eventTitle,
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          ticket_type: 'General Admission',
          quantity: 1,
          price: 0,
          currency: event.currency || 'HTG',
          status: 'confirmed',
          purchase_date: Timestamp.now(),
          event_date: eventDate,
          qr_code: qrCodeData,
          venue_name: event.venue_name,
          city: event.city,
          organizer_name: event.users?.full_name || event.organizer_name || 'Event Organizer',
          checked_in: false,
          checked_in_at: null,
        };

        const ticketRef = await addDoc(collection(db, 'tickets'), ticketData);
        createdTickets.push({ id: ticketRef.id, ...ticketData });
        console.log(`Created ticket ${i + 1}/${quantity}:`, ticketRef.id);
      }

      console.log('All tickets created successfully:', createdTickets.length);

      // Update tickets_sold count
      const eventRef = doc(db, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const currentTicketsSold = eventDoc.data().tickets_sold || 0;
        await updateDoc(eventRef, {
          tickets_sold: currentTicketsSold + quantity,
        });
        console.log('Updated tickets_sold:', currentTicketsSold, '->', currentTicketsSold + quantity);
      } else {
        console.warn('Event document not found for updating tickets_sold');
      }

      console.log('=== SUCCESS ===');
      
      // Success - close modal and call success callback
      setLoading(false);
      onClose();
      
      // Call onSuccess after a short delay to ensure modal is closed
      setTimeout(() => {
        Alert.alert(
          'Success!',
          `${quantity} free ticket${quantity !== 1 ? 's' : ''} claimed successfully!`,
          [
            { 
              text: 'View Tickets', 
              onPress: onSuccess 
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }, 300);
    } catch (error) {
      console.error('=== ERROR CLAIMING TICKETS ===');
      console.error('Error details:', error);
      Alert.alert('Error', 'Failed to claim tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ticket size={24} color={colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Claim Free Ticket</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {eventTitle}
            </Text>
            <Text style={styles.freeLabel}>FREE EVENT</Text>
          </View>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <View style={styles.quantityHeader}>
              <Text style={styles.sectionLabel}>Ticket Quantity</Text>
              <Text style={styles.availabilityText}>
                {remainingTickets} available
              </Text>
            </View>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity
                onPress={handleDecrease}
                disabled={quantity <= 1 || loading}
                style={[styles.quantityButton, (quantity <= 1 || loading) && styles.quantityButtonDisabled]}
              >
                <Minus size={20} color={quantity <= 1 || loading ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
              
              <View style={styles.quantityDisplay}>
                <Text style={styles.quantityNumber}>{quantity}</Text>
                <Text style={styles.quantityLabel}>
                  {quantity === 1 ? 'Ticket' : 'Tickets'}
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={handleIncrease}
                disabled={quantity >= maxQuantity || loading}
                style={[styles.quantityButton, (quantity >= maxQuantity || loading) && styles.quantityButtonDisabled]}
              >
                <Plus size={20} color={quantity >= maxQuantity || loading ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
            </View>

            {quantity >= maxQuantity && maxQuantity < 10 && (
              <Text style={styles.limitText}>
                Maximum {maxQuantity} ticket{maxQuantity !== 1 ? 's' : ''} available
              </Text>
            )}
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>FREE</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleClaimTickets}
              style={[styles.claimButton, loading && styles.claimButtonDisabled]}
              disabled={loading || remainingTickets <= 0}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.claimButtonText}>
                  Claim {quantity} Ticket{quantity !== 1 ? 's' : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  eventInfo: {
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  freeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  availabilityText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  quantityNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  limitText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  summary: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  claimButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
