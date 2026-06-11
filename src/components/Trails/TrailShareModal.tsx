/**
 * Bottom-sheet style modal that shows a QR code for a public trail's web
 * URL, plus copy-link and native-share actions. Scanning the QR opens
 * `${WEB_ORIGIN}/trail/<id>` — which renders the trail on web and (once
 * universal links are configured) can hand off into the app.
 *
 * Public trails only: the URL is just the trail id, so anyone who scans it
 * can view the trail subject to the same repo-access gating the web page
 * applies. Private/token-gated share links are a later iteration.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@principal-ade/industry-theme';

import { LucideIcon } from '../LucideIcon';

const COPY_FEEDBACK_MS = 1500;

interface TrailShareModalProps {
  visible: boolean;
  onClose: () => void;
  /** Fully-qualified share URL, e.g. `https://app.principal-ade.com/trail/<id>`. */
  url: string;
  /** Trail title, shown under the QR so the recipient knows what they'll open. */
  title: string;
}

export const TrailShareModal: React.FC<TrailShareModalProps> = ({
  visible,
  onClose,
  url,
  title,
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);

  // Reset the transient "copied" affordance whenever the sheet is dismissed
  // so it doesn't linger as a stale checkmark on the next open.
  React.useEffect(() => {
    if (!visible) setCopied(false);
  }, [visible]);

  const handleCopy = React.useCallback(async () => {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard denied — fail quietly; the QR is still on screen to scan.
    }
  }, [url]);

  const handleShare = React.useCallback(async () => {
    try {
      // iOS uses `url` for the rich link preview; `message` is the fallback
      // for targets that only accept text.
      await Share.share({ message: url, url });
    } catch {
      // User cancelled or no share targets — nothing to recover.
    }
  }, [url]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Dismiss share sheet"
      >
        {/* Inner Pressable captures taps so they don't dismiss via the backdrop. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
          onPress={() => {}}
        >
          <Text
            style={[
              styles.heading,
              { color: theme.colors.text, fontFamily: theme.fonts.heading },
            ]}
          >
            Share trail
          </Text>

          {/* QR is tinted with the theme's primary on the background token.
              Keep an eye on low-contrast themes (e.g. a mid-tone primary on a
              dark surface) — that pairing can hurt scan reliability. */}
          <View
            style={[
              styles.qrCard,
              { backgroundColor: theme.colors.background },
            ]}
          >
            <QRCode
              value={url}
              size={220}
              color={theme.colors.primary}
              backgroundColor={theme.colors.background}
              ecl="M"
            />
          </View>

          <Text
            style={[
              styles.trailTitle,
              { color: theme.colors.text, fontFamily: theme.fonts.body },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.hint,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Scan to open this trail
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void handleCopy()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Copy trail link"
            >
              <LucideIcon
                name={copied ? 'Check' : 'Link'}
                size={18}
                color={copied ? theme.colors.accent : theme.colors.text}
              />
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: copied ? theme.colors.accent : theme.colors.text,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleShare()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Share trail link"
            >
              <LucideIcon name="Share2" size={18} color={theme.colors.text} />
              <Text
                style={[
                  styles.actionLabel,
                  { color: theme.colors.text, fontFamily: theme.fonts.body },
                ]}
              >
                Share…
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  qrCard: {
    padding: 16,
    borderRadius: 16,
  },
  trailTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TrailShareModal;
