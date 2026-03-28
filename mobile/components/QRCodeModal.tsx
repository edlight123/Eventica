import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
}

export default function QRCodeModal({ visible, onClose, ticketId, ticketNumber }: QRCodeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <Text style={styles.title}>Scan Code</Text>
            <Text style={styles.subtitle}>{ticketNumber}</Text>
            
            <View style={styles.qrWrapper}>
              <QRCode
                value={ticketId}
                size={Math.min(width - 80, 320)}
                backgroundColor="#FFF"
                logo={require('../assets/eventica_logo_color.png')}
                logoSize={60}
                logoBackgroundColor="white"
                logoBorderRadius={8}
              />
            </View>
            
            <Text style={styles.instruction}>
              Present this code to venue staff for entry
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
  },
  qrWrapper: {
    backgroundColor: '#FFF',
    padding: 30,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  instruction: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 32,
    maxWidth: 280,
    lineHeight: 20,
  },
});
