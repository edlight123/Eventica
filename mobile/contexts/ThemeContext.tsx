import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS } from '../config/brand';

type ThemeColors = typeof COLORS;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ colors: COLORS, isDark: false });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? DARK_COLORS : COLORS;
  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
