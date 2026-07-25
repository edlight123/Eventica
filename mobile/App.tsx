import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from './contexts/AuthContext';
import { AppModeProvider } from './contexts/AppModeContext';
import { FiltersProvider } from './contexts/FiltersContext';
import { I18nProvider } from './contexts/I18nContext';
import AppNavigator from './navigation/AppNavigator';
import BootScreen from './components/BootScreen';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (!fontsLoaded && !fontError) {
    return <BootScreen />;
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
