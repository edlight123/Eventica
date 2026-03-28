import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X, Check, Minus, Plus, Tag } from 'lucide-react-native';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useI18n } from '../contexts/I18nContext';
import { normalizePromoValidationResponse } from '../lib/promoCodes';
import { useTheme } from '../contexts/ThemeContext';

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  total_quantity: number;
  sold_quantity: number;
  sales_start: string | null;
  sales_end: string | null;
}

interface GroupDiscount {
  id: string;
  min_quantity: number;
  discount_percentage: number;
  is_active: boolean;
}

interface PromoCodeValidation {
  valid: boolean;
  discount_percentage?: number;
  discount_amount?: number;
  error?: string;
}

interface TieredTicketSelectorProps {
  eventId: string;
  visible: boolean;
  onClose: () => void;
  onPurchase: (tierId: string, finalPrice: number, quantity: number, promoCode?: string) => void;
  currency?: string;
}

interface TierQuantity {
  [tierId: string]: number;
}


export default function TieredTicketSelector({
  eventId,
  visible,
  onClose,
  onPurchase,
  currency,
}: TieredTicketSelectorProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t } = useI18n();
  const displayCurrency = String(currency || 'HTG').toUpperCase();
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [groupDiscounts, setGroupDiscounts] = useState<GroupDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Store quantity per tier
  const [tierQuantities, setTierQuantities] = useState<TierQuantity>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTiers();
      fetchGroupDiscounts();
    }
  }, [visible, eventId]);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      console.log('[TieredTicketSelector] Fetching tiers for event:', eventId);
      
      const tiersQuery = query(
        collection(db, 'ticket_tiers'),
        where('event_id', '==', eventId),
        orderBy('sort_order', 'asc')
      );
      
      const tiersSnapshot = await getDocs(tiersQuery);
      const tiersData = tiersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as TicketTier[];
      
      console.log('[TieredTicketSelector] Fetched tiers:', tiersData.length);
      setTiers(tiersData);
    } catch (error) {
      console.error('[TieredTicketSelector] Error fetching tiers:', error);
      // Set empty tiers on error so modal still shows
      setTiers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDiscounts = async () => {
    try {
      console.log('[TieredTicketSelector] Fetching group discounts for event:', eventId);
      
      const discountsQuery = query(
        collection(db, 'group_discounts'),
        where('event_id', '==', eventId),
        where('is_active', '==', true)
      );
      
      const discountsSnapshot = await getDocs(discountsQuery);
      const discountsData = discountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as GroupDiscount[];
      
      console.log('[TieredTicketSelector] Fetched group discounts:', discountsData.length);
      setGroupDiscounts(discountsData);
    } catch (error) {
      console.error('[TieredTicketSelector] Error fetching group discounts:', error);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const apiUrl = (
        process.env.EXPO_PUBLIC_API_URL ||
        process.env.EXPO_PUBLIC_WEB_URL ||
        'https://joineventica.com'
      ).replace(/\/$/, '');
      const response = await fetch(
        `${apiUrl}/api/promo-codes?eventId=${eventId}&code=${encodeURIComponent(promoCode)}`
      );
      const data = await response.json();

      setPromoValidation(normalizePromoValidationResponse(data));
    } catch (error) {
      console.error('Error validating promo code:', error);
      setPromoValidation({ valid: false, error: 'Failed to validate promo code' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const isTierAvailable = (tier: TicketTier): boolean => {
    const now = new Date();
    
    // Check sales period
    if (tier.sales_start && new Date(tier.sales_start) > now) {
      return false;
    }
    if (tier.sales_end && new Date(tier.sales_end) < now) {
      return false;
    }
    
    // Check availability
    const available = tier.total_quantity - tier.sold_quantity;
    return available > 0;
  };

  const getAvailableQuantity = (tier: TicketTier): number => {
    return tier.total_quantity - tier.sold_quantity;
  };

  const getApplicableGroupDiscount = (): GroupDiscount | null => {
    if (promoValidation?.valid) {
      return null; // Don't apply group discount if promo code is used
    }

    const totalQty = getTotalQuantity();
    
    const applicable = groupDiscounts
      .filter(d => d.is_active && d.min_quantity <= totalQty)
      .sort((a, b) => b.discount_percentage - a.discount_percentage);
    
    return applicable[0] || null;
  };

  const getTotalQuantity = (): number => {
    return Object.values(tierQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = (): number => {
    let total = 0;
    tiers.forEach(tier => {
      const qty = tierQuantities[tier.id] || 0;
      if (qty > 0) {
        total += tier.price * qty;
      }
    });

    // Apply promo code discount
    if (promoValidation?.valid) {
      if (promoValidation.discount_percentage) {
        total = total * (1 - promoValidation.discount_percentage / 100);
      } else if (promoValidation.discount_amount) {
        total = Math.max(0, total - promoValidation.discount_amount);
      }
    }
    // Apply group discount
    else {
      const totalQty = getTotalQuantity();
      const groupDiscount = groupDiscounts
        .filter(d => d.min_quantity <= totalQty && d.is_active)
        .sort((a, b) => b.discount_percentage - a.discount_percentage)[0];
      
      if (groupDiscount) {
        total = total * (1 - groupDiscount.discount_percentage / 100);
      }
    }
    
    return Math.round(total * 100) / 100;
  };

  const updateTierQuantity = (tierId: string, delta: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;
    
    const currentQty = tierQuantities[tierId] || 0;
    const available = getAvailableQuantity(tier);
    const newQty = Math.max(0, Math.min(currentQty + delta, available, 10));
    
    setTierQuantities(prev => ({
      ...prev,
      [tierId]: newQty
    }));
  };

  const handlePurchase = () => {
    // For now, purchase the first tier with quantity
    // In future, we can support multi-tier purchases
    const firstTierWithQty = tiers.find(t => (tierQuantities[t.id] || 0) > 0);
    if (!firstTierWithQty) return;
    
    const quantity = tierQuantities[firstTierWithQty.id] || 0;
    const finalPrice = getTotalPrice();
    
    onPurchase(firstTierWithQty.id, finalPrice, quantity, promoCode || undefined);
    
    // Reset state
    setTierQuantities({});
    setPromoCode('');
    setPromoValidation(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('ticketSelector.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Tier Selection with Quantities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('ticketSelector.chooseTickets')}</Text>
              {tiers.map(tier => {
                const available = getAvailableQuantity(tier);
                const isAvailable = isTierAvailable(tier);
                const quantity = tierQuantities[tier.id] || 0;
                
                return (
                  <View
                    key={tier.id}
                    style={[
                      styles.tierCard,
                      !isAvailable && styles.tierCardDisabled,
                    ]}
                  >
                    <View style={styles.tierInfo}>
                      <View style={styles.tierHeader}>
                        <Text style={[
                          styles.tierName,
                          !isAvailable && styles.tierNameDisabled
                        ]}>
                          {tier.name}
                        </Text>
                        <Text style={styles.tierPrice}>
                          {tier.price.toLocaleString()} {displayCurrency}
                        </Text>
                      </View>
                      
                      {tier.description && (
                        <Text style={styles.tierDescription}>{tier.description}</Text>
                      )}
                      
                      <Text style={[
                        styles.tierAvailability,
                        !isAvailable && styles.tierSoldOut
                      ]}>
                        {isAvailable 
                          ? `${available} ${t('ticketSelector.ticketsAvailable')}`
                          : t('ticketSelector.soldOut')
                        }
                      </Text>
                    </View>
                    
                    {/* Quantity Selector */}
                    {isAvailable && (
                      <View style={styles.quantitySelector}>
                        <TouchableOpacity
                          onPress={() => updateTierQuantity(tier.id, -1)}
                          disabled={quantity === 0}
                          style={[
                            styles.quantityButton,
                            quantity === 0 && styles.quantityButtonDisabled
                          ]}
                        >
                          <Minus size={20} color={quantity === 0 ? colors.secondary : colors.primary} />
                        </TouchableOpacity>
                        
                        <Text style={styles.quantityText}>{quantity}</Text>
                        
                        <TouchableOpacity
                          onPress={() => updateTierQuantity(tier.id, 1)}
                          disabled={quantity >= available || quantity >= 10}
                          style={[
                            styles.quantityButton,
                            (quantity >= available || quantity >= 10) && styles.quantityButtonDisabled
                          ]}
                        >
                          <Plus size={20} color={(quantity >= available || quantity >= 10) ? colors.secondary : colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Promo Code */}
            {getTotalQuantity() > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('ticketSelector.promoTitle')}</Text>
                <View style={styles.promoContainer}>
                  <View style={styles.promoInputContainer}>
                    <Tag size={20} color={colors.secondary} />
                    <TextInput
                      style={styles.promoInput}
                      placeholder={t('ticketSelector.promoPlaceholder')}
                      value={promoCode}
                      onChangeText={setPromoCode}
                      autoCapitalize="characters"
                      onSubmitEditing={validatePromoCode}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.promoApplyButton}
                    onPress={validatePromoCode}
                    disabled={!promoCode.trim() || validatingPromo}
                  >
                    {validatingPromo ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.promoApplyButtonText}>{t('ticketSelector.apply')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                {promoValidation && (
                  <View style={[
                    styles.promoResult,
                    { backgroundColor: promoValidation.valid ? colors.success + '20' : colors.error + '20' }
                  ]}>
                    <Text style={[
                      styles.promoResultText,
                      { color: promoValidation.valid ? colors.success : colors.error }
                    ]}>
                      {promoValidation.valid 
                        ? promoValidation.discount_percentage
                          ? `✓ ${promoValidation.discount_percentage}% ${t('ticketSelector.discountApplied')}`
                          : promoValidation.discount_amount
                            ? `✓ ${promoValidation.discount_amount} ${displayCurrency} ${t('ticketSelector.discountApplied')}`
                            : `✓ ${t('ticketSelector.discountApplied')}`
                        : `✗ ${promoValidation.error}`
                      }
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer with Purchase Button */}
        {getTotalQuantity() > 0 && !loading && (
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <View>
                <Text style={styles.totalLabel}>
                  {getTotalQuantity()} {getTotalQuantity() === 1 ? t('ticketSelector.ticketSingular') : t('ticketSelector.ticketPlural')}
                </Text>
                {(promoValidation?.valid) && (
                  <Text style={styles.discountLabel}>
                    {t('ticketSelector.promoApplied')}
                  </Text>
                )}
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.totalPrice}>
                  {getTotalPrice().toLocaleString()} {displayCurrency}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.purchaseButton}
              onPress={handlePurchase}
            >
              <Text style={styles.purchaseButtonText}>
                {t('ticketSelector.continueToPayment')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 12,
  },
  tierCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierCardDisabled: {
    opacity: 0.5,
    backgroundColor: colors.background,
  },
  tierInfo: {
    flex: 1,
    marginRight: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  tierNameDisabled: {
    color: colors.secondary,
  },
  tierPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  tierDescription: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
    marginBottom: 4,
  },
  tierAvailability: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  tierSoldOut: {
    color: colors.error,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.3,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  discountNote: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  promoContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  promoInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primary,
  },
  promoApplyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  promoApplyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  promoResult: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  promoResultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  discountLabel: {
    fontSize: 12,
    color: colors.success,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
