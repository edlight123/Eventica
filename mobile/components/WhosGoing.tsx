import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users, Lock } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchEventSocial } from '../lib/api/social';
import { font } from '../theme/tokens';
import type { EventSocialAttendance, PublicUserSummary } from '../types/social';

interface WhosGoingProps {
  eventId: string;
}

function Avatar({ user, size = 40 }: { user: PublicUserSummary; size?: number }) {
  const initial = (user.displayName || 'U').charAt(0).toUpperCase();
  if (user.photoURL) {
    return (
      <Image
        source={{ uri: user.photoURL }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#FFFFFF' }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#14B8A6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

export default function WhosGoing({ eventId }: WhosGoingProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation: any = useNavigation();
  const { user } = useAuth();
  const [data, setData] = useState<EventSocialAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchEventSocial(eventId)
      .then((d) => {
        if (active) setData(d);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const goToProfile = (uid: string) => navigation.navigate('OrganizerProfile', { organizerId: uid });

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.header}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.title}>Who&apos;s going</Text>
        </View>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!data || data.totalGoing === 0) return null;

  const { totalGoing, viewerIsGoing, friendsGoing, publicGoing } = data;
  const pile = publicGoing.slice(0, 6);
  const named = friendsGoing.length + pile.length + (viewerIsGoing ? 1 : 0);
  const remaining = Math.max(0, totalGoing - named);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.title}>Who&apos;s going</Text>
        </View>
        <Text style={styles.count}>
          {totalGoing} {totalGoing === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {/* Friends going */}
      {friendsGoing.length > 0 && (
        <View style={styles.friendsBlock}>
          <Text style={styles.friendsLabel}>
            {friendsGoing.length} {friendsGoing.length === 1 ? 'friend' : 'friends'} going
          </Text>
          <View style={styles.friendsWrap}>
            {friendsGoing.map((f) => (
              <TouchableOpacity key={f.uid} style={styles.friendChip} onPress={() => goToProfile(f.uid)} activeOpacity={0.8}>
                <Avatar user={f} size={26} />
                <Text style={styles.friendName} numberOfLines={1}>
                  {f.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Public face pile */}
      {(pile.length > 0 || viewerIsGoing) && (
        <View style={styles.pileRow}>
          <View style={styles.pile}>
            {viewerIsGoing && (
              <View style={[styles.youBubble]}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
            {pile.map((u, i) => (
              <TouchableOpacity
                key={u.uid}
                onPress={() => goToProfile(u.uid)}
                style={{ marginLeft: i === 0 && !viewerIsGoing ? 0 : -10 }}
                activeOpacity={0.8}
              >
                <Avatar user={u} size={40} />
              </TouchableOpacity>
            ))}
            {remaining > 0 && (
              <View style={[styles.moreBubble, { marginLeft: -10 }]}>
                <Text style={styles.moreText}>+{remaining}</Text>
              </View>
            )}
          </View>
          <Text style={styles.pileLabel}>{viewerIsGoing ? "You're going" : `${totalGoing} going`}</Text>
        </View>
      )}

      {/* Privacy fallback */}
      {friendsGoing.length === 0 && pile.length === 0 && (
        <View style={styles.privacyRow}>
          <Lock size={16} color={colors.textSecondary} />
          <Text style={styles.privacyText}>
            {totalGoing} {totalGoing === 1 ? 'person is' : 'people are'} going. Attendees keep their attendance private.
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    count: {
      fontFamily: font.mono,
      fontSize: 12,
      letterSpacing: 0.4,
      color: colors.textSecondary,
    },
    friendsBlock: {
      marginBottom: 14,
    },
    friendsLabel: {
      fontFamily: font.mono,
      fontSize: 11,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    friendsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    friendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary + '14',
      borderRadius: 999,
      paddingLeft: 4,
      paddingRight: 12,
      paddingVertical: 4,
      maxWidth: 180,
    },
    friendName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    pileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pile: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    youBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    youText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 11,
    },
    moreBubble: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    moreText: {
      fontFamily: font.mono,
      color: colors.textSecondary,
      fontSize: 12,
    },
    pileLabel: {
      fontFamily: font.mono,
      fontSize: 12,
      letterSpacing: 0.4,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    privacyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    privacyText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
  });
