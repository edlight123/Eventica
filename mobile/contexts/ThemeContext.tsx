import React, { createContext, useContext } from 'react';
import { COLORS, DARK_COLORS } from '../config/brand';

type ThemeColors = typeof COLORS;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ colors: DARK_COLORS, isDark: true });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Tikèm ships a single, premium dark aesthetic (Posh-style) across the whole
  // app for a crisp, consistent, image-forward feel.
  const isDark = true;
  const colors = DARK_COLORS;
  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
