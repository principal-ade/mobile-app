/**
 * Multi-account support types
 */

export interface AccountInfo {
  /** GitHub user ID (immutable, used as primary key) */
  userId: number;
  /** GitHub login (for display) */
  login: string;
  /** User's display name */
  name: string | null;
  /** Avatar URL */
  avatarUrl: string;
  /** ISO timestamp when account was added */
  addedAt: string;
}

export interface AccountRegistry {
  /** List of all signed-in accounts */
  accounts: AccountInfo[];
  /** User ID of the currently active account */
  activeAccountId: number | null;
}
