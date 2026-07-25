import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarPlus, MapPin, Send, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import type { Language } from '../contexts/I18nContext';
import { safeFormatForLanguage } from '../lib/dates';
import TicketQRCard from './TicketQRCard';
import StatusChip from './StatusChip';
import AddToWalletButton from './AddToWalletButton';
import { ticketOrderRef, ticketTierLabel, ticketQrValue, ticketStatusKey } from '../lib/ticket';
import { addToCalendar, openDirections } from '../lib/postPurchaseActions';

interface TicketPassCardProps {
  ticket: any;
  event: any;
  user: any;
  ticketNumber: number;
  onQRPress: () => void;
  onViewEvent: () => void;
  onTransferPress?: () => void;
}

/** Guarded, locale-aware date → formatted label; returns undefined for missing/invalid dates. */
function safeDate(value: any, pattern: string, language: Language): string | undefined {
  return safeFormatForLanguage(value, pattern, language) || undefined;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Post-purchase ticket pass. Renders the ONE shared ticket identity — the
 * inverted white `TicketQRCard` (BLACK-on-white QR) — then a POSH §2.4 action
 * stack: Add to Wallet (white primary) · Add to calendar · Get directions ·
 * Transfer · View event. Fed real fields (real tier, TKM- order ref, holder).
 */
export default function TicketPassCard({
  ticket,
  event,
  user,
  ticketNumber,
  onQRPress,
  onViewEvent,
  onTransferPress,
}: TicketPassCardProps) {
  const { colors } = useTheme();
  const { language } = useI18n();
  const styles = getStyles(colors);

  const start = toDate(event?.start_datetime) || toDate(ticket?.event_date);
  const end = toDate(event?.end_datetime);
  const isExpired = end ? new Date() > end : false;
  const isUsed = !!ticket?.checked_in_at || String(ticket?.status || '').toLowerCase() === 'used';

  const eventTitle = event?.title || ticket?.event_title || 'Event';
  const dateLabel = safeDate(start, 'EEE, MMM d · h:mm a', language);
  const tier = ticketTierLabel(ticket);
  const holder = user?.displayName || user?.email || undefined;
  const orderRef = ticketOrderRef(ticket);
  const statusKey = ticketStatusKey(ticket, isExpired);

  const venueLabel = [event?.venue_name, event?.address, event?.city]
    .filter(Boolean)
    .join(', ');

  const handleCalendar = () =>
    addToCalendar({
      title: eventTitle,
      start,
      end,
      location: venueLabel || event?.venue_name || undefined,
      details: `Tikèm ticket · ${orderRef}`,
    });

  const handleDirections = () =>
    openDirections({
      venue: event?.venue_name,
      address: event?.address,
      city: event?.city,
      lat: event?.latitude ?? event?.lat ?? null,
      lng: event?.longitude ?? event?.lng ?? null,
    });

  return (
    <View style={styles.wrapper}>
      <View style={styles.chipRow}>
        <StatusChip status={statusKey} label={isUsed ? undefined : `Ticket ${ticketNumber}`} />
      </View>

      {/* The one shared ticket identity — white inverted stub. Tap to enlarge. */}
      <TouchableOpacity activeOpacity={0.95} onPress={onQRPress}>
        <TicketQRCard
          qrValue={ticketQrValue(ticket)}
          eventTitle={eventTitle}
          dateLabel={dateLabel}
          tierName={tier}
          holderName={holder ? `Admit: ${holder}` : undefined}
          orderRef={orderRef.replace(/^TKM-/, '')}
        />
      </TouchableOpacity>
      <Text style={styles.tapHint}>Tap ticket to enlarge · show at entry</Text>

      {isUsed && ticket?.checked_in_at && (
        <View style={styles.usedBanner}>
          <Text style={styles.usedBannerText}>
            ✓ Checked in {safeDate(ticket.checked_in_at, 'MMM d, yyyy · h:mm a', language) || ''}
          </Text>
        </View>
      )}

      {/* Post-purchase action stack */}
      <View style={styles.actions}>
        <AddToWalletButton
          ticketId={ticket?.id}
          qrCodeData={ticketQrValue(ticket)}
          eventTitle={eventTitle}
          eventDate={dateLabel || ''}
          venueName={event?.venue_name || ''}
          ticketNumber={ticketNumber}
          totalTickets={ticket?.quantity || 1}
        />

        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCalendar} activeOpacity={0.8}>
            <CalendarPlus size={18} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Add to calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleDirections} activeOpacity={0.8}>
            <MapPin size={18} color={colors.text} />
            <Text style={styles.secondaryButtonText}>Get directions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryRow}>
          {onTransferPress && !isUsed && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onTransferPress} activeOpacity={0.8}>
              <Send size={18} color={colors.text} />
              <Text style={styles.secondaryButtonText}>Transfer</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={onViewEvent} activeOpacity={0.8}>
            <ExternalLink size={18} color={colors.text} />
            <Text style={styles.secondaryButtonText}>View event</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    wrapper: {
      width: '100%',
    },
    chipRow: {
      alignItems: 'center',
      marginBottom: 12,
    },
    tapHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    usedBanner: {
      backgroundColor: colors.successLight,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginTop: 12,
    },
    usedBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.success,
      textAlign: 'center',
    },
    actions: {
      marginTop: 20,
      gap: 12,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    // Dark-grey secondary pill (POSH §2.2): elevation step, no teal.
    secondaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 999,
      backgroundColor: colors.surfaceRaised,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
  });
