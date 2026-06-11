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
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@principal-ade/industry-theme';
import Constants from 'expo-constants';
import QRCode from 'react-native-qrcode-svg';
import { FileCityLogo } from '../components/FileCityLogo';
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
  appStore: 'https://apps.apple.com/app/principal-ai/id6761268899',
};

/**
 * Mix a hex color toward black by `amount` (0 = unchanged, 1 = black).
 * Used to darken the theme primary into a high-contrast QR module color —
 * the bright brand primary on white scans poorly, the darkened tint reads
 * on-brand while keeping ~10:1 contrast. Falls back to near-black for any
 * non-hex input.
 */
function darken(color: string, amount: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!m) return '#0a0f14';
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const t = Math.max(0, Math.min(1, amount));
  const ch = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/** Perceived luminance (0 = black, 1 = white) of a hex color; defaults to
 *  dark for non-hex input so callers treat unknowns as a dark surface. */
function isLightColor(color: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!m) return false;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Rec. 601 luma — cheap and good enough for a light/dark decision.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/**
 * QR module color for a given background: on a light surface use the
 * darkened brand primary (normal dark-on-light QR); on a dark surface use
 * the bright primary so the code stays on-brand as a high-contrast
 * inverted QR. Keeps the code on the app's own background color in either
 * theme while preserving the contrast a scanner needs.
 */
function qrModuleColor(primary: string, background: string): string {
  return isLightColor(background) ? darken(primary, 0.65) : primary;
}

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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<AboutStackParamList>>();
  const { isAuthenticated, user, signIn, demoSignIn, signOut } = useAuth();
  const { accounts } = useMultiAccount();
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showQr, setShowQr] = useState(false);
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
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowQr(true)}
          accessibilityRole="button"
          accessibilityLabel="Show App Store download QR code"
        >
          <View style={styles.logoSlot}>
            <FileCityLogo
              width={100}
              height={100}
              primary={theme.colors.primary}
            />
          </View>
        </TouchableOpacity>
        <Text style={[styles.logoHint, { color: theme.colors.textSecondary }]}>
          Tap to share
        </Text>
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
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => navigation.navigate('UserProfile', { username: user.login })}
              >
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
              </TouchableOpacity>
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

      {/* Full-screen download QR */}
      <Modal
        visible={showQr}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQr(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={styles.qrOverlay}
          activeOpacity={1}
          onPress={() => setShowQr(false)}
          accessibilityRole="button"
          accessibilityLabel="Close QR code"
        >
          <View
            style={[
              styles.qrCard,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <QRCode
              value={LINKS.appStore}
              size={Math.min(screenWidth, screenHeight) * 0.66}
              color={qrModuleColor(theme.colors.primary, theme.colors.background)}
              backgroundColor={theme.colors.background}
              ecl="M"
            />
          </View>
          <Text style={styles.qrTitle}>Scan to download</Text>
          <Text style={styles.qrSubtitle}>Principal AI on the App Store</Text>
          <Text style={styles.qrDismiss}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

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
  logoSlot: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  qrCard: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 32,
  },
  qrSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    marginTop: 6,
  },
  qrDismiss: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 13,
    marginTop: 24,
  },
  logoHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
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
