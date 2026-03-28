import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { backendFetch } from '../../lib/api/backend';
import { format, subDays, startOfDay } from 'date-fns';

const { width } = Dimensions.get('window');

interface ChartData {
  date: string;
  sales: number;
  revenue: number;
}

interface EventStats {
  id: string;
  title: string;
  ticketCount: number;
  revenueCents: number;
  currency: string;
}

interface RevenueByBurrency {
  USD: number;
  HTG: number;
}

export default function OrganizerAnalyticsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    currency: 'USD',
  });
  const [revenueByBurrency, setRevenueByBurrency] = useState<RevenueByBurrency>({ USD: 0, HTG: 0 });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topEvents, setTopEvents] = useState<EventStats[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    loadData();
  }, [userProfile?.id, timeRange]);

  const loadData = async () => {
    if (!userProfile?.id) return;

    try {
      // Fetch analytics from the web API (same endpoint the web uses)
      const response = await backendFetch(`/api/organizer/analytics?range=${timeRange}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalEvents: data.totalEvents || 0,
          publishedEvents: data.publishedEvents || 0,
          totalTicketsSold: data.totalTicketsSold || 0,
          totalRevenue: data.totalRevenue || 0,
          currency: data.currency || 'USD',
        });
        setChartData(data.chartData || []);
        setTopEvents(data.topEvents || []);
      } else {
        // Fallback: Load from Firebase directly
        await loadFromFirebase();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      await loadFromFirebase();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFromFirebase = async () => {
    try {
      // Calculate the cutoff date based on time range
      const now = new Date();
      let cutoffDate: Date | null = null;
      if (timeRange === '7d') {
        cutoffDate = startOfDay(subDays(now, 7));
      } else if (timeRange === '30d') {
        cutoffDate = startOfDay(subDays(now, 30));
      }
      // 'all' means no cutoff

      // Get organizer events
      const eventsQuery = query(
        collection(db, 'events'),
        where('organizer_id', '==', userProfile?.id)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get tickets for these events
      let totalTickets = 0;
      const revenueByBurrency: RevenueByBurrency = { USD: 0, HTG: 0 };
      const eventStats: EventStats[] = [];
      const dailySales: Record<string, { sales: number; revenue: number }> = {};

      // Initialize daily sales for chart
      const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 30;
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        dailySales[dateKey] = { sales: 0, revenue: 0 };
      }

      for (const event of events) {
        const eventData = event as any;
        const eventCurrency = eventData.currency || 'USD';
        
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('event_id', '==', event.id)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        let eventTicketCount = 0;
        let eventRevenueCents = 0;

        ticketsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Get the purchase date
          let purchaseDate: Date | null = null;
          if (data.purchased_at) {
            if (data.purchased_at.toDate) {
              purchaseDate = data.purchased_at.toDate();
            } else if (typeof data.purchased_at === 'string') {
              purchaseDate = new Date(data.purchased_at);
            }
          } else if (data.created_at) {
            if (data.created_at.toDate) {
              purchaseDate = data.created_at.toDate();
            } else if (typeof data.created_at === 'string') {
              purchaseDate = new Date(data.created_at);
            }
          }

          // Filter by time range
          if (cutoffDate && purchaseDate && purchaseDate < cutoffDate) {
            return; // Skip tickets outside the time range
          }

          const pricePaidCents = Math.round((data.price_paid || 0) * 100);
          eventTicketCount++;
          eventRevenueCents += pricePaidCents;
          totalTickets++;

          // Track revenue by currency
          if (eventCurrency === 'HTG') {
            revenueByBurrency.HTG += pricePaidCents;
          } else {
            revenueByBurrency.USD += pricePaidCents;
          }

          // Track daily sales for chart
          if (purchaseDate) {
            const dateKey = format(purchaseDate, 'yyyy-MM-dd');
            if (dailySales[dateKey]) {
              dailySales[dateKey].sales++;
              dailySales[dateKey].revenue += pricePaidCents / 100;
            }
          }
        });

        if (eventTicketCount > 0) {
          eventStats.push({
            id: event.id,
            title: eventData.title || 'Unknown Event',
            ticketCount: eventTicketCount,
            revenueCents: eventRevenueCents,
            currency: eventCurrency,
          });
        }
      }

      eventStats.sort((a, b) => b.ticketCount - a.ticketCount);

      // Determine primary currency (the one with more revenue)
      const primaryCurrency = revenueByBurrency.USD >= revenueByBurrency.HTG ? 'USD' : 'HTG';
      const totalRevenueCents = revenueByBurrency[primaryCurrency];

      setStats({
        totalEvents: events.length,
        publishedEvents: events.filter((e: any) => e.is_published).length,
        totalTicketsSold: totalTickets,
        totalRevenue: totalRevenueCents / 100,
        currency: primaryCurrency,
      });
      setRevenueByBurrency(revenueByBurrency);
      setTopEvents(eventStats.slice(0, 5));

      // Build chart data
      const chart: ChartData[] = [];
      const sortedDates = Object.keys(dailySales).sort();
      // Show last 7 days for chart regardless of filter
      const chartDates = sortedDates.slice(-7);
      for (const dateKey of chartDates) {
        chart.push({
          date: format(new Date(dateKey), 'MMM dd'),
          sales: dailySales[dateKey]?.sales || 0,
          revenue: dailySales[dateKey]?.revenue || 0,
        });
      }
      setChartData(chart);
    } catch (error) {
      console.error('Error loading from Firebase:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatMoney = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'HTG' ? 'G' : '$';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format revenue display showing both currencies if both exist
  const formatTotalRevenue = () => {
    const parts: string[] = [];
    if (revenueByBurrency.USD > 0) {
      parts.push(formatMoney(revenueByBurrency.USD / 100, 'USD'));
    }
    if (revenueByBurrency.HTG > 0) {
      parts.push(formatMoney(revenueByBurrency.HTG / 100, 'HTG'));
    }
    if (parts.length === 0) {
      return formatMoney(0, stats.currency);
    }
    return parts.join(' + ');
  };

  // Simple bar chart rendering
  const maxSales = Math.max(...chartData.map(d => d.sales), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('analytics.loading') || 'Loading analytics...'}</Text>
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
        <Text style={styles.headerTitle}>{t('analytics.title') || 'Analytics'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['7d', '30d', 'all'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range === '7d' ? (t('analytics.7days') || '7 Days') :
                 range === '30d' ? (t('analytics.30days') || '30 Days') :
                 (t('analytics.allTime') || 'All Time')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardPrimary]}
            onPress={() => navigation.navigate('OrganizerPayoutSettings')}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={24} color="#FFF" />
            <Text style={styles.statValue}>{formatTotalRevenue()}</Text>
            <Text style={styles.statLabel}>{t('analytics.totalRevenue') || 'Total Revenue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="ticket-outline" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalTicketsSold}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.ticketsSold') || 'Tickets Sold'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.totalEvents') || 'Total Events'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.publishedEvents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.published') || 'Published'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sales Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('analytics.salesOverTime') || 'Sales Over Time'}</Text>
          <View style={styles.chartContainer}>
            {chartData.map((item, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <View style={styles.chartBarWrapper}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: (item.sales / maxSales) * 100 || 4 },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{item.date.split(' ')[1]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Events */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('analytics.topEvents') || 'Top Performing Events'}</Text>
          {topEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('analytics.noData') || 'No ticket sales yet'}</Text>
            </View>
          ) : (
            topEvents.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                onPress={() => navigation.navigate('OrganizerEventManagement', { eventId: event.id })}
              >
                <View style={styles.eventRank}>
                  <Text style={styles.eventRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Text style={styles.eventStats}>
                    {event.ticketCount} {t('analytics.tickets') || 'tickets'} • {formatMoney(event.revenueCents / 100, event.currency)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeRangeTextActive: {
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    width: (width - 40) / 2,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: colors.primary,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 24,
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 8,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  eventStats: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
