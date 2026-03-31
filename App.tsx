import './src/utils/localStorage'; // Polyfill localStorage for React Native
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, slateGoldTheme } from '@principal-ade/industry-theme';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={slateGoldTheme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
