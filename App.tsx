import './src/utils/localStorage'; // Polyfill localStorage for React Native
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@principal-ade/industry-theme';
import { iceTangerineDarkTheme } from './src/themes/iceTangerineDark';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { FeedPreferencesProvider } from './src/context/FeedPreferencesContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={iceTangerineDarkTheme}>
        <AuthProvider>
          <FeedPreferencesProvider>
            <AppNavigator />
          </FeedPreferencesProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
