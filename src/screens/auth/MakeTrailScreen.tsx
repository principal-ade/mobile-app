/**
 * The finale of the Trails Tutorial. Instead of sending users to read a
 * sample trail, this closes the tour by pointing them at *making* one.
 *
 * Trails are authored on the desktop (the File City app + Claude Code), not
 * from the phone — so the actionable next step here is to join the
 * community, where people get set up and lay their first trail. We show the
 * Discord invite as a scannable QR (for hopping to a laptop) plus an
 * "Open in Discord" button for staying on the phone.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import QRCode from 'react-native-qrcode-svg';

import { DiscordIcon } from '../../components/DiscordIcon';
import { qrModuleColor } from '../../utils/qrColor';

const DISCORD_INVITE = 'https://discord.gg/G3qdcC2DXq';

export function MakeTrailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Comfortable QR that still leaves room for the copy on small screens.
  const qrSize = Math.min(screenWidth, screenHeight) * 0.5;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.background,
          // The nav header already covers the top safe-area inset; only the
          // bottom needs padding so the button clears the home indicator.
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Now lay your <Text style={{ color: theme.colors.primary }}>own</Text> trail
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          You make trails from your editor on desktop, with the File City app and
          Claude Code. Join the community to get set up and lay your first one —
          scan to jump to your laptop, or open it right here.
        </Text>

        <View
          style={[
            styles.qrCard,
            { backgroundColor: theme.colors.background, borderColor: '#5865F2' },
          ]}
        >
          <QRCode
            value={DISCORD_INVITE}
            size={qrSize}
            color={qrModuleColor('#5865F2', theme.colors.background)}
            backgroundColor={theme.colors.background}
            ecl="M"
          />
        </View>

        <Text style={[styles.qrHint, { color: theme.colors.textSecondary }]}>
          Scan to join our Discord
        </Text>
      </View>

      <TouchableOpacity
        style={styles.discordButton}
        activeOpacity={0.85}
        onPress={() => Linking.openURL(DISCORD_INVITE)}
        accessibilityRole="button"
        accessibilityLabel="Open Discord invite"
      >
        <DiscordIcon size={20} color="#ffffff" />
        <Text style={styles.discordButtonText}>Open in Discord</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  qrCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  qrHint: {
    fontSize: 14,
    fontWeight: '500',
  },
  discordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5865F2',
    paddingVertical: 14,
    borderRadius: 24,
  },
  discordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MakeTrailScreen;
