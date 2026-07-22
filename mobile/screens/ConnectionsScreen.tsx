import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Users, Search, Phone, Inbox, Send, UserPlus } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ConnectButton from '../components/ConnectButton';
import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import {
  fetchConnections,
  searchUsers,
  matchContacts,
  type ConnectionsOverview,
  type UserSearchResult,
} from '../lib/api/social';
import type { PublicUserSummary, FriendshipState, ContactMatch } from '../types/social';

type Tab = 'friends' | 'requests' | 'find';

function Avatar({ user, colors, size = 44 }: { user: PublicUserSummary; colors: any; size?: number }) {
  const initial = (user.displayName || 'U').charAt(0).toUpperCase();
  if (user.photoURL) {
    return <Image source={{ uri: user.photoURL }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

function PersonRow({
  user,
  state,
  colors,
  onOpen,
  onChange,
  onRequireAuth,
}: {
  user: PublicUserSummary;
  state: FriendshipState;
  colors: any;
  onOpen: (uid: string) => void;
  onChange?: (s: FriendshipState) => void;
  onRequireAuth?: () => void;
}) {
  const styles = getStyles(colors);
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={() => onOpen(user.uid)} activeOpacity={0.7}>
        <Avatar user={user} colors={colors} />
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {user.displayName}
          </Text>
          {user.isVerified && <VerifiedBadge size="small" showLabel style={styles.rowVerified} />}
        </View>
      </TouchableOpacity>
      <ConnectButton
        targetUserId={user.uid}
        initialState={state}
        size="sm"
        onChange={onChange}
        onRequireAuth={onRequireAuth}
      />
    </View>
  );
}

export default function ConnectionsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('friends');
  const [overview, setOverview] = useState<ConnectionsOverview>({ friends: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async () => {
    const data = await fetchConnections();
    setOverview(data);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const data = await fetchConnections();
      if (active) {
        setOverview(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOverview();
    setRefreshing(false);
  }, [loadOverview]);

  const openProfile = (uid: string) => navigation.navigate('OrganizerProfile', { organizerId: uid });

  const goToLogin = () => navigation.navigate('Auth');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={16}>
          <ChevronLeft size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Friends</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabBtn label="Friends" count={overview.friends.length} active={tab === 'friends'} onPress={() => setTab('friends')} colors={colors} />
        <TabBtn label="Requests" count={overview.incoming.length} highlight active={tab === 'requests'} onPress={() => setTab('requests')} colors={colors} />
        <TabBtn label="Find" active={tab === 'find'} onPress={() => setTab('find')} colors={colors} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tab === 'find' ? (
        <FindTab colors={colors} onOpen={openProfile} onChange={loadOverview} onRequireAuth={goToLogin} insets={insets} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {tab === 'friends' && (
            <FriendsTab overview={overview} colors={colors} onOpen={openProfile} onChange={loadOverview} onRequireAuth={goToLogin} />
          )}
          {tab === 'requests' && (
            <RequestsTab overview={overview} colors={colors} onOpen={openProfile} onChange={loadOverview} onRequireAuth={goToLogin} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabBtn({
  label,
  count,
  highlight,
  active,
  onPress,
  colors,
}: {
  label: string;
  count?: number;
  highlight?: boolean;
  active: boolean;
  onPress: () => void;
  colors: any;
}) {
  const styles = getStyles(colors);
  return (
    <TouchableOpacity style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      {count ? (
        <View style={[styles.badge, highlight && { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function FriendsTab({ overview, colors, onOpen, onChange, onRequireAuth }: any) {
  const styles = getStyles(colors);
  if (overview.friends.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No friends yet"
        subtitle="Find friends from your contacts or by searching their name."
      />
    );
  }
  return (
    <View style={styles.card}>
      {overview.friends.map((f: PublicUserSummary, i: number) => (
        <View key={f.uid} style={i > 0 ? styles.divider : undefined}>
          <PersonRow user={f} state="friends" colors={colors} onOpen={onOpen} onChange={onChange} onRequireAuth={onRequireAuth} />
        </View>
      ))}
    </View>
  );
}

function RequestsTab({ overview, colors, onOpen, onChange, onRequireAuth }: any) {
  const styles = getStyles(colors);
  const { incoming, outgoing } = overview;
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No pending requests"
        subtitle="Friend requests you send or receive will appear here."
      />
    );
  }
  return (
    <View>
      {incoming.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={styles.sectionLabelRow}>
            <Inbox size={15} color={colors.textSecondary} />
            <Text style={styles.sectionLabel}>Received</Text>
          </View>
          <View style={styles.card}>
            {incoming.map((u: PublicUserSummary, i: number) => (
              <View key={u.uid} style={i > 0 ? styles.divider : undefined}>
                <PersonRow user={u} state="request_received" colors={colors} onOpen={onOpen} onChange={onChange} onRequireAuth={onRequireAuth} />
              </View>
            ))}
          </View>
        </View>
      )}
      {outgoing.length > 0 && (
        <View>
          <View style={styles.sectionLabelRow}>
            <Send size={15} color={colors.textSecondary} />
            <Text style={styles.sectionLabel}>Sent</Text>
          </View>
          <View style={styles.card}>
            {outgoing.map((u: PublicUserSummary, i: number) => (
              <View key={u.uid} style={i > 0 ? styles.divider : undefined}>
                <PersonRow user={u} state="request_sent" colors={colors} onOpen={onOpen} onChange={onChange} onRequireAuth={onRequireAuth} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function FindTab({ colors, onOpen, onChange, onRequireAuth, insets }: any) {
  const styles = getStyles(colors);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [contactMatches, setContactMatches] = useState<ContactMatch[] | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        setResults(await searchUsers(query));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const syncContacts = useCallback(async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow contact access to find friends already on Tikèm. Your contacts are only used to match and are never stored.'
        );
        return;
      }
      setContactLoading(true);
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      const phones: string[] = [];
      data.forEach((c) => {
        (c.phoneNumbers || []).forEach((p) => {
          if (p.number) phones.push(p.number);
        });
      });
      if (phones.length === 0) {
        Alert.alert('No numbers found', 'We couldn\'t find any phone numbers in your contacts.');
        setContactMatches([]);
        return;
      }
      setContactMatches(await matchContacts(phones));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not sync contacts. Please try again.');
    } finally {
      setContactLoading(false);
    }
  }, []);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Search */}
      <View style={styles.searchBox}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={colors.textSecondary} />}
      </View>

      {results.length > 0 && (
        <View style={[styles.card, { marginTop: 12 }]}>
          {results.map((r, i) => (
            <View key={r.uid} style={i > 0 ? styles.divider : undefined}>
              <PersonRow user={r} state={r.friendship} colors={colors} onOpen={onOpen} onChange={onChange} onRequireAuth={onRequireAuth} />
            </View>
          ))}
        </View>
      )}
      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <Text style={styles.noResults}>No people found for “{query}”.</Text>
      )}

      {/* Contact sync */}
      <View style={styles.contactCard}>
        <View style={styles.contactHeader}>
          <View style={styles.contactIcon}>
            <Phone size={20} color={colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Find friends from contacts</Text>
            <Text style={styles.contactSub}>
              We only match numbers you already have. Your contacts are never stored.
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.syncBtn} onPress={syncContacts} disabled={contactLoading} activeOpacity={0.85}>
          {contactLoading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <>
              <UserPlus size={16} color="#000000" />
              <Text style={styles.syncBtnText}>Sync contacts</Text>
            </>
          )}
        </TouchableOpacity>

        {contactMatches !== null && (
          <View style={{ marginTop: 12 }}>
            {contactMatches.length === 0 ? (
              <Text style={styles.noResults}>None of your contacts are on Tikèm yet — invite them!</Text>
            ) : (
              <View>
                <Text style={styles.sectionLabel}>{contactMatches.length} on Tikèm</Text>
                <View style={[styles.card, { marginTop: 8 }]}>
                  {contactMatches.map((m, i) => (
                    <View key={m.uid} style={i > 0 ? styles.divider : undefined}>
                      <PersonRow user={m} state={m.friendship} colors={colors} onOpen={onOpen} onChange={onChange} onRequireAuth={onRequireAuth} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    backBtn: {
      padding: 2,
    },
    topTitle: {
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: colors.text,
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.borderLight,
      borderRadius: 12,
      padding: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      borderRadius: 9,
    },
    tabBtnActive: {
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    tabBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabBtnTextActive: {
      color: colors.primary,
    },
    badge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: colors.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    // Elevation, not borders (POSH §1).
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowInfo: {
      flex: 1,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowVerified: {
      marginTop: 3,
    },
    sectionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceRaised,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    noResults: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 14,
    },
    contactCard: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    contactSub: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
    // White pill primary (POSH §2.2) — not a teal fill.
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.white,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 14,
    },
    syncBtnText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: '700',
    },
  });
