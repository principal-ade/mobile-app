/**
 * Device ID utility for mobile apps
 *
 * Generates and persists a unique device identifier for this mobile device.
 * Used to track device-specific sessions in the auth server.
 *
 * Similar to Electron's DeviceIdService but adapted for React Native/Expo.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'principal-mobile-device-id';

/**
 * Device ID metadata
 */
interface DeviceIdMetadata {
  deviceId: string;
  createdAt: number;
  platform: string;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return Crypto.randomUUID();
}

/**
 * Get or create a device ID for this mobile device
 *
 * Strategy:
 * 1. Try to read from SecureStore (iOS Keychain / Android EncryptedSharedPreferences)
 * 2. If not found or error, generate a new UUID
 * 3. Store in SecureStore for future use
 *
 * Format: mobile-{uuid}
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from SecureStore
    const storedData = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (storedData) {
      const metadata: DeviceIdMetadata = JSON.parse(storedData);
      console.log('[DeviceId] Retrieved existing device ID:', metadata.deviceId);
      return metadata.deviceId;
    }
  } catch (error) {
    console.warn('[DeviceId] Failed to read from SecureStore:', error);
  }

  // Generate new device ID
  const deviceId = `mobile-${generateUUID()}`;

  // Create metadata
  const metadata: DeviceIdMetadata = {
    deviceId,
    createdAt: Date.now(),
    platform: getPlatform(),
  };

  // Try to store it for next time
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, JSON.stringify(metadata));
    console.log('[DeviceId] Created and stored new device ID:', deviceId);
  } catch (error) {
    console.warn('[DeviceId] Failed to write to SecureStore:', error);
    // Continue anyway - device ID will be regenerated on next app launch
  }

  return deviceId;
}

/**
 * Get platform identifier
 */
function getPlatform(): string {
  return Platform.OS; // 'ios' or 'android'
}

/**
 * Get device metadata for tracking
 */
export function getDeviceMetadata(): {
  platform?: string;
  hostname?: string;
} {
  return {
    platform: `${Platform.OS} ${Platform.Version}`,
    // hostname not applicable for mobile devices
  };
}

/**
 * Clear the stored device ID (useful for testing or logout)
 */
export async function clearDeviceId(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    console.log('[DeviceId] Cleared device ID');
  } catch (error) {
    console.warn('[DeviceId] Failed to clear device ID:', error);
  }
}

/**
 * Get device ID metadata (including creation date)
 */
export async function getDeviceIdMetadata(): Promise<DeviceIdMetadata | null> {
  try {
    const storedData = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.warn('[DeviceId] Failed to get metadata:', error);
  }

  return null;
}
