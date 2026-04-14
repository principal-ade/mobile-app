# GitHub Bots vs Apps - Important Distinction

## The Confusion

The terms "bot" and "app" are often used interchangeably, but they mean different things in GitHub's API:

## 1. Bot User Accounts

**Examples:** `dependabot[bot]`, `github-actions[bot]`, `renovate[bot]`

**Characteristics:**
- Regular GitHub user accounts with `type: "Bot"`
- Have user profiles at `github.com/{username}` (e.g., `github.com/dependabot`)
- **CAN** be queried via GitHub's Users API
- **CAN** have activity, contributions, and commit history
- Used by GitHub Apps to make commits, PRs, and comments
- Always include `[bot]` suffix in commit author fields

**API Behavior:**
```bash
# ✅ This works - dependabot HAS a user account
GET /users/dependabot
GET /users/dependabot/activity
```

## 2. GitHub Apps (without user accounts)

**Examples:** `opencode-agent`, some custom apps

**Characteristics:**
- Applications installed on repositories/organizations
- Have app profiles at `github.com/apps/{app-name}` (e.g., `github.com/apps/opencode-agent`)
- **CANNOT** be queried via GitHub's Users API (will return 400 error)
- **DON'T** have personal user profiles
- May still appear in commit data if they make commits via the GitHub API
- May or may not include `[bot]` suffix

**API Behavior:**
```bash
# ❌ This fails - opencode-agent is an app, NOT a user
GET /users/opencode-agent
# Returns: "Could not resolve to a User with the login of 'opencode-agent'"

# ✅ This works - query as an app instead
GET /apps/opencode-agent
```

## How We Handle This in the App

### Detection

We use the `[bot]` suffix as a heuristic to detect both types:

```typescript
// utils/githubHelpers.ts
export function isBotLogin(login: string): boolean {
  return login.endsWith('[bot]') || knownBots.includes(login);
}
```

### Graceful Handling

When `isBot: true`, we:

1. **Set minimal profile data** (works for both types)
2. **Try to fetch activity** from Users API
3. **Catch errors gracefully** if it's an app without a user account
4. **Show AppProfileScreen** with whatever data we have

```typescript
// UserProfileScreenContainer.tsx
if (isBot) {
  setUserData({ login, name, avatar_url, ... }); // Minimal data

  try {
    const activity = await getUserActivity(username); // Try to fetch
  } catch (err) {
    // GitHub App without user account - show empty activity
    setActivityData({ activity: [] });
  }
}
```

### Why This Works

- **Bot user accounts** (like dependabot): Activity fetch succeeds, shows real data
- **GitHub Apps** (like opencode-agent): Activity fetch fails gracefully, shows empty state
- **User sees:** A consistent bot profile screen regardless of which type it is

## Screen Naming

- **UserProfileScreen** - For regular users and organizations
- **AppProfileScreen** - For bot user accounts AND GitHub Apps
  - Name emphasizes it's for automated accounts/apps
  - Handles both types gracefully
  - Distinct from human user profiles

## Key Takeaway

**Not all bots are the same!**
- Some bots ARE users (with user accounts)
- Some bots are just apps (without user accounts)
- Both may appear with `[bot]` suffix in commit data
- We handle both gracefully by trying the API and catching failures
