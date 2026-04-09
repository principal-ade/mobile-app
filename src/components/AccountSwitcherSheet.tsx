/**
 * AccountSwitcherSheet
 *
 * Modal bottom sheet for switching between multiple signed-in accounts
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';
import { useMultiAccount } from '../context/MultiAccountContext';
import { useAuth } from '../hooks/useAuth';
import type { AccountInfo } from '../types/account';
import { LucideIcon } from './LucideIcon';

interface AccountSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AccountSwitcherSheet({ visible, onClose }: AccountSwitcherSheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts, activeAccountId, switchAccount, isSwitching } = useMultiAccount();
  const { signIn } = useAuth();

  const handleAccountPress = useCallback(
    async (userId: number) => {
      if (userId === activeAccountId || isSwitching) return;

      try {
        await switchAccount(userId);
        onClose();
      } catch (error) {
        console.error('Failed to switch account:', error);
      }
    },
    [activeAccountId, isSwitching, switchAccount, onClose]
  );

  const handleAddAccount = useCallback(async () => {
    onClose();
    // Small delay to allow modal to close before opening auth flow
    setTimeout(() => {
      // Force fresh login to ensure user can sign into a different account
      signIn(true);
    }, 300);
  }, [onClose, signIn]);

  const renderAccount = useCallback(
    ({ item }: { item: AccountInfo }) => {
      const isActive = item.userId === activeAccountId;

      return (
        <TouchableOpacity
          style={[styles.accountRow, { borderBottomColor: theme.colors.border }]}
          onPress={() => handleAccountPress(item.userId)}
          disabled={isActive || isSwitching}
          activeOpacity={0.7}
        >
          {/* Avatar */}
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />

          {/* Account info */}
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, { color: theme.colors.text }]}>
              {item.name || item.login}
            </Text>
            <Text style={[styles.accountUsername, { color: theme.colors.textSecondary }]}>
              @{item.login}
            </Text>
          </View>

          {/* Active indicator */}
          {isActive && (
            <LucideIcon name="Check" size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [activeAccountId, isSwitching, theme, handleAccountPress]
  );

  const renderFooter = useCallback(() => {
    return (
      <TouchableOpacity
        style={[styles.addAccountRow, { borderTopColor: theme.colors.border }]}
        onPress={handleAddAccount}
        disabled={isSwitching}
        activeOpacity={0.7}
      >
        <View style={[styles.addAccountIcon, { backgroundColor: theme.colors.surface }]}>
          <LucideIcon name="Plus" size={20} color={theme.colors.primary} />
        </View>
        <Text style={[styles.addAccountText, { color: theme.colors.primary }]}>
          Add Account
        </Text>
      </TouchableOpacity>
    );
  }, [theme, handleAddAccount, isSwitching]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Switch Account
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isSwitching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Switching account...
            </Text>
          </View>
        ) : (
          <FlatList
            data={accounts}
            renderItem={renderAccount}
            keyExtractor={(item) => item.userId.toString()}
            ListFooterComponent={renderFooter}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    paddingTop: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    fontSize: 17,
    fontWeight: '600',
  },
  accountUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  addAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default AccountSwitcherSheet;
