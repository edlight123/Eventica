/**
 * Location Detection Banner for Mobile
 * Shows when device region differs from saved profile country
 * Offers to update user's location preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MapPin, X, Check } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFilters } from '../contexts/FiltersContext';
import { getDeviceLocationInfo, COUNTRY_NAMES, DEFAULT_CITIES } from '../utils/deviceLocation';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_DISMISSED_KEY = 'location_banner_dismissed';
const BANNER_DISMISSED_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function LocationDetectionBanner() {
  const { colors } = useTheme();
  const { user, userProfile, updateUserProfile } = useAuth();
  const { userCountry, setUserCountry, applyFiltersDirectly, appliedFilters } = useFilters();
  
  const [visible, setVisible] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectedCountryName, setDetectedCountryName] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    checkLocationMismatch();
  }, [userProfile]);

  const checkLocationMismatch = async () => {
    try {
      // Check if banner was recently dismissed
      const dismissedData = await AsyncStorage.getItem(BANNER_DISMISSED_KEY);
      if (dismissedData) {
        const { timestamp, country } = JSON.parse(dismissedData);
        const now = Date.now();
        if (now - timestamp < BANNER_DISMISSED_EXPIRY) {
          // Still within dismiss period for same country
          const deviceInfo = getDeviceLocationInfo();
          if (deviceInfo.country === country) {
            return;
          }
        }
      }

      // Get device location
      const deviceInfo = getDeviceLocationInfo();
      const deviceCountry = deviceInfo.country;
      
      // Compare with user's saved country
      const profileCountry = userProfile?.default_country || 'HT';
      
      console.log('[LocationBanner] Device country:', deviceCountry, 'Profile country:', profileCountry);
      
      // Show banner if device country differs from profile
      if (deviceCountry !== profileCountry && deviceInfo.isSupported) {
        setDetectedCountry(deviceCountry);
        setDetectedCountryName(deviceInfo.countryName);
        setVisible(true);
        
        // Animate in
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }
    } catch (error) {
      console.error('[LocationBanner] Error checking location:', error);
    }
  };

  const handleAccept = async () => {
    if (!detectedCountry) return;
    
    setUpdating(true);
    try {
      const defaultCity = DEFAULT_CITIES[detectedCountry] || '';
      
      // Update user profile if logged in
      if (user) {
        await updateUserProfile({
          default_country: detectedCountry,
          default_city: defaultCity,
        });
      }
      
      // Update filters
      setUserCountry(detectedCountry);
      applyFiltersDirectly({
        ...appliedFilters,
        country: detectedCountry,
        city: '', // Reset city when changing country
      });
      
      // Dismiss banner
      hideBanner();
    } catch (error) {
      console.error('[LocationBanner] Error updating location:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDismiss = async () => {
    // Save dismiss state
    if (detectedCountry) {
      await AsyncStorage.setItem(BANNER_DISMISSED_KEY, JSON.stringify({
        timestamp: Date.now(),
        country: detectedCountry,
      }));
    }
    hideBanner();
  };

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MapPin size={20} color={colors.primary} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            Are you in {detectedCountryName}?
          </Text>
          <Text style={styles.subtitle}>
            Show events near you
          </Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            disabled={updating}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            disabled={updating}
          >
            {updating ? (
              <Text style={styles.acceptButtonText}>...</Text>
            ) : (
              <Check size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
