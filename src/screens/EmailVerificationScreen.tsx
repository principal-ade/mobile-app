import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { verifyEmail } from '../services/AuthService';
import { useAuth } from '../hooks/useAuth';

type Props = StackScreenProps<RootStackParamList, 'EmailVerification'>;

export function EmailVerificationScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { completeVerification } = useAuth();
  const { state, email } = route.params;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCodeChange = (text: string) => {
    // Only allow digits
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyEmail(state, code);
      await completeVerification(result);
      // Navigation will happen automatically via auth state change
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : 'your email';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Check your email
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            We sent a 6-digit code to {maskedEmail}
          </Text>
        </View>

        <View style={styles.codeContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.codeInput,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: error ? theme.colors.error || '#ef4444' : theme.colors.border,
              },
            ]}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            placeholder="000000"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!isLoading}
          />
        </View>

        {error && (
          <Text style={[styles.errorText, { color: theme.colors.error || '#ef4444' }]}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.verifyButton,
            {
              backgroundColor: code.length === 6 ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={handleVerify}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
          Didn't receive the code? Check your spam folder or try signing in again.
        </Text>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeInput: {
    width: '100%',
    maxWidth: 280,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    fontSize: 16,
  },
});

export default EmailVerificationScreen;
