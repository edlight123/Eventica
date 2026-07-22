import React, { useRef, useState, useEffect } from 'react';
import { AppState, Alert, View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../config/brand';
import { getVerificationRequest } from '../lib/verification';
import { getPendingInvite } from '../lib/pendingInvite';
import { clearPendingPayment, getPendingPayment } from '../lib/pendingPayment';
import { addPushNotificationListeners, registerForPushNotificationsIfPossible } from '../lib/pushNotifications';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Attendee Screens
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import TicketsScreen from '../screens/TicketsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Organizer Screens
import OrganizerDashboardScreen from '../screens/organizer/OrganizerDashboardScreen';
import OrganizerEventsScreen from '../screens/organizer/OrganizerEventsScreen';
import OrganizerScanScreen from '../screens/organizer/OrganizerScanScreen';
import OrganizerEventManagementScreen from '../screens/organizer/OrganizerEventManagementScreen';
import OrganizerEventEarningsScreen from '../screens/organizer/OrganizerEventEarningsScreen';
import OrganizerEventStaffScreen from '../screens/organizer/OrganizerEventStaffScreen';
import OrganizerPayoutSettingsScreen from '../screens/organizer/OrganizerPayoutSettingsScreenV2';
import OrganizerPromoCodesScreen from '../screens/organizer/OrganizerPromoCodesScreen';
import CreateEventFlowRefactored from '../screens/organizer/CreateEventFlowRefactored';
import TicketScannerScreen from '../screens/organizer/TicketScannerScreen';
import EventAttendeesScreen from '../screens/organizer/EventAttendeesScreen';
import SendEventUpdateScreen from '../screens/organizer/SendEventUpdateScreen';

// Staff Screens
import StaffEventsScreen from '../screens/staff/StaffEventsScreen';
import StaffScanScreen from '../screens/staff/StaffScanScreen';

// Invite Screen
import InviteRedeemScreen from '../screens/InviteRedeemScreen';

// Detail Screens
import EventDetailScreen from '../screens/EventDetailScreen';
import CategoryEventsScreen from '../screens/CategoryEventsScreen';
import EventTicketsScreen from '../screens/EventTicketsScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import OrganizerProfileScreen from '../screens/OrganizerProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import PaymentWebViewScreen from '../screens/PaymentWebViewScreen';
import StripeConnectWebViewScreen from '../screens/StripeConnectWebViewScreen';
import InAppWebViewScreen from '../screens/InAppWebViewScreen';
import { useI18n } from '../contexts/I18nContext';

// New Feature Screens
import RefundRequestScreen from '../screens/RefundRequestScreen';
import ReviewScreen from '../screens/ReviewScreen';
import OrganizerAnalyticsScreen from '../screens/organizer/OrganizerAnalyticsScreen';
import OrganizerRefundsScreen from '../screens/organizer/OrganizerRefundsScreen';

// Verification Screens
import OrganizerVerificationScreen from '../screens/verification/OrganizerVerificationScreen';
import OrganizerInfoFormScreen from '../screens/verification/OrganizerInfoFormScreen';
import GovernmentIDUploadScreen from '../screens/verification/GovernmentIDUploadScreen';
import SelfieUploadScreen from '../screens/verification/SelfieUploadScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  InviteRedeem: { eventId?: string; token?: string };
  PaymentWebView: { url: string; title?: string; authToken?: string | null; eventId?: string };
  StripeConnectWebView: { url: string };
  InAppWebView: { url: string; title?: string };
  EventDetail: { eventId: string };
  CategoryEvents: { category: string; title?: string };
  EventTickets: { eventId: string };
  TicketDetail: { ticketId: string };
  OrganizerProfile: { organizerId: string };
  Notifications: { userId: string };
  Connections: undefined;
  OrganizerEventManagement: { eventId: string };
  OrganizerEventEarnings: { eventId: string };
  OrganizerPayoutSettings: undefined;
  OrganizerEventStaff: { eventId: string };
  OrganizerPromoCodes: { eventId: string };
  OrganizerVerification: undefined;
  OrganizerInfoForm: { onComplete?: () => void };
  GovernmentIDUpload: { onComplete?: () => void };
  SelfieUpload: { onComplete?: () => void };
  CreateEvent: undefined;
  TicketScanner: { eventId: string };
  EventAttendees: { eventId: string };
  SendEventUpdate: { eventId: string; eventTitle: string };
  EditEvent: { eventId: string };
  // New screens
  RefundRequest: { ticketId: string };
  Review: { ticketId: string; eventId: string; eventTitle: string };
  OrganizerAnalytics: undefined;
  OrganizerRefunds: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type AttendeeTabParamList = {
  Home: undefined;
  Discover: undefined;
  Favorites: undefined;
  Tickets: undefined;
  Profile: undefined;
};

export type OrganizerTabParamList = {
  Dashboard: undefined;
  MyEvents: undefined;
  Scan: undefined;
  Profile: undefined;
};

export type StaffTabParamList = {
  Events: undefined;
  Scan: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AttendeeTab = createBottomTabNavigator<AttendeeTabParamList>();
const OrganizerTab = createBottomTabNavigator<OrganizerTabParamList>();
const StaffTab = createBottomTabNavigator<StaffTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Custom Animated Tab Bar ───────────────────────────────────────────────

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  tabs: Array<{ name: string; label: string; icon: string; activeIcon: string }>;
}

function CustomTabBar({ state, descriptors, navigation, tabs }: TabBarProps) {
  const { colors, isDark } = useTheme();
  const anims = useRef(tabs.map((_, i) => new Animated.Value(state.index === i ? 1 : 0))).current;

  useEffect(() => {
    tabs.forEach((_, i) => {
      Animated.spring(anims[i], {
        toValue: state.index === i ? 1 : 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[tabBarStyles.container, {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
    }]}>
      {tabs.map((tab, index) => {
        const isFocused = state.index === index;
        const a = anims[index];
        const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
        const lift = a.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
        const iconColor = isFocused ? colors.primary : colors.textTertiary;

        const onPress = () => {
          const route = state.routes[index];
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(tab.name);
          } else if (isFocused) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={tabBarStyles.tab}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
          >
            <Animated.View style={[tabBarStyles.iconWrap, { transform: [{ scale }, { translateY: lift }] }]}>
              <Ionicons
                name={(isFocused ? tab.activeIcon : tab.icon) as any}
                size={24}
                color={iconColor}
              />
            </Animated.View>
            {/* Short text label — a first-time Haitian audience needs more than
                a cryptic icon (POSH §3). Teal active tint stays semantic. */}
            <Text
              style={[tabBarStyles.label, { color: iconColor }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Dark canvas: the hairline top border is the separator. No drop shadow.
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  topAccent: {
    width: 26,
    height: 3,
    borderRadius: 999,
    marginBottom: 5,
  },
  iconWrap: {
    width: 56,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: 0.1,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ─── Tab Navigators ────────────────────────────────────────────────────────

function AttendeeTabNavigator() {
  const { t } = useI18n();
  const attendeeTabs = [
    { name: 'Home', label: t('tabs.home'), icon: 'home-outline', activeIcon: 'home' },
    { name: 'Discover', label: t('tabs.discover'), icon: 'search-outline', activeIcon: 'search' },
    { name: 'Favorites', label: t('tabs.favorites'), icon: 'heart-outline', activeIcon: 'heart' },
    { name: 'Tickets', label: t('tabs.tickets'), icon: 'ticket-outline', activeIcon: 'ticket' },
    { name: 'Profile', label: t('tabs.profile'), icon: 'person-outline', activeIcon: 'person' },
  ];
  return (
    <AttendeeTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} tabs={attendeeTabs} />}
      screenOptions={{ headerShown: false }}
    >
      <AttendeeTab.Screen name="Home" component={HomeScreen} />
      <AttendeeTab.Screen name="Discover" component={DiscoverScreen} />
      <AttendeeTab.Screen name="Favorites" component={FavoritesScreen} />
      <AttendeeTab.Screen name="Tickets" component={TicketsScreen} />
      <AttendeeTab.Screen name="Profile" component={ProfileScreen} />
    </AttendeeTab.Navigator>
  );
}

function OrganizerTabNavigator() {
  const { t } = useI18n();
  const organizerTabs = [
    { name: 'Dashboard', label: t('tabs.dashboard'), icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
    { name: 'MyEvents', label: t('tabs.myEvents'), icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Scan', label: t('tabs.scan'), icon: 'qr-code-outline', activeIcon: 'qr-code' },
    { name: 'Profile', label: t('tabs.profile'), icon: 'person-outline', activeIcon: 'person' },
  ];
  return (
    <OrganizerTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} tabs={organizerTabs} />}
      screenOptions={{ headerShown: false }}
    >
      <OrganizerTab.Screen name="Dashboard" component={OrganizerDashboardScreen} />
      <OrganizerTab.Screen name="MyEvents" component={OrganizerEventsScreen} options={{ title: t('tabs.myEvents') }} />
      <OrganizerTab.Screen name="Scan" component={OrganizerScanScreen} />
      <OrganizerTab.Screen name="Profile" component={ProfileScreen} />
    </OrganizerTab.Navigator>
  );
}

function StaffTabNavigator() {
  const { t } = useI18n();
  const staffTabs = [
    { name: 'Events', label: t('tabs.events'), icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Scan', label: t('tabs.scan'), icon: 'qr-code-outline', activeIcon: 'qr-code' },
    { name: 'Profile', label: t('tabs.profile'), icon: 'person-outline', activeIcon: 'person' },
  ];
  return (
    <StaffTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} tabs={staffTabs} />}
      screenOptions={{ headerShown: false }}
    >
      <StaffTab.Screen name="Events" component={StaffEventsScreen} />
      <StaffTab.Screen name="Scan" component={StaffScanScreen} />
      <StaffTab.Screen name="Profile" component={ProfileScreen} />
    </StaffTab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, userProfile } = useAuth();
  const { mode, isLoading: modeLoading } = useAppMode();
  const { t } = useI18n();
  const [isVerified, setIsVerified] = useState(false);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const didApplyModeResetRef = useRef(false);

  // Handle notification taps (deep links / URLs).
  useEffect(() => {
    const unsubscribe = addPushNotificationListeners((url) => {
      try {
        ExpoLinking.openURL(url);
      } catch (e) {
        console.warn('Failed to open notification URL', e);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    checkVerificationStatus();
  }, [userProfile?.id]);

  useEffect(() => {
    // If a staff invite link was opened while logged out, resume it after login.
    const maybeResumeInvite = async () => {
      if (!user) return;
      try {
        const pending = await getPendingInvite();
        if (pending?.eventId && pending?.token) {
          navigationRef.navigate('InviteRedeem', pending);
        }
      } catch {
        // ignore
      }
    };

    maybeResumeInvite();
  }, [user, navigationRef]);

  // Register for push notifications once user is signed in.
  useEffect(() => {
    if (!user?.uid) return;
    registerForPushNotificationsIfPossible().catch((e) => console.warn('Push registration failed', e));
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    let lastPromptAt = 0;
    const maybePromptPendingPayment = async () => {
      const now = Date.now();
      // Debounce prompts so we don't annoy users.
      if (now - lastPromptAt < 10_000) return;
      lastPromptAt = now;

      const pending = await getPendingPayment().catch(() => null);
      if (!pending?.url) return;

      Alert.alert(t('screens.payment.pendingTitle'), t('screens.payment.pendingBody'), [
        {
          text: t('screens.payment.continue'),
          onPress: () => {
            navigationRef.navigate('PaymentWebView', {
              url: pending.url,
              title: pending.title || t('screens.payment.complete'),
              eventId: pending.eventId,
            });
          },
        },
        {
          text: t('screens.payment.checkTickets'),
          onPress: async () => {
            await clearPendingPayment().catch(() => {});
            navigationRef.reset({
              index: 0,
              routes: [{ name: 'Main' as any, params: { screen: 'Tickets' } } as any],
            });
          },
        },
        {
          text: t('screens.payment.discard'),
          style: 'destructive',
          onPress: async () => {
            await clearPendingPayment().catch(() => {});
          },
        },
      ]);
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        maybePromptPendingPayment().catch(() => {});
      }
    });

    // Also check once shortly after login.
    const promptTimeout = setTimeout(() => {
      maybePromptPendingPayment().catch(() => {});
    }, 800);

    return () => {
      clearTimeout(promptTimeout);
      sub.remove();
    };
  }, [navigationRef, user]);

  const checkVerificationStatus = async () => {
    if (!userProfile?.id) {
      setIsVerified(false);
      return;
    }

    try {
      const verification = await getVerificationRequest(userProfile.id);
      setIsVerified(verification?.status === 'approved');
    } catch (error) {
      setIsVerified(false);
    }
  };

  // Determine which tab navigator to show based on mode and user role/verification
  const canUseOrganizerMode =
    userProfile?.role === 'organizer' ||
    userProfile?.role === 'admin' ||
    isVerified;

  // When the mode changes (via Account actions), always jump to the first tab.
  useEffect(() => {
    if (loading || modeLoading) return;
    if (!user) return;

    // Skip the first run to avoid resetting on initial app load.
    if (!didApplyModeResetRef.current) {
      didApplyModeResetRef.current = true;
      return;
    }

    const initialTab =
      mode === 'staff'
        ? 'Events'
        : mode === 'organizer' && canUseOrganizerMode
          ? 'Dashboard'
          : 'Home';

    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Main' as any, params: { screen: initialTab } } as any],
    });
  }, [canUseOrganizerMode, loading, mode, modeLoading, navigationRef, user]);

  if (loading || modeLoading) {
    return null; // or a loading screen
  }

  const MainTabNavigator = 
    mode === 'staff'
      ? StaffTabNavigator
      : mode === 'organizer' && canUseOrganizerMode
        ? OrganizerTabNavigator
        : AttendeeTabNavigator;

  const linking = {
    prefixes: [
      ExpoLinking.createURL('/'),
      'tikem://',
      'https://tikem.co',
      'https://tikem.co',
      'https://www.tikem.co',
    ],
    config: {
      screens: {
        InviteRedeem: 'invite',
        Notifications: 'notifications',
        TicketDetail: 'tickets/:ticketId',
        EventDetail: 'events/:eventId',
      },
    },
  };

  return (
    <ThemeProvider>
    <NavigationContainer ref={navigationRef} linking={linking as any}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // Dark, consistent headers for the few screens that use the default
          // native header (PaymentWebView, InAppWebView, Notifications,
          // OrganizerEventManagement, OrganizerEventStaff, OrganizerPromoCodes).
          // Screens with their own in-screen headers set headerShown:false and
          // are unaffected.
          headerStyle: { backgroundColor: '#0A0A0A' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { color: '#FFFFFF', fontWeight: '700' },
          headerShadowVisible: false,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="InviteRedeem" component={InviteRedeemScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="InviteRedeem" component={InviteRedeemScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="PaymentWebView"
              component={PaymentWebViewScreen}
              options={({ route }) => ({
                headerShown: true,
                headerTitle: (route as any)?.params?.title || t('screens.payment.complete'),
              })}
            />
            <Stack.Screen name="StripeConnectWebView" component={StripeConnectWebViewScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="InAppWebView"
              component={InAppWebViewScreen}
              options={({ route }) => ({
                headerShown: true,
                headerTitle: (route as any)?.params?.title || '',
              })}
            />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="CategoryEvents" component={CategoryEventsScreen} />
            <Stack.Screen name="EventTickets" component={EventTicketsScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
            <Stack.Screen name="Connections" component={ConnectionsScreen} />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, headerTitle: t('screens.notifications.title') }}
            />
            <Stack.Screen 
              name="OrganizerVerification" 
              component={OrganizerVerificationScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="OrganizerInfoForm" 
              component={OrganizerInfoFormScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="GovernmentIDUpload" 
              component={GovernmentIDUploadScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="SelfieUpload" 
              component={SelfieUploadScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="OrganizerEventManagement" component={OrganizerEventManagementScreen} options={{ headerShown: true, headerTitle: 'Manage Event' }} />
            <Stack.Screen name="OrganizerEventEarnings" component={OrganizerEventEarningsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OrganizerPayoutSettings" component={OrganizerPayoutSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OrganizerEventStaff" component={OrganizerEventStaffScreen} options={{ headerShown: true }} />
            <Stack.Screen
              name="OrganizerPromoCodes"
              component={OrganizerPromoCodesScreen}
              options={{ headerShown: true, headerTitle: t('organizerPromoCodes.title') }}
            />
            <Stack.Screen name="CreateEvent" component={CreateEventFlowRefactored} options={{ headerShown: false }} />
            <Stack.Screen name="TicketScanner" component={TicketScannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EventAttendees" component={EventAttendeesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SendEventUpdate" component={SendEventUpdateScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditEvent" component={CreateEventFlowRefactored} options={{ headerShown: false }} />
            <Stack.Screen name="RefundRequest" component={RefundRequestScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Review" component={ReviewScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OrganizerAnalytics" component={OrganizerAnalyticsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OrganizerRefunds" component={OrganizerRefundsScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </ThemeProvider>
  );
}
