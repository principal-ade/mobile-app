# App Navigation

Mobile app for browsing GitHub repositories and viewing files, currently transitioning to an activity feed experience.

## Current State

The app currently functions as a GitHub file browser with OAuth authentication.

### Authentication Flow

1. User launches app and sees **LoginScreen**
2. Taps "Sign in with GitHub" to initiate PKCE OAuth flow
3. Completes authentication in system browser
4. Token stored securely via `expo-secure-store`
5. App navigates to **RepositoryListScreen**

### Repository Browsing Flow

1. **RepositoryListScreen** loads user's GitHub repositories
2. User taps a repository to open file browser drawer
3. Browser filters to show only `.md` and `.markdown` files
4. Directories can be navigated (breadcrumb trail shown)
5. Tapping a file navigates to **DocumentScreen**

### Document Viewing

1. **DocumentScreen** fetches raw file content from GitHub API
2. Currently displays plain text (markdown rendering removed)
3. Shows file path and repository context in header

## Screens

| Screen | Purpose | Status |
|--------|---------|--------|
| `LoginScreen` | GitHub OAuth authentication | Active |
| `RepositoryListScreen` | Browse repos + file browser | Active |
| `DocumentScreen` | View file content | Active (simplified) |
| `ActivityFeedScreen` | New home experience | Planned |

## External Dependencies

| Service | Purpose |
|---------|---------|
| GitHub OAuth | User authentication |
| GitHub REST API | Repos, contents, files |
| expo-secure-store | Token persistence |

## Planned Changes

The app is pivoting from a GitHub file browser to an **Activity Feed** experience:

1. **ActivityFeedScreen** will become the new home screen after login
2. Shows recent commits from featured repositories
3. Swipeable card interface with File City visualizations
4. Repository browsing may be removed or moved to secondary navigation

See `.principal-views/activity-feed/` for the planned activity feed architecture.

## Design Decisions

### Why PKCE OAuth?

Mobile apps cannot securely store client secrets. PKCE (Proof Key for Code Exchange) allows secure OAuth without a backend proxy by using dynamically generated code verifiers.

### Why expo-secure-store?

Native secure storage (Keychain on iOS, Keystore on Android) protects tokens from being extracted, even on rooted/jailbroken devices.

### Why remove markdown rendering?

The app is pivoting to activity feed. Markdown rendering dependencies (`themed-markdown`, `react-native-markdown-display`) were removed to:
- Reduce bundle size
- Simplify codebase before refactor
- Avoid maintaining unused code
