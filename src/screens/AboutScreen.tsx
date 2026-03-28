import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import Constants from 'expo-constants';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

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
  const { isAuthenticated, user, signIn, signOut } = useAuth();

  const handleSignIn = async () => {
    await signIn();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 80 }]}>
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
              <TouchableOpacity style={styles.linkRow} onPress={handleSignOut}>
                <Text style={[styles.signOutText, { color: theme.colors.error || '#ef4444' }]}>
                  Sign out
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.signInRow} onPress={handleSignIn}>
              <Text style={[styles.signInText, { color: theme.colors.primary }]}>
                Sign in with GitHub
              </Text>
              <Text style={[styles.linkArrow, { color: theme.colors.primary }]}>
                ›
              </Text>
            </TouchableOpacity>
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
            title="Discord"
            subtitle="Join our community"
            url={LINKS.discord}
            theme={theme}
          />
          <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
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
