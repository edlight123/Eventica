import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft } from 'lucide-react-native';
import TicketPassCard from '../components/TicketPassCard';
import QRCodeModal from '../components/QRCodeModal';
import TransferTicketModal from '../components/TransferTicketModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EventTicketsScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { eventId } = route.params;
  const { user } = useAuth();
  const { t } = useI18n();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [ticketToTransfer, setTicketToTransfer] = useState<any>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchEventAndTickets();
  }, [eventId]);

  useEffect(() => {
    if (!loading && event) {
      // Animate card entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, event]);

  const fetchEventAndTickets = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch event details
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );
      const eventSnapshot = await getDocs(eventQuery);
      
      if (!eventSnapshot.empty) {
        const eventDoc = eventSnapshot.docs[0];
        const eventData = eventDoc.data();
        setEvent({
          id: eventDoc.id,
          ...eventData,
          start_datetime: eventData.start_datetime?.toDate ? eventData.start_datetime.toDate() : new Date(eventData.start_datetime),
          end_datetime: eventData.end_datetime?.toDate ? eventData.end_datetime.toDate() : new Date(eventData.end_datetime),
        });
      }

      // Fetch tickets for this event and user
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('event_id', '==', eventId),
        where('user_id', '==', user.uid)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching event and tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event || tickets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('eventTickets.noneFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleQRPress = (ticket: any) => {
    setSelectedTicket(ticket);
    setQrModalVisible(true);
  };

  const handleViewEvent = () => {
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  const handleTransferPress = (ticket: any) => {
    setTicketToTransfer(ticket);
    setTransferModalVisible(true);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const renderTicket = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.pageContainer}>
      <TicketPassCard
        ticket={item}
        event={event}
        user={user}
        ticketNumber={index + 1}
        onQRPress={() => handleQRPress(item)}
        onViewEvent={handleViewEvent}
        onTransferPress={() => handleTransferPress(item)}
      />
    </View>
  );

  const renderPaginationDots = () => {
    if (tickets.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {tickets.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Background */}
      <LinearGradient
        colors={['#1a1a1a', '#0f766e', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        {/* Event Info Section */}
        <View style={styles.eventInfoSection}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.currentTicketIndicator}>
            {t('tickets.ticketSingular')} {currentIndex + 1} {t('common.of')} {tickets.length}
          </Text>
        </View>

        {/* Horizontal Pager */}
        <Animated.View
          style={[
            styles.pagerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.flatListContent}
          />
        </Animated.View>

        {/* Pagination Dots */}
        {renderPaginationDots()}
      </SafeAreaView>

      {/* QR Code Modal */}
      {selectedTicket && (
        <QRCodeModal
          visible={qrModalVisible}
          onClose={() => setQrModalVisible(false)}
          ticketId={selectedTicket.id}
          ticketNumber={`${t('tickets.ticketSingular')} #${tickets.indexOf(selectedTicket) + 1}`}
        />
      )}

      {/* Transfer Modal */}
      {ticketToTransfer && (
        <TransferTicketModal
          visible={transferModalVisible}
          onClose={() => setTransferModalVisible(false)}
          ticketId={ticketToTransfer.id}
          eventTitle={event.title}
          transferCount={ticketToTransfer.transfer_count || 0}
          onTransferSuccess={() => {
            setTransferModalVisible(false);
            fetchEventAndTickets();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  eventInfoSection: {
    paddingHorizontal: 24,
    paddingVertical: 5,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  ticketCount: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  currentTicketIndicator: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  pagerContainer: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageContainer: {
    width: SCREEN_WIDTH - 32,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#FFF',
  },
});
