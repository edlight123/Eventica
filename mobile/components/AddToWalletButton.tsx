import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Wallet, Download } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface AddToWalletButtonProps {
  ticketId: string;
  qrCodeData: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  ticketNumber: number;
  totalTickets: number;
}

export default function AddToWalletButton({
  ticketId,
  qrCodeData,
  eventTitle,
  eventDate,
  venueName,
  ticketNumber,
  totalTickets,
}: AddToWalletButtonProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddToWallet = async () => {
    setIsGenerating(true);

    try {
      // Call API to generate wallet pass
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          qrCodeData,
          eventTitle,
          eventDate,
          venueName,
          ticketNumber,
          totalTickets,
          platform: Platform.OS, // 'ios' or 'android'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate wallet pass');
      }

      const data = await response.json();

      if (Platform.OS === 'ios') {
        // For iOS - Apple Wallet
        // The API should return a URL to the .pkpass file
        if (data.passUrl) {
          // Open the pass URL which will prompt to add to Apple Wallet
          const canOpen = await Linking.canOpenURL(data.passUrl);
          if (canOpen) {
            await Linking.openURL(data.passUrl);
          } else {
            throw new Error('Cannot open Apple Wallet');
          }
        }
      } else if (Platform.OS === 'android') {
        // For Android - Google Wallet
        // The API should return a URL to add to Google Wallet
        if (data.saveUrl) {
          const canOpen = await Linking.canOpenURL(data.saveUrl);
          if (canOpen) {
            await Linking.openURL(data.saveUrl);
          } else {
            throw new Error('Cannot open Google Wallet');
          }
        }
      }

      Alert.alert(
        'Success',
        'Your ticket has been added to your wallet!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error adding to wallet:', error);
      Alert.alert(
        'Error',
        'Failed to add ticket to wallet. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQR = () => {
    Alert.alert(
      'Download QR Code',
      'Take a screenshot of this ticket to save the QR code, or use the "Add to Wallet" feature for easy access.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Add to Wallet Button */}
      <TouchableOpacity
        style={styles.walletButton}
        onPress={handleAddToWallet}
        disabled={isGenerating}
        activeOpacity={0.7}
      >
        {isGenerating ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.walletButtonText}>Generating...</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <Wallet size={20} color="#FFFFFF" />
            <Text style={styles.walletButtonText}>
              Add to {Platform.OS === 'ios' ? 'Apple' : 'Google'} Wallet
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Download QR Button */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownloadQR}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <Download size={18} color={colors.text} />
          <Text style={styles.downloadButtonText}>Save Image</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    gap: 12,
  },
  walletButton: {
    backgroundColor: colors.text,
    borderRadius: 12,
    padding: 16,
  },
  downloadButton: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  walletButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
