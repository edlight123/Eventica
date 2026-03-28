import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { backendFetch } from '../lib/api/backend';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

interface FollowButtonProps {
  organizerId: string;
  style?: any;
  compact?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ organizerId, style, compact = false, onFollowChange }: FollowButtonProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user, userProfile } = useAuth();
  const { t } = useI18n();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [user?.uid, organizerId]);

  const checkFollowStatus = async () => {
    if (!user?.uid || !organizerId) {
      setLoading(false);
      return;
    }

    // Don't show follow button for own profile
    if (user.uid === organizerId) {
      setLoading(false);
      return;
    }

    try {
      const followsQuery = query(
        collection(db, 'organizer_follows'),
        where('follower_id', '==', user.uid),
        where('organizer_id', '==', organizerId)
      );
      const snapshot = await getDocs(followsQuery);
      setIsFollowing(!snapshot.empty);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      Alert.alert(
        t('auth.loginRequiredTitle') || 'Login Required',
        t('follow.loginBody') || 'Please log in to follow organizers'
      );
      return;
    }

    if (user.uid === organizerId) {
      return; // Can't follow yourself
    }

    setToggling(true);
    try {
      const response = await backendFetch('/api/organizers/follow', {
        method: 'POST',
        body: JSON.stringify({ organizerId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      const newFollowingState = data.isFollowing;
      setIsFollowing(newFollowingState);
      onFollowChange?.(newFollowingState);

      // Show feedback
      Alert.alert(
        t('common.success'),
        newFollowingState
          ? (t('follow.followed') || 'You are now following this organizer')
          : (t('follow.unfollowed') || 'You have unfollowed this organizer')
      );
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to update follow status');
    } finally {
      setToggling(false);
    }
  };

  // Don't show button for own profile
  if (user?.uid === organizerId) {
    return null;
  }

  if (loading) {
    return (
      <TouchableOpacity style={[styles.button, styles.loadingButton, style]} disabled>
        <ActivityIndicator size="small" color={colors.primary} />
      </TouchableOpacity>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactButton,
          isFollowing && styles.compactButtonFollowing,
          style,
        ]}
        onPress={handleToggleFollow}
        disabled={toggling}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={isFollowing ? colors.primary : '#FFF'} />
        ) : (
          <Ionicons
            name={isFollowing ? 'checkmark' : 'add'}
            size={18}
            color={isFollowing ? colors.primary : '#FFF'}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isFollowing ? styles.buttonFollowing : styles.buttonNotFollowing,
        style,
      ]}
      onPress={handleToggleFollow}
      disabled={toggling}
    >
      {toggling ? (
        <ActivityIndicator size="small" color={isFollowing ? colors.primary : '#FFF'} />
      ) : (
        <>
          <Ionicons
            name={isFollowing ? 'checkmark-circle' : 'person-add'}
            size={18}
            color={isFollowing ? colors.primary : '#FFF'}
          />
          <Text style={[styles.buttonText, isFollowing && styles.buttonTextFollowing]}>
            {isFollowing ? (t('follow.following') || 'Following') : (t('follow.follow') || 'Follow')}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  loadingButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
  },
  buttonNotFollowing: {
    backgroundColor: colors.primary,
  },
  buttonFollowing: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonTextFollowing: {
    color: colors.primary,
  },
  compactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonFollowing: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
