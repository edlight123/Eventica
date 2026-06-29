import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PremiumSearchBarProps {
  onPress: () => void;
}

export default function PremiumSearchBar({ onPress }: PremiumSearchBarProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.searchBar}>
        <Search size={20} color="#6B6B6B" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Search events, organizers, or cities"
          placeholderTextColor="rgba(10,10,10,0.5)"
          editable={false}
          pointerEvents="none"
        />
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0A0A0A',
    fontWeight: '500',
  },
});
