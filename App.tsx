import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@a24z/industry-theme';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
