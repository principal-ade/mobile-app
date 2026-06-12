/**
 * Bottom-sheet modal for sending a topic to GitHub-login recipients. Mirrors
 * the styling of `TrailShareModal`, but instead of a QR/copy flow it collects
 * one or more recipient logins plus an optional comment and POSTs them via
 * `TopicsApiService.sendTopic`.
 *
 * The recipient lands in the desktop app's topic inbox. Send is creator-only
 * server-side, so the caller (TopicDetailScreen) only mounts this sheet when
 * the signed-in user owns the topic.
 *
 * Partial delivery is non-fatal: the server returns `delivered`/`failed`, so a
 * mix of good and bad logins surfaces a "sent to N, couldn't find M" summary
 * rather than failing the whole send.
 */

import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

import { LucideIcon } from '../LucideIcon';
import { sendTopic, TopicsApiError } from '../../services/TopicsApiService';
import type { SendTrailResponse } from '../../types/Inbox';

interface TopicSendSheetProps {
  visible: boolean;
  onClose: () => void;
  topicId: string;
  /** Topic title, shown so the sender knows what they're sending. */
  title: string;
  /** GitHub token of the signed-in (creator) user. */
  token: string;
}

type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'done'; result: SendTrailResponse }
  | { status: 'error'; message: string };

/** Split a free-text recipient field on commas/whitespace into clean logins. */
function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((r) => r.trim().replace(/^@/, ''))
    .filter((r) => r.length > 0);
}

export const TopicSendSheet: React.FC<TopicSendSheetProps> = ({
  visible,
  onClose,
  topicId,
  title,
  token,
}) => {
  const { theme } = useTheme();
  const [recipientsText, setRecipientsText] = React.useState('');
  const [comment, setComment] = React.useState('');
  const [send, setSend] = React.useState<SendState>({ status: 'idle' });

  // Reset the form each time the sheet is dismissed so a re-open starts clean
  // rather than showing the previous send's fields or result summary.
  React.useEffect(() => {
    if (!visible) {
      setRecipientsText('');
      setComment('');
      setSend({ status: 'idle' });
    }
  }, [visible]);

  const recipients = parseRecipients(recipientsText);
  const canSend = recipients.length > 0 && send.status !== 'sending';

  const handleSend = React.useCallback(async () => {
    const parsed = parseRecipients(recipientsText);
    if (parsed.length === 0) return;
    setSend({ status: 'sending' });
    try {
      const result = await sendTopic(topicId, token, {
        recipients: parsed,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setSend({ status: 'done', result });
    } catch (err: unknown) {
      const message =
        err instanceof TopicsApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send topic';
      setSend({ status: 'error', message });
    }
  }, [recipientsText, comment, topicId, token]);

  // Result summary line for the "done" state. Pure delivery is a clean success;
  // any failures get called out by login so the sender can fix a typo and retry.
  const doneSummary = (result: SendTrailResponse): string => {
    const sent =
      result.delivered.length > 0
        ? `Sent to ${result.delivered.map((d) => `@${d.login}`).join(', ')}`
        : 'No one received this topic';
    if (result.failed.length === 0) return sent;
    const failedLogins = result.failed.map((f) => `@${f.login}`).join(', ');
    return `${sent}. Couldn't find ${failedLogins}.`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Dismiss send sheet"
        >
          {/* Inner Pressable captures taps so they don't dismiss via backdrop. */}
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
              Send topic
            </Text>
            <Text
              style={[
                styles.topicTitle,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.body,
                },
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>

            {send.status === 'done' ? (
              <View style={styles.resultBlock}>
                <LucideIcon
                  name={send.result.failed.length === 0 ? 'Check' : 'Info'}
                  size={28}
                  color={
                    send.result.failed.length === 0
                      ? theme.colors.accent
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: theme.colors.text, fontFamily: theme.fonts.body },
                  ]}
                >
                  {doneSummary(send.result)}
                </Text>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                >
                  <Text
                    style={[
                      styles.primaryLabel,
                      { color: theme.colors.background, fontFamily: theme.fonts.body },
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
                  ]}
                >
                  Recipients
                </Text>
                <TextInput
                  value={recipientsText}
                  onChangeText={setRecipientsText}
                  placeholder="GitHub username(s)"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={send.status !== 'sending'}
                  style={[
                    styles.input,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.hint,
                    { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
                  ]}
                >
                  Separate multiple usernames with a space or comma.
                </Text>

                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.textSecondary, fontFamily: theme.fonts.body },
                  ]}
                >
                  Comment (optional)
                </Text>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Why you're sending this"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  editable={send.status !== 'sending'}
                  style={[
                    styles.input,
                    styles.commentInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                />

                {send.status === 'error' ? (
                  <Text
                    style={[
                      styles.errorText,
                      { color: theme.colors.error, fontFamily: theme.fonts.body },
                    ]}
                  >
                    {send.message}
                  </Text>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    onPress={onClose}
                    disabled={send.status === 'sending'}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text
                      style={[
                        styles.secondaryLabel,
                        { color: theme.colors.text, fontFamily: theme.fonts.body },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleSend()}
                    disabled={!canSend}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: theme.colors.primary,
                        opacity: !canSend ? 0.4 : pressed ? 0.7 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Send topic"
                  >
                    {send.status === 'sending' ? (
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.background}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.primaryLabel,
                          { color: theme.colors.background, fontFamily: theme.fonts.body },
                        ]}
                      >
                        Send
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
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
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  topicTitle: {
    marginTop: 4,
    fontSize: 14,
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  commentInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultBlock: {
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  resultText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default TopicSendSheet;
