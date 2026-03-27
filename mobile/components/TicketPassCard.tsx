import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { Calendar, MapPin, User, Wallet, Send, ExternalLink } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../config/brand';
import { format } from 'date-fns';

interface TicketPassCardProps {
  ticket: any;
  event: any;
  user: any;
  ticketNumber: number;
  onQRPress: () => void;
  onViewEvent: () => void;
  onTransferPress?: () => void;
}

export default function TicketPassCard({
  ticket,
  event,
  user,
  ticketNumber,
  onQRPress,
  onViewEvent,
  onTransferPress,
}: TicketPassCardProps) {
  const isUsed = !!ticket.checked_in_at;
  const orderNumber = `EH-${ticket.id?.slice(0, 8).toUpperCase() || 'XXXXXXXX'}`;

  const handleAddToWallet = () => {
    // Stub for now - could integrate Apple Wallet / Google Pay
    console.log('Add to wallet - feature coming soon');
  };

  return (
    <View style={styles.card}>
      {/* Decorative notches */}
      <View style={styles.notchLeft} />
      <View style={styles.notchRight} />

      {/* Status & Holder Section */}
      <View style={styles.statusSection}>
        <View style={styles.statusLeft}>
          <Text style={styles.ticketNumberText}>Ticket #{ticketNumber}</Text>
          <Text style={styles.ticketType}>General Admission</Text>
        </View>
        
        <View style={[styles.statusBadge, isUsed ? styles.statusBadgeUsed : styles.statusBadgeValid]}>
          <Text style={styles.statusBadgeText}>{isUsed ? 'USED' : 'VALID'}</Text>
        </View>
      </View>

      {user && (
        <View style={styles.holderRow}>
          <User size={14} color={COLORS.textSecondary} />
          <Text style={styles.holderText}>
            Admit: {user.displayName || user.email}
          </Text>
        </View>
      )}

      {/* QR Code Area */}
      <TouchableOpacity
        style={styles.qrSection}
        onPress={onQRPress}
        activeOpacity={0.9}
      >
        <View style={styles.qrWrapper}>
          <QRCode
            value={ticket.id || 'no-ticket-id'}
            size={200}
            backgroundColor="#FFF"
            logo={require('../assets/eventica_logo_color.png')}
            logoSize={45}
            logoBackgroundColor="white"
            logoBorderRadius={5}
          />
        </View>
        
        <Text style={styles.qrInstruction}>
          Show this code to staff at entry
        </Text>
        <Text style={styles.tapToEnlarge}>Tap to enlarge</Text>
        
        <View style={styles.orderInfo}>
          <Text style={styles.orderLabel}>Order #{orderNumber}</Text>
          <Text style={styles.ticketIdLabel}>
            ID: {ticket.id?.slice(0, 12)}...
          </Text>
        </View>
      </TouchableOpacity>

      {isUsed && (
        <View style={styles.usedBanner}>
          <Text style={styles.usedBannerText}>
            ✓ Checked in on {format(new Date(ticket.checked_in_at), 'MMM d, yyyy • h:mm a')}
          </Text>
        </View>
      )}

      {/* Bottom Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddToWallet}
          activeOpacity={0.8}
        >
          <Wallet size={18} color="#FFF" />
          <Text style={styles.primaryButtonText}>Add to Wallet</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          {onTransferPress && !isUsed && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onTransferPress}
              activeOpacity={0.8}
            >
              <Send size={18} color={COLORS.primary} />
              <Text style={styles.secondaryButtonText}>Transfer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onViewEvent}
            activeOpacity={0.8}
          >
            <ExternalLink size={18} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Event Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  notchLeft: {
    position: 'absolute',
    left: -12,
    top: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    zIndex: 10,
  },
  notchRight: {
    position: 'absolute',
    right: -12,
    top: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    zIndex: 10,
  },
  eventHeader: {
    height: 160,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventHeaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  eventHeaderContent: {
    padding: 20,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 26,
    marginRight: 8,
  },
  featuredBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  eventDetailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderStyle: 'dashed',
  },
  statusLeft: {
    flex: 1,
  },
  ticketNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  ticketType: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeValid: {
    backgroundColor: '#10B981',
  },
  statusBadgeUsed: {
    backgroundColor: '#64748B',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  holderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  holderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  qrSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  qrWrapper: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  qrInstruction: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  tapToEnlarge: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  orderInfo: {
    marginTop: 16,
    alignItems: 'center',
    gap: 4,
  },
  orderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  ticketIdLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
  },
  usedBanner: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#10B981',
  },
  usedBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
