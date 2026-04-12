import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import Constants from 'expo-constants';
import { Logo } from '../components/Logo';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DiscordIcon } from '../components/DiscordIcon';
import { useAuth } from '../hooks/useAuth';
import { useMultiAccount } from '../context/MultiAccountContext';
import { AccountSwitcherSheet } from '../components/AccountSwitcherSheet';
import type { AboutStackParamList } from '../navigation/types';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const LINKS = {
  privacyPolicy: 'https://principal-ade.com/privacy',
  termsOfService: 'https://principal-ade.com/terms',
  discord: 'https://discord.gg/G3qdcC2DXq',
  website: 'https://principal-ade.com',
};

interface LinkRowProps {
  title: string;
  subtitle?: string;
  url: string;
  theme: ReturnType<typeof useTheme>['theme'];
}

function LinkRow({ title, subtitle, url, theme }: LinkRowProps) {
  const handlePress = () => {
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity style={styles.linkRow} onPress={handlePress}>
      <View style={styles.linkContent}>
        <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.linkSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
        ›
      </Text>
    </TouchableOpacity>
  );
}

export function AboutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<AboutStackParamList>>();
  const { isAuthenticated, user, signIn, demoSignIn, signOut } = useAuth();
  const { accounts } = useMultiAccount();
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    await signIn();
  };

  const handleAddAccount = async () => {
    // Force fresh login to ensure user can sign into a different account
    await signIn(true);
  };

  const handleDemoSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await demoSignIn(email.trim(), password);
      setEmail('');
      setPassword('');
      setShowDemoLogin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 80 }]}>
        <TouchableOpacity
          style={[styles.discordButton, { top: insets.top + 16 }]}
          onPress={() => Linking.openURL(LINKS.discord)}
        >
          <DiscordIcon size={28} color="#5865F2" />
        </TouchableOpacity>
        <Logo width={100} height={100} color={theme.colors.primary} />
        <Text style={[styles.appName, { color: theme.colors.text }]}>
          Principal <Text style={{ color: theme.colors.primary }}>AI</Text>
        </Text>
        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
          Version {APP_VERSION}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            ACCOUNT
          </Text>
        </View>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          {isAuthenticated && user ? (
            <>
              <View style={styles.accountRow}>
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatar}
                />
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: theme.colors.text }]}>
                    {user.name || user.login}
                  </Text>
                  <Text style={[styles.accountUsername, { color: theme.colors.textSecondary }]}>
                    @{user.login}
                  </Text>
                </View>
              </View>
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              {accounts.length >= 2 ? (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => setShowAccountSwitcher(true)}
                >
                  <View style={styles.linkContent}>
                    <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
                      Switch Account
                    </Text>
                    <Text style={[styles.linkSubtitle, { color: theme.colors.textSecondary }]}>
                      {accounts.length} accounts
                    </Text>
                  </View>
                  <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
                    ›
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={handleAddAccount}
                >
                  <View style={styles.linkContent}>
                    <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
                      Add Account
                    </Text>
                    <Text style={[styles.linkSubtitle, { color: theme.colors.textSecondary }]}>
                      Sign in with another GitHub account
                    </Text>
                  </View>
                  <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
                    ›
                  </Text>
                </TouchableOpacity>
              )}
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate('FeedCustomization', {})}
              >
                <View style={styles.linkContent}>
                  <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
                    Customize Feed
                  </Text>
                  <Text style={[styles.linkSubtitle, { color: theme.colors.textSecondary }]}>
                    Manage followed users and repos
                  </Text>
                </View>
                <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
                  ›
                </Text>
              </TouchableOpacity>
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => navigation.navigate('SavedCards')}
              >
                <View style={styles.linkContent}>
                  <Text style={[styles.linkTitle, { color: theme.colors.text }]}>
                    Saved Cards
                  </Text>
                  <Text style={[styles.linkSubtitle, { color: theme.colors.textSecondary }]}>
                    View your saved activity cards
                  </Text>
                </View>
                <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
                  ›
                </Text>
              </TouchableOpacity>
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              <TouchableOpacity style={styles.linkRow} onPress={handleSignOut}>
                <Text style={[styles.signOutText, { color: theme.colors.error || '#ef4444' }]}>
                  Sign out
                </Text>
              </TouchableOpacity>
            </>
          ) : showDemoLogin ? (
            <View style={styles.demoLoginSection}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    marginTop: 12,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={theme.colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <View style={styles.demoLoginButtons}>
                <TouchableOpacity
                  style={[styles.demoLoginButton, { opacity: isLoading ? 0.5 : 1 }]}
                  onPress={handleDemoSignIn}
                  disabled={isLoading || !email.trim() || !password.trim()}
                >
                  {isLoading ? (
                    <LoadingSpinner size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={[styles.signInText, { color: theme.colors.primary }]}>
                      Sign In
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.demoLoginButton}
                  onPress={() => {
                    setShowDemoLogin(false);
                    setEmail('');
                    setPassword('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.signInRow} onPress={handleSignIn}>
                <Text style={[styles.signInText, { color: theme.colors.primary }]}>
                  Sign in with GitHub
                </Text>
                <Text style={[styles.linkArrow, { color: theme.colors.primary }]}>
                  ›
                </Text>
              </TouchableOpacity>
              <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              <TouchableOpacity
                style={styles.signInRow}
                onPress={() => setShowDemoLogin(true)}
              >
                <Text style={[styles.altSignInText, { color: theme.colors.textSecondary }]}>
                  Sign in with Email
                </Text>
                <Text style={[styles.linkArrow, { color: theme.colors.textSecondary }]}>
                  ›
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Links Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            LEGAL
          </Text>
        </View>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <LinkRow
            title="Privacy Policy"
            subtitle="How we handle your data"
            url={LINKS.privacyPolicy}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          <LinkRow
            title="Terms of Service"
            subtitle="Usage terms and conditions"
            url={LINKS.termsOfService}
            theme={theme}
          />
        </View>

        {/* Support Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            SUPPORT
          </Text>
        </View>
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <LinkRow
            title="Website"
            subtitle="principal-ade.com"
            url={LINKS.website}
            theme={theme}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Made with care by the Principal AI team
          </Text>
          <Text style={[styles.copyright, { color: theme.colors.textSecondary }]}>
            © {new Date().getFullYear()} Principal AI. All rights reserved.
          </Text>
        </View>
      </ScrollView>

      {/* Account Switcher Modal */}
      <AccountSwitcherSheet
        visible={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  discordButton: {
    position: 'absolute',
    right: 35,
    padding: 8,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
  },
  linkSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  linkArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  accountInfo: {
    marginLeft: 12,
    flex: 1,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
  },
  accountUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  signOutText: {
    fontSize: 16,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '500',
  },
  altSignInText: {
    fontSize: 16,
  },
  cancelText: {
    fontSize: 16,
  },
  demoLoginSection: {
    padding: 16,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  demoLoginButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
  },
  demoLoginButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
  },
});

export default AboutScreen;
