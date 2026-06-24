import { StatusBar } from 'expo-status-bar';
import { useFonts, InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { AuthProvider } from './contexts/AuthContext';
import { AppModeProvider } from './contexts/AppModeContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { I18nProvider } from './contexts/I18nContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ InstrumentSerif_400Regular });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <I18nProvider>
        <AppModeProvider>
          <FiltersProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </FiltersProvider>
        </AppModeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
