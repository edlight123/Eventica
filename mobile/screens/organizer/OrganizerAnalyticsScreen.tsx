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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useLocaleFormat } from '../../lib/format';
import { backendFetch } from '../../lib/api/backend';
import { RADIUS } from '../../config/brand';
import { Skeleton } from '../../components/Skeleton';
import StatTriplet from '../../components/StatTriplet';
import OrganizerScreenHeader from '../../components/organizer/OrganizerScreenHeader';
import SegmentedTabs from '../../components/organizer/SegmentedTabs';
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
  const styles = getStyles(colors);
  const { userProfile } = useAuth();
  const { t } = useI18n();
  const { formatMoney: fmtMoney } = useLocaleFormat();
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
        // The "Total Revenue" card reads revenueByBurrency (in cents). The API returns
        // revenueByCurrency in major units, so convert. Without this the card would show 0
        // whenever the API path succeeds.
        setRevenueByBurrency({
          USD: Math.round((data.revenueByCurrency?.USD || 0) * 100),
          HTG: Math.round((data.revenueByCurrency?.HTG || 0) * 100),
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

  // Delegate to the shared, currency-aware formatter so HTG renders as a suffixed
  // code (`1,234.56 HTG`) and USD as a prefixed symbol (`$1,234.56`) — never a
  // hardcoded `$`/`G`.
  const formatMoney = (amount: number, currency: string = 'USD') =>
    fmtMoney(amount, { currency });

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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <OrganizerScreenHeader title={t('analytics.title') || 'Analytics'} onBack={() => navigation.goBack()} />
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={(width - 40) / 2} height={104} radius={RADIUS.lg} />
            ))}
          </View>
          <Skeleton width="100%" height={200} radius={RADIUS.xl} />
          <Skeleton width="100%" height={160} radius={RADIUS.xl} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <OrganizerScreenHeader title={t('analytics.title') || 'Analytics'} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <SegmentedTabs
            value={timeRange}
            onChange={(key) => setTimeRange(key as '7d' | '30d' | 'all')}
            tabs={[
              { key: '7d', label: t('analytics.7days') || '7 Days' },
              { key: '30d', label: t('analytics.30days') || '30 Days' },
              { key: 'all', label: t('analytics.allTime') || 'All Time' },
            ]}
          />
        </View>

        {/* Stats — the POSH metric grid (§2.3): neutral raised surface, teal only
            as the revenue numeral accent. */}
        <View style={styles.statsWrap}>
          <StatTriplet
            columns={2}
            items={[
              { label: t('analytics.totalRevenue') || 'Total Revenue', value: formatTotalRevenue(), tone: 'brand' },
              { label: t('analytics.ticketsSold') || 'Tickets Sold', value: stats.totalTicketsSold },
              { label: t('analytics.totalEvents') || 'Total Events', value: stats.totalEvents },
              { label: t('analytics.published') || 'Published', value: stats.publishedEvents },
            ]}
          />
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
                  <Text style={styles.eventStats} numberOfLines={1}>
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

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  timeRangeContainer: {
    paddingVertical: 12,
  },
  statsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  chartCard: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.xl,
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
    borderRadius: 6,
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
    backgroundColor: colors.surfaceRaised,
    borderRadius: RADIUS.xl,
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
