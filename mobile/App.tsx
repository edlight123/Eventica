import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { AuthProvider } from './contexts/AuthContext';
import { AppModeProvider } from './contexts/AppModeContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { I18nProvider } from './contexts/I18nContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <I18nProvider>
          <AppModeProvider>
            <FiltersProvider>
              <AppNavigator />
              <StatusBar style="light" />
            </FiltersProvider>
          </AppModeProvider>
        </I18nProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
