/**
 * GitHub helper utilities
 *
 * IMPORTANT DISTINCTION:
 * 1. Bot User Accounts (e.g., "dependabot[bot]") - Regular GitHub users with type "Bot"
 *    - Have user profiles at github.com/{username}
 *    - CAN be queried via Users API
 *    - Used by GitHub Apps to make commits/PRs
 *
 * 2. GitHub Apps (e.g., "opencode-agent") - Applications installed on repos
 *    - Have app profiles at github.com/apps/{app-name}
 *    - CANNOT be queried via Users API (will get 400 error)
 *    - May or may not have an associated bot user account
 *
 * Both may appear with [bot] suffix in commit data, but need different handling!
 */

import { GitHubAccountType } from '../types/github';

/**
 * Detects if a GitHub login belongs to a bot user account
 *
 * Note: This detects bot USER accounts, not GitHub Apps.
 * Some GitHub Apps have bot user accounts (like dependabot[bot]),
 * while others don't have user accounts at all (like opencode-agent).
 *
 * Bot user accounts typically:
 * - End with [bot] (e.g., "dependabot[bot]", "github-actions[bot]")
 * - Have type: "Bot" in the GitHub API
 * - Can be queried via Users API (they ARE users, just automated ones)
 *
 * @param login - GitHub username/login
 * @returns true if the login appears to be a bot user account
 */
export function isBotLogin(login: string | null | undefined): boolean {
  if (!login) return false;

  // Check for [bot] suffix (most common pattern for bot user accounts)
  if (login.endsWith('[bot]')) return true;

  // Some known bot accounts that don't use [bot] suffix
  const knownBots = [
    'dependabot',
    'renovate',
    'greenkeeper',
    'snyk-bot',
    'codecov',
    'coveralls',
  ];

  return knownBots.includes(login.toLowerCase());
}

/**
 * Gets the account type from a GitHub login
 *
 * @param login - GitHub username/login
 * @param type - Optional explicit type from API
 * @returns The account type
 */
export function getAccountType(
  login: string | null | undefined,
  type?: GitHubAccountType
): GitHubAccountType {
  // If type is explicitly provided, use it
  if (type) return type;

  // Otherwise, infer from login
  if (isBotLogin(login)) return 'Bot';

  // Default to User (organizations would need explicit type)
  return 'User';
}

/**
 * Removes [bot] suffix from a login for API calls and display
 *
 * IMPORTANT: GitHub usernames in commit data often include [bot] suffix
 * (e.g., "dependabot[bot]"), but the actual username is without it.
 * Always clean the login before making API calls.
 *
 * @param login - GitHub username/login
 * @returns Clean login without [bot] suffix
 */
export function cleanBotLogin(login: string | null | undefined): string {
  if (!login) return '';
  return login.replace(/\[bot\]$/, '');
}
