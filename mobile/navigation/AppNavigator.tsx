import React, { useRef, useState, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAppMode } from '../contexts/AppModeContext';
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
import EventTicketsScreen from '../screens/EventTicketsScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import OrganizerProfileScreen from '../screens/OrganizerProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
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
  EventTickets: { eventId: string };
  TicketDetail: { ticketId: string };
  OrganizerProfile: { organizerId: string };
  Notifications: { userId: string };
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

function AttendeeTabNavigator() {
  const { t } = useI18n();
  return (
    <AttendeeTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Tickets') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <AttendeeTab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tabs.home') }} />
      <AttendeeTab.Screen name="Discover" component={DiscoverScreen} options={{ tabBarLabel: t('tabs.discover') }} />
      <AttendeeTab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: t('tabs.favorites') }} />
      <AttendeeTab.Screen name="Tickets" component={TicketsScreen} options={{ tabBarLabel: t('tabs.tickets') }} />
      <AttendeeTab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabs.profile') }} />
    </AttendeeTab.Navigator>
  );
}

function OrganizerTabNavigator() {
  const { t } = useI18n();
  return (
    <OrganizerTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'MyEvents') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <OrganizerTab.Screen name="Dashboard" component={OrganizerDashboardScreen} options={{ tabBarLabel: t('tabs.dashboard') }} />
      <OrganizerTab.Screen 
        name="MyEvents" 
        component={OrganizerEventsScreen}
        options={{ title: t('tabs.myEvents'), tabBarLabel: t('tabs.myEvents') }}
      />
      <OrganizerTab.Screen name="Scan" component={OrganizerScanScreen} options={{ tabBarLabel: t('tabs.scan') }} />
      <OrganizerTab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabs.profile') }} />
    </OrganizerTab.Navigator>
  );
}

function StaffTabNavigator() {
  const { t } = useI18n();
  return (
    <StaffTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <StaffTab.Screen name="Events" component={StaffEventsScreen} options={{ tabBarLabel: t('tabs.events') }} />
      <StaffTab.Screen name="Scan" component={StaffScanScreen} options={{ tabBarLabel: t('tabs.scan') }} />
      <StaffTab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabs.profile') }} />
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
      'eventica://',
      'https://joineventica.com',
      'https://joineventica.com',
      'https://www.joineventica.com',
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
    <NavigationContainer ref={navigationRef} linking={linking as any}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
            <Stack.Screen name="EventTickets" component={EventTicketsScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <Stack.Screen name="OrganizerProfile" component={OrganizerProfileScreen} />
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
  );
}
