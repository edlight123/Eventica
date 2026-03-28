import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, CreditCard, Lock, Smartphone, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../config/firebase';
import { backendJson } from '../lib/api/backend';
import { useI18n } from '../contexts/I18nContext';

// Check if we're in Expo Go (Stripe won't work)
const isExpoGo = !(Platform as any).constants?.expoConfig;

// Conditionally import Stripe only if not in Expo Go
let StripeProvider: any;
let useStripe: any;
let CardField: any;

if (!isExpoGo) {
  try {
    const stripe = require('@stripe/stripe-react-native');
    StripeProvider = stripe.StripeProvider;
    useStripe = stripe.useStripe;
    CardField = stripe.CardField;
  } catch (error) {
    console.warn('Stripe SDK not available in Expo Go');
  }
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  userId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  country?: string;
  tierId?: string;
  promoCodeId?: string;
  onSuccess: (paymentMethod: string, transactionId: string) => void;
}

function PaymentForm({
  eventId,
  eventTitle,
  userId,
  quantity,
  totalAmount,
  currency,
  country,
  tierId,
  promoCodeId,
  onSuccess,
  onClose,
}: Omit<PaymentModalProps, 'visible'>) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  // Only use Stripe hooks if available
  const stripeHooks = useStripe ? useStripe() : { confirmPayment: null, handleCardAction: null };
  const { confirmPayment, handleCardAction } = stripeHooks;
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryCode = String(country || '').toUpperCase();
  const isHaitiEvent = countryCode === 'HT' || countryCode === 'HAITI';
  // Default to MonCash if Stripe not available (Expo Go)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'moncash' | 'natcash' | 'sogepay'>(
    isHaitiEvent ? 'moncash' : 'stripe'
  );
  const [cardComplete, setCardComplete] = useState(false);

  // Stripe Payment
  const handleStripePayment = async () => {
    if (isHaitiEvent) {
      setError(t('paymentModal.errors.haitiUseSogepay'));
      return;
    }

    if (!confirmPayment) {
      setError(t('paymentModal.errors.stripeUnavailable'));
      return;
    }
    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create payment intent from your backend
      const data = await backendJson<{ clientSecret: string }>(`/api/create-payment-intent`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCodeId,
        }),
      });

      // Step 2: Confirm payment with Stripe
      const { error: confirmError, paymentIntent } = await confirmPayment(data.clientSecret, {
        paymentMethodType: 'Card',
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent?.status === 'Succeeded') {
        // Step 3: Create tickets (backend will handle this via webhook, but we can also confirm here)
        onSuccess('stripe', paymentIntent.id);
        Alert.alert(t('common.success'), t('screens.payment.successBody'));
        onClose();
      }
    } catch (err: any) {
      setError(err.message || t('paymentModal.errors.paymentFailed'));
    } finally {
      setProcessing(false);
    }
  };

  // Sogepay Payment (Haiti card processing)
  const handleSogepayPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const data = await backendJson<{ redirectUrl: string }>(`/api/sogepay/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCode: promoCodeId,
        }),
      });

      if (!data.redirectUrl) {
        throw new Error(t('paymentModal.errors.missingSogepayUrl'));
      }

      onClose();
      navigation.navigate('PaymentWebView', {
        url: data.redirectUrl,
        title: t('screens.payment.complete'),
        eventId,
      });
    } catch (err: any) {
      setError(err.message || t('paymentModal.errors.sogepayFailed'));
      setProcessing(false);
    }
  };

  // MonCash Payment (Haiti Mobile Money) - MerchantApi
  const handleMonCashPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const data = await backendJson<{ redirectUrl: string }>(`/api/moncash-button/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCode: promoCodeId,
          mobileMoneyProvider: 'moncash',
          forceFormPost: true,
        }),
      });

      if (!data.redirectUrl) {
        throw new Error(t('paymentModal.errors.missingMoncashUrl'));
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      onClose();
      navigation.navigate('PaymentWebView', {
        url: data.redirectUrl,
        title: t('screens.payment.complete'),
        authToken: token,
        eventId,
      });
    } catch (err: any) {
      setError(err.message || t('paymentModal.errors.moncashFailed'));
      setProcessing(false);
    }
  };

  // NatCash Payment (same backend as MonCash MerchantApi)
  const handleNatCashPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const data = await backendJson<{ redirectUrl: string }>(`/api/moncash-button/initiate`, {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          quantity,
          tierId,
          promoCode: promoCodeId,
          mobileMoneyProvider: 'natcash',
          forceFormPost: true,
        }),
      });

      if (!data.redirectUrl) {
        throw new Error(t('paymentModal.errors.missingMoncashUrl'));
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      onClose();
      navigation.navigate('PaymentWebView', {
        url: data.redirectUrl,
        title: t('screens.payment.complete'),
        authToken: token,
        eventId,
      });
    } catch (err: any) {
      setError(err.message || t('paymentModal.errors.natcashFailed'));
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'stripe') {
      handleStripePayment();
    } else if (paymentMethod === 'sogepay') {
      handleSogepayPayment();
    } else if (paymentMethod === 'moncash') {
      handleMonCashPayment();
    } else if (paymentMethod === 'natcash') {
      handleNatCashPayment();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('screens.payment.complete')}</Text>
          <Text style={styles.headerSubtitle}>
            {quantity}x {eventTitle}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('paymentModal.selectMethod')}</Text>

          {/* Stripe Card Payment - Only show if Stripe is available and not Haiti */}
          {!isHaitiEvent && !isExpoGo && StripeProvider && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'stripe' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('stripe')}
            >
              <View style={styles.methodIcon}>
                <CreditCard size={24} color={paymentMethod === 'stripe' ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>{t('paymentModal.methods.card')}</Text>
                <Text style={styles.methodSubtitle}>{t('paymentModal.methods.cardBrands')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Sogepay Card Payment (Haiti) */}
          {isHaitiEvent && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'sogepay' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('sogepay')}
            >
              <View style={styles.methodIcon}>
                <CreditCard size={24} color={paymentMethod === 'sogepay' ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>{t('paymentModal.methods.card')}</Text>
                <Text style={styles.methodSubtitle}>{t('paymentModal.methods.sogepay')}</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Show message if in Expo Go */}
          {isExpoGo && (
            <View style={styles.expoGoWarning}>
              <AlertCircle size={18} color={colors.warning} />
              <Text style={styles.expoGoWarningText}>
                {t('paymentModal.expoGo.base')}
                {isHaitiEvent ? ` ${t('paymentModal.expoGo.haitiSuffix')}` : ''}
              </Text>
            </View>
          )}

          {/* MonCash (Haiti only) */}
          {isHaitiEvent && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'moncash' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('moncash')}
            >
              <View style={styles.methodIcon}>
                <Smartphone size={24} color={paymentMethod === 'moncash' ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>{t('paymentModal.methods.moncash')}</Text>
                <Text style={styles.methodSubtitle}>{t('paymentModal.methods.haitiMobileMoney')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* NatCash (Haiti only) */}
          {isHaitiEvent && (
            <TouchableOpacity
              style={[
                styles.methodButton,
                paymentMethod === 'natcash' && styles.methodButtonActive,
              ]}
              onPress={() => setPaymentMethod('natcash')}
            >
              <View style={styles.methodIcon}>
                <Smartphone size={24} color={paymentMethod === 'natcash' ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>{t('paymentModal.methods.natcash')}</Text>
                <Text style={styles.methodSubtitle}>{t('paymentModal.methods.haitiMobileMoney')}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Stripe Card Input */}
        {paymentMethod === 'stripe' && CardField && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('paymentModal.cardDetails')}</Text>
            <CardField
              postalCodeEnabled={false}
              placeholder={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={styles.cardInput}
              style={styles.cardFieldContainer}
              onCardChange={(cardDetails: any) => {
                setCardComplete(cardDetails.complete);
              }}
            />
            <View style={styles.testCardHint}>
              <AlertCircle size={14} color={colors.textSecondary} />
              <Text style={styles.testCardHintText}>
                {t('paymentModal.testCardHint')}
              </Text>
            </View>
          </View>
        )}

        {/* Phone Number Input for Mobile Money */}
        {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <AlertCircle size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                {t('paymentModal.info.redirectPrefix')}
                {paymentMethod === 'moncash'
                  ? t('paymentModal.methods.moncash')
                  : t('paymentModal.methods.natcash')}
                {t('paymentModal.info.redirectSuffix')}
                {'\n'}
                {t('paymentModal.info.afterPayment')}
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Total Amount */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{t('paymentModal.totalAmount')}</Text>
          <Text style={styles.totalAmount}>
            {currency} {totalAmount.toLocaleString()}
          </Text>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Lock size={14} color={colors.textSecondary} />
          <Text style={styles.securityText}>{t('paymentModal.securedBy')}</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.payButton,
            (processing || (paymentMethod === 'stripe' && !cardComplete)) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={processing || (paymentMethod === 'stripe' && !cardComplete)}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {t('paymentModal.pay')} {currency} {totalAmount.toLocaleString()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PaymentModal(props: PaymentModalProps) {
  const { t } = useI18n();
  // If in Expo Go or Stripe not available, render without StripeProvider
  if (isExpoGo || !StripeProvider) {
    return (
      <Modal
        visible={props.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={props.onClose}
      >
        <PaymentForm {...props} />
      </Modal>
    );
  }

  if (!STRIPE_PUBLISHABLE_KEY) {
    return (
      <Modal
        visible={props.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={props.onClose}
      >
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.error} />
            <Text style={styles.errorText}>
              {t('paymentModal.stripeMissingKey')}
            </Text>
            <TouchableOpacity style={styles.payButton} onPress={props.onClose}>
              <Text style={styles.payButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <PaymentForm {...props} />
      </StripeProvider>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0FDFA',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  methodSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardFieldContainer: {
    height: 50,
    marginBottom: 8,
  },
  cardInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  testCardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  testCardHintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  totalContainer: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  payButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expoGoWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 12,
  },
  expoGoWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});
