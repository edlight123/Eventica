import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { doc, updateDoc, getDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth } from '../../config/firebase';
import { useI18n } from '../../contexts/I18nContext';
import { RADIUS } from '../../config/brand';

type RouteParams = {
  TicketScanner: {
    eventId: string;
  };
};

type ScanResult = {
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'EXPIRED' | 'CANCELLED' | 'WRONG_EVENT' | 'NOT_FOUND' | 'ERROR';
  attendeeName?: string;
  tierName?: string;
  message?: string;
  checkedInTime?: Date;
  ticketId?: string;
  // HARD validity block derived from the resolved tier's valid_from /
  // valid_until ENTRY window. When set on a VALID ticket, the default green
  // "Confirm check-in" action is disabled and the sheet shows this reason
  // (red/error, with the date); a valid staff member can still admit via an
  // explicit, less-prominent override that calls handleConfirmCheckIn.
  validityBlock?: string;
};

// Given a resolved tier object, return a human block reason when `now` is
// outside its valid_from / valid_until entry window, or undefined when the
// tier is missing, carries no window, or we are in-window (empty bound = open).
function computeTierValidityBlock(
  tier: any,
  locale: string,
  t: (key: string) => string,
): string | undefined {
  if (!tier) return undefined;

  const now = new Date();
  const from = tier.valid_from ? new Date(tier.valid_from) : null;
  const until = tier.valid_until ? new Date(tier.valid_until) : null;

  if (from && !isNaN(from.getTime()) && now < from) {
    return `${t('organizerCreateEventFlow.canvas.ticketNotYetValid')} ${from.toLocaleString(locale)}`;
  }
  if (until && !isNaN(until.getTime()) && now > until) {
    return `${t('organizerCreateEventFlow.canvas.ticketExpired')} ${until.toLocaleString(locale)}`;
  }
  return undefined;
}

// Resolve a ticket's tier PREFERRING `tier_id`: match it within the event's
// embedded ticket_tiers, else fetch ticket_tiers/{tier_id}. Fall back to a
// name match against the event's tiers for older tickets lacking a tier_id.
async function resolveTicketTier(
  eventTiers: any[],
  tierId: string | undefined,
  tierName: string,
): Promise<any | undefined> {
  const tiers = Array.isArray(eventTiers) ? eventTiers : [];

  if (typeof tierId === 'string' && tierId.length > 0) {
    const byId = tiers.find(
      (x) => String(x?.id ?? x?.tier_id ?? x?.tierId ?? '') === tierId,
    );
    if (byId) return byId;
    try {
      const tierSnap = await getDoc(doc(db, 'ticket_tiers', tierId));
      if (tierSnap.exists()) return tierSnap.data();
    } catch (e) {
      console.warn('Failed to resolve tier from ticket_tiers:', e);
    }
  }

  const norm = (s: any) => String(s ?? '').trim().toLowerCase();
  const target = norm(tierName);
  if (!target) return undefined;
  return tiers.find((x) => norm(x?.name) === target);
}

export default function TicketScannerScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const route = useRoute<RouteProp<RouteParams, 'TicketScanner'>>();
  const navigation = useNavigation();
  const { eventId } = route.params;

  const { t, language } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'ht' ? 'fr-HT' : 'en-US';

  // Override label for admitting a ticket that is outside its validity window.
  // Reuse an i18n key if present; fall back to an inline English string so the
  // control never renders a raw key when the key is missing.
  const overrideKey = 'organizerTicketScanner.actions.overrideCheckIn';
  const overrideResolved = t(overrideKey);
  const overrideLabel =
    overrideResolved && overrideResolved !== overrideKey
      ? overrideResolved
      : 'Override — check in anyway';

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Prevent multiple scans
    if (isProcessing) return;

    setIsProcessing(true);
    Vibration.vibrate(200);

    try {
      const ticketId = data;

      // DEBUG: Log scan details
      console.log('=== TICKET SCAN DEBUG ===');
      console.log('QR Code Data:', ticketId);
      console.log('Looking in collection: tickets');
      console.log('Event ID:', eventId);
      console.log('Firestore Config:', {
        projectId: db.app.options.projectId,
        // databaseId is not part of FirebaseOptions in this SDK build
        databaseId: '(default)',
      });

      // Get ticket from Firestore
      const ticketRef = doc(db, 'tickets', ticketId);
      console.log('Ticket Ref Path:', ticketRef.path);
      
      const ticketSnap = await getDoc(ticketRef);
      console.log('Document exists:', ticketSnap.exists());

      if (!ticketSnap.exists()) {
        console.log('Ticket not found in Firestore');
        setScanResult({
          status: 'NOT_FOUND',
          message: t('organizerTicketScanner.results.notFound'),
        });
        return;
      }

      const ticketData = ticketSnap.data();
      console.log('Ticket Data:', JSON.stringify(ticketData, null, 2));
      console.log('=== END DEBUG ===');

      const attendeeName =
        ticketData.attendee_name ||
        ticketData.user_name ||
        ticketData.userName ||
        ticketData.user_email ||
        t('common.attendee');

      let tierName =
        ticketData.tier_name ||
        ticketData.ticket_tier_name ||
        ticketData.ticket_type ||
        ticketData.ticketType ||
        ticketData.tierName ||
        '';

      const tierId = ticketData.ticket_tier_id || ticketData.tier_id || ticketData.ticketTierId;
      if (!tierName && typeof tierId === 'string' && tierId.length > 0) {
        try {
          const tierSnap = await getDoc(doc(db, 'ticket_tiers', tierId));
          if (tierSnap.exists()) {
            const tierData = tierSnap.data() as any;
            tierName = tierData?.name || tierName;
          }
        } catch (e) {
          console.warn('Failed to resolve tier from ticket_tiers:', e);
        }
      }

      if (!tierName) {
        tierName = t('common.generalAdmission');
      }

      // Verify ticket belongs to this event
      if (ticketData.event_id !== eventId) {
        setScanResult({
          status: 'WRONG_EVENT',
          message: t('organizerTicketScanner.results.wrongEvent'),
        });
        return;
      }

      // Check if event has ended (ticket expired)
      const now = new Date();
      const eventEnd = new Date(ticketData.end_datetime || ticketData.event_date || ticketData.start_datetime);
      if (now > eventEnd) {
        setScanResult({
          status: 'EXPIRED',
          attendeeName,
          tierName,
          message: t('organizerTicketScanner.results.expired'),
        });
        return;
      }

      // Check if already checked in
      if (ticketData.checked_in_at) {
        const checkedInTime = ticketData.checked_in_at.toDate
          ? ticketData.checked_in_at.toDate()
          : new Date(ticketData.checked_in_at);
        
        setScanResult({
          status: 'ALREADY_CHECKED_IN',
          attendeeName,
          tierName,
          checkedInTime,
          message: `${t('organizerTicketScanner.results.alreadyCheckedInAtPrefix')}${checkedInTime.toLocaleString(locale)}`,
        });
        return;
      }

      // Check ticket status
      if (ticketData.status === 'cancelled') {
        setScanResult({
          status: 'CANCELLED',
          attendeeName,
          tierName,
          message: t('organizerTicketScanner.results.cancelled'),
        });
        return;
      }

      // HARD validity-window check. Resolve the tier PREFERRING ticket.tier_id
      // (match the event's embedded ticket_tiers or fetch ticket_tiers/{id}),
      // falling back to a name match for older tickets. If `now` is outside the
      // tier's entry window this becomes a hard block (staff can still override).
      let validityBlock: string | undefined;
      try {
        const eventSnap = await getDoc(doc(db, 'events', eventId));
        const eventTiers = eventSnap.exists() ? (eventSnap.data()?.ticket_tiers || []) : [];
        const rawTierName =
          ticketData.tier_name ||
          ticketData.ticket_tier_name ||
          ticketData.ticket_type ||
          ticketData.ticketType ||
          ticketData.tierName ||
          tierName;
        const resolvedTier = await resolveTicketTier(eventTiers, tierId, rawTierName);
        validityBlock = computeTierValidityBlock(resolvedTier, locale, t);
      } catch (e) {
        console.warn('Failed to resolve tier validity window:', e);
      }

      // Valid ticket - ready to check in. When validityBlock is set, the sheet
      // hard-blocks the default confirm and only admits via an explicit override.
      setScanResult({
        status: 'VALID',
        attendeeName,
        tierName,
        ticketId,
        validityBlock,
      });

    } catch (error: any) {
      console.error('Error checking in ticket:', error);
      setScanResult({
        status: 'ERROR',
        message: error.message || t('organizerTicketScanner.results.scanFailed'),
      });
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!scanResult || scanResult.status !== 'VALID' || !scanResult.ticketId) return;

    try {
      const ticketRef = doc(db, 'tickets', scanResult.ticketId);
      await updateDoc(ticketRef, {
        checked_in: true,
        checked_in_at: serverTimestamp(),
        checked_in_by: auth.currentUser?.uid || null,
        updated_at: serverTimestamp(),
      });

      Vibration.vibrate([0, 100, 100, 100]);
      
      // Show success state briefly
      setScanResult({
        ...scanResult,
        status: 'ALREADY_CHECKED_IN',
        message: t('organizerTicketScanner.results.checkInSuccessful'),
      });

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        handleCloseSheet();
      }, 1500);
    } catch (error: any) {
      console.error('Error checking in ticket:', error);
      setScanResult({
        status: 'ERROR',
        message: error.message || t('organizerTicketScanner.results.checkInFailed'),
      });
    }
  };

  const handleCloseSheet = () => {
    setScanResult(null);
    setIsProcessing(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t('organizerTicketScanner.permissions.requesting')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.message}>{t('organizerTicketScanner.permissions.required')}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t('organizerTicketScanner.permissions.grant')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraSection}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashOn}
          onBarcodeScanned={isProcessing ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            {/* Scanning frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
              <Text style={styles.instruction}>
                {isProcessing
                  ? t('organizerTicketScanner.instructions.processing')
                  : t('organizerTicketScanner.instructions.positionQr')}
              </Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Header below camera */}
      <View style={styles.belowHeader}>
        <TouchableOpacity style={styles.belowHeaderButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.belowHeaderTitle} numberOfLines={1}>{t('organizerTicketScanner.headerTitle')}</Text>
        <TouchableOpacity style={styles.belowHeaderButton} onPress={() => setFlashOn(!flashOn)}>
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bottom sheet modal */}
      <Modal
        visible={scanResult !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={handleCloseSheet}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetGrabber} />
            {/* Status Icon */}
            <View style={styles.sheetHeader}>
              <Ionicons
                name={
                  (scanResult?.status === 'VALID' && !scanResult?.validityBlock) ||
                  scanResult?.status === 'ALREADY_CHECKED_IN'
                    ? 'checkmark-circle'
                    : 'alert-circle'
                }
                size={64}
                color={
                  scanResult?.status === 'VALID'
                    ? scanResult?.validityBlock
                      ? colors.error
                      : colors.success
                    : scanResult?.status === 'ALREADY_CHECKED_IN'
                    ? colors.info
                    : colors.error
                }
              />
            </View>

            {/* Ticket Details */}
            <View style={styles.sheetContent}>
              {scanResult?.attendeeName && (
                <Text style={styles.attendeeName} numberOfLines={2}>{scanResult.attendeeName}</Text>
              )}
              {scanResult?.tierName && (
                <Text style={styles.tierName} numberOfLines={1}>{scanResult.tierName}</Text>
              )}
              {scanResult?.message && (
                <Text style={styles.message}>{scanResult.message}</Text>
              )}
              
              {isProcessing && scanResult?.status === 'VALID' && (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              )}
            </View>

            {/* HARD validity block banner — shown prominently in red/error with
                the date when the ticket is outside its tier's entry window. */}
            {scanResult?.status === 'VALID' && scanResult?.validityBlock && (
              <View style={styles.validityBlock}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.validityBlockText}>{scanResult.validityBlock}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.sheetActions}>
              {scanResult?.status === 'VALID' ? (
                scanResult?.validityBlock ? (
                  // Out-of-window: the default green confirm is DISABLED. Staff
                  // may still admit via the explicit, less-prominent override.
                  <>
                    <View
                      style={[styles.actionButton, styles.primaryButton, styles.disabledButton]}
                      pointerEvents="none"
                    >
                      <Text style={styles.primaryButtonText}>{t('organizerTicketScanner.actions.confirm')}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.overrideButton]}
                      onPress={handleConfirmCheckIn}
                    >
                      <Text style={styles.overrideButtonText}>{overrideLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={handleCloseSheet}
                    >
                      <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={handleConfirmCheckIn}
                    >
                      <Text style={styles.primaryButtonText}>{t('organizerTicketScanner.actions.confirm')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={handleCloseSheet}
                    >
                      <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </>
                )
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={handleCloseSheet}
                >
                  <Text style={styles.primaryButtonText}>{t('common.close')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: RADIUS.sm,
    marginTop: 16,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraSection: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  belowHeader: {
    height: 64,
    width: '100%',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  belowHeaderButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  belowHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderColor: colors.white,
  },
  cornerTopLeft: {
    top: '30%',
    left: '15%',
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: '30%',
    right: '15%',
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: '30%',
    left: '15%',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: '30%',
    right: '15%',
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    minHeight: 300,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  attendeeName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  tierName: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 16,
  },
  validityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + '55',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  validityBlockText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },
  sheetActions: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.4,
  },
  overrideButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error + '80',
  },
  overrideButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
