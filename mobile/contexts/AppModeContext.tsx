import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'attendee' | 'organizer' | 'staff';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isLoading: boolean;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: 'attendee',
  setMode: () => {},
  isLoading: true,
});

export const useAppMode = () => useContext(AppModeContext);

const MODE_STORAGE_KEY = '@Eventica:appMode';

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('attendee');
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted mode on mount
  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);
      if (savedMode === 'organizer' || savedMode === 'attendee' || savedMode === 'staff') {
        setModeState(savedMode);
      }
    } catch (error) {
      console.error('Error loading app mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setMode = async (newMode: AppMode) => {
    try {
      await AsyncStorage.setItem(MODE_STORAGE_KEY, newMode);
      setModeState(newMode);
    } catch (error) {
      console.error('Error saving app mode:', error);
    }
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode, isLoading }}>
      {children}
    </AppModeContext.Provider>
  );
};
