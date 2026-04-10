# Live Activity Feature - Mobile App Implementation Guide

## Overview

This document outlines the implementation of real-time live activity tracking in the mobile app, showing who is online, what repositories they're working on, and their live git status updates.

**Goal:** Create a dedicated Live Activity screen/tab that displays real-time presence and collaboration data powered by the same Control Tower Core infrastructure used by the desktop app.

## Architecture

### System Components

```
Mobile App (React Native/Expo)
    ↓ WebSocket (BrowserWebSocketTransportAdapter)
    ↓
Control Tower Core Client (@principal-ai/control-tower-core)
    ↓ WSS Connection
    ↓
Repository Traffic Controller Server
    ↓
Presence & Repository Tracking
```

### Technology Stack

- **Client Library:** `@principal-ai/control-tower-core` v0.6.2
- **Transport:** `BrowserWebSocketTransportAdapter` (React Native compatible)
- **Protocol:** WebSocket over WSS
- **Server:** `wss://repository-traffic-controller-production.rj36caac972nm.us-east-1.cs.amazonlightsail.com/ws`
- **Authentication:** JWT tokens from landing-page auth server

## Desktop App Reference

The desktop app already implements this feature. Key reference files:

### GitSyncWebSocketManager
**Location:** `/Users/griever/Developer/desktop-app/electron-app/src/main/services/GitSyncWebSocketManager.ts`

**Key Implementation Points:**
- Lines 26-46: Imports from control-tower-core
- Lines 266-372: Connection setup and initialization
- Lines 1306-1357: Presence data fetching logic
- Lines 734-803: Event listeners and handlers

### PresenceIPC
**Location:** `/Users/griever/Developer/desktop-app/electron-app/src/main/services/PresenceIPC.ts`

**Key Operations:**
- Lines 8-46: Imports and type definitions
- Full presence API surface for reference

## Control Tower Core Integration

### Installation

```bash
npm install @principal-ai/control-tower-core
```

Note: The `ws` peer dependency is marked as optional and only needed for Node.js environments. React Native uses native WebSocket support.

### Basic Client Setup

```typescript
import {
  ClientBuilder,
  BrowserWebSocketTransportAdapter,
  type Client
} from '@principal-ai/control-tower-core';

// Initialize client
const transport = new BrowserWebSocketTransportAdapter();
const client = new ClientBuilder()
  .withTransport(transport)
  .withAuth(authAdapter) // JWT auth adapter
  .withReconnection({
    enabled: true,
    maxAttempts: Infinity,
    initialDelay: 5000,
    maxDelay: 30000,
    backoffFactor: 1.5
  })
  .build();

// Connect to server
await client.connect(
  'wss://repository-traffic-controller-production.rj36caac972nm.us-east-1.cs.amazonlightsail.com/ws'
);

// Join global presence room
await client.joinRoom('__global_presence__');
```

### Platform Compatibility

The `BrowserWebSocketTransportAdapter` is **fully compatible with React Native** because:

1. React Native provides native `WebSocket` API (same as browsers)
2. No Node.js-specific dependencies
3. Uses standard `setTimeout`/`clearTimeout` (supported in RN)
4. Auth tokens passed via query params (not custom headers)

Reference: `/Users/griever/Developer/messaging-server/control-tower-core/src/adapters/websocket/BrowserWebSocketTransportAdapter.ts`

## Data Model & Available Activity

### 1. User Presence

**What it shows:** Who is currently online/active

**API Request:**
```typescript
const response = await client.request('presence:get_users', {});
```

**Response Schema:**
```typescript
interface PresenceUser {
  userId: string;
  status: 'active' | 'idle' | 'away';
  lastSeen: number; // timestamp
  metadata?: {
    username?: string;
    avatar?: string;
    email?: string;
  };
}

interface PresenceResponse {
  users: PresenceUser[];
}
```

**Server Configuration:**
- Heartbeat interval: 30 seconds
- Away threshold: 60 seconds (2 missed heartbeats)
- Disconnect threshold: 90 seconds (3 missed heartbeats)
- Grace period: 30 seconds

### 2. Repository Activity

**What it shows:** Which repositories each user has open

**Event Listener:**
```typescript
client.on('repository:opened', (event) => {
  // User opened a repository
  console.log(event.userId, event.repositoryId);
});

client.on('repository:closed', (event) => {
  // User closed a repository
  console.log(event.userId, event.repositoryId);
});

client.on('repository:active_changed', (event) => {
  // User switched active repository
  console.log(event.userId, event.repositoryId);
});
```

**Request Active Repositories:**
```typescript
const response = await client.request('repository:get_user_repositories', {
  userId: string
});
```

**Response Schema:**
```typescript
interface UserRepositories {
  userId: string;
  repositories: string[]; // repository IDs
  activeRepository?: string; // currently active repo ID
}
```

### 3. Live Git Status

**What it shows:** Real-time git status updates from users

**Event Listener:**
```typescript
client.on('git:status_updated', (event) => {
  // User's git status changed
  console.log({
    userId: event.userId,
    repositoryId: event.repositoryId,
    gitStatus: event.gitStatus
  });
});
```

**Git Status Schema:**
```typescript
interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  modified: string[]; // file paths
  staged: string[];
  untracked: string[];
  conflicted: string[];
}
```

### 4. GitHub Webhook Events

**What it shows:** Real-time push notifications

**Event Listener:**
```typescript
client.on('github:push', (event) => {
  // Someone pushed to a repository
  console.log({
    repositoryId: event.repositoryId,
    pusher: event.pusher,
    commits: event.commits,
    ref: event.ref
  });
});
```

## Mobile App Implementation Plan

### Phase 1: Core Integration

**Files to Create:**

1. **`src/services/LiveActivityService.ts`**
   - Control Tower Core client wrapper
   - Connection management
   - Event handling and state management
   - Reference: Desktop's `GitSyncWebSocketManager.ts`

2. **`src/context/LiveActivityContext.tsx`**
   - React Context for live activity state
   - Provider component for app-wide access
   - Hooks: `useLiveActivity()`, `usePresence()`, `useRepositoryActivity()`

3. **`src/types/liveActivity.ts`**
   - TypeScript interfaces for all activity data
   - Event type definitions

**Dependencies to Add:**
```json
{
  "@principal-ai/control-tower-core": "^0.6.2"
}
```

### Phase 2: Live Activity Screen

**Files to Create:**

1. **`src/screens/LiveActivityScreen.tsx`**
   - Main screen component
   - Tab navigation: "Online Users", "Repository Activity", "Recent Events"

2. **`src/components/liveActivity/OnlineUsersList.tsx`**
   - Shows list of online users with status indicators
   - User avatars, usernames, status (active/idle/away)
   - Tap to view user's current repositories

3. **`src/components/liveActivity/RepositoryActivityList.tsx`**
   - Shows which repos are being worked on
   - Groups users by repository
   - Shows active vs. open repositories

4. **`src/components/liveActivity/GitStatusCard.tsx`**
   - Displays live git status for a user/repo
   - Shows branch, changes, staged files
   - Visual indicators for ahead/behind commits

5. **`src/components/liveActivity/ActivityFeedItem.tsx`**
   - Individual activity event display
   - Supports: user online/offline, repo opened/closed, git updates, pushes
   - Timestamp and user info

**Navigation Integration:**

Add to bottom tab navigator or main navigation:
```typescript
<Tab.Screen
  name="LiveActivity"
  component={LiveActivityScreen}
  options={{
    tabBarIcon: ({ color }) => <ActivityIcon color={color} />,
    tabBarLabel: 'Live'
  }}
/>
```

### Phase 3: Real-time Updates

**Implementation:**

1. **WebSocket Event Subscription**
   ```typescript
   useEffect(() => {
     const service = LiveActivityService.getInstance();

     service.on('presence:user_joined', handleUserJoined);
     service.on('presence:user_left', handleUserLeft);
     service.on('repository:opened', handleRepoOpened);
     service.on('git:status_updated', handleGitStatus);
     service.on('github:push', handlePush);

     return () => {
       service.off('presence:user_joined', handleUserJoined);
       // ... cleanup other listeners
     };
   }, []);
   ```

2. **State Updates**
   - Use React state/context for real-time updates
   - Optimistic UI updates for instant feedback
   - Toast notifications for important events

3. **Background Connection**
   - Keep WebSocket connection alive when app is in foreground
   - Reconnect on app resume
   - Handle connection loss gracefully

## UI/UX Design Considerations

### Screen Layout

```
┌─────────────────────────────┐
│   Live Activity             │
├─────────────────────────────┤
│ [Online] [Repos] [Feed]     │ ← Tabs
├─────────────────────────────┤
│                             │
│  👤 User 1    ● Active      │
│     📁 repo-1, repo-2       │
│                             │
│  👤 User 2    ○ Idle        │
│     📁 repo-3               │
│                             │
│  👤 User 3    ● Active      │
│     📁 repo-1               │
│     ├─ main (↑2 ↓0)        │
│     ├─ 3 modified files     │
│     └─ 1 staged file        │
│                             │
└─────────────────────────────┘
```

### Visual Elements

**Status Indicators:**
- 🟢 Green dot: Active
- 🟡 Yellow dot: Idle (60s+ since last heartbeat)
- ⚫ Gray dot: Away/Offline

**Repository Icons:**
- 📁 Open repository
- ⭐ Active repository (currently focused)
- 📝 Has uncommitted changes
- 🔄 Has commits to push/pull

**Real-time Animations:**
- Fade in/out for user status changes
- Pulse animation for new activity
- Smooth list updates

### Accessibility

- VoiceOver support for all elements
- Clear status announcements
- Semantic labels for all icons
- High contrast mode support

## Security & Privacy Considerations

### Authentication

- JWT tokens from existing auth system
- Token refresh handling
- Secure token storage via `expo-secure-store`

### Data Privacy

- Only show activity for users in the same workspace/organization
- Respect privacy settings (if users opt out of presence tracking)
- Don't expose sensitive git commit messages/file paths without permission

### Connection Security

- WSS (WebSocket Secure) only
- Certificate validation
- No plaintext credentials

## Testing Strategy

### Unit Tests

- LiveActivityService connection logic
- Event handling and state updates
- Context providers and hooks
- Mock WebSocket for isolated testing

### Integration Tests

- Full flow: connect → authenticate → receive events → update UI
- Reconnection scenarios
- Error handling

### Manual Testing Checklist

- [ ] Connect to live server and see real users
- [ ] Status updates reflect actual activity
- [ ] Repository open/close events work
- [ ] Git status updates in real-time
- [ ] Reconnection after network loss
- [ ] Background/foreground transitions
- [ ] Performance with 50+ online users

## Performance Considerations

### Optimization Strategies

1. **Debounced Updates**
   - Don't update UI on every heartbeat
   - Batch git status updates

2. **Virtual Lists**
   - Use `FlatList` with `windowSize` optimization
   - Only render visible users

3. **Memoization**
   - Memoize user components
   - Prevent unnecessary re-renders

4. **WebSocket Message Filtering**
   - Only subscribe to relevant events
   - Filter out noise at the service layer

## Open Questions & Decisions Needed

### 1. Activity Feed Detail Level

**Question:** How much detail should we show in git status updates?

**Options:**
- A) File names only (e.g., "3 modified files")
- B) Full file paths (e.g., "src/components/Button.tsx")
- C) Diff preview (first few lines of changes)

**Recommendation:** Start with (A), add (B) as optional detail view

### 2. Notification Strategy

**Question:** Should users get notifications for live activity?

**Options:**
- A) No notifications, view-only screen
- B) Optional push notifications for specific users (e.g., "User X is working on repo Y")
- C) Toast notifications within app only

**Recommendation:** Start with (C) for important events like teammates joining

### 3. Historical Activity

**Question:** Should we store/show activity history?

**Options:**
- A) Real-time only (ephemeral)
- B) Store last 24 hours locally
- C) Full server-side history

**Recommendation:** Start with (A), add (B) if users request it

### 4. Repository Filtering

**Question:** Can users filter which repositories to monitor?

**Options:**
- A) Show all repositories (default)
- B) Filter by starred/favorite repos
- C) Filter by organization/team

**Recommendation:** Start with (A), add (B) in v2

### 5. Offline Behavior

**Question:** What happens when WebSocket disconnects?

**Options:**
- A) Show "Offline" banner, keep last known state
- B) Clear all data and show empty state
- C) Show cached data with staleness indicator

**Recommendation:** Use (A) with auto-reconnect

## Implementation Timeline & Milestones

### Milestone 1: Core Integration (Foundation)
- [ ] Install `@principal-ai/control-tower-core`
- [ ] Create `LiveActivityService.ts`
- [ ] Create `LiveActivityContext.tsx`
- [ ] Test connection to production server
- [ ] Verify presence events work

### Milestone 2: Basic UI (MVP)
- [ ] Create `LiveActivityScreen.tsx`
- [ ] Implement "Online Users" tab
- [ ] Show user status (active/idle/away)
- [ ] Add to navigation

### Milestone 3: Repository Activity
- [ ] Implement "Repos" tab
- [ ] Show which repos users have open
- [ ] Highlight active repositories
- [ ] Add repository grouping

### Milestone 4: Git Status Display
- [ ] Create `GitStatusCard` component
- [ ] Show live git status updates
- [ ] Display branch, changes, staged files
- [ ] Add visual diff indicators

### Milestone 5: Events Feed
- [ ] Implement "Feed" tab
- [ ] Show real-time activity stream
- [ ] Add event filtering
- [ ] Toast notifications for key events

### Milestone 6: Polish & Optimization
- [ ] Add animations and transitions
- [ ] Optimize performance for large user lists
- [ ] Accessibility improvements
- [ ] Error handling and edge cases

## Related Documentation

- Desktop App Reference: `/Users/griever/Developer/desktop-app/electron-app/src/main/services/GitSyncWebSocketManager.ts`
- Control Tower Core: `/Users/griever/Developer/messaging-server/control-tower-core`
- Repository Traffic Controller: `/Users/griever/Developer/messaging-server/repository-traffic-controller`

## References

### API Documentation

**Presence API:**
- `presence:get_users` - Get all online users
- `presence:get_user` - Get specific user presence
- Event: `presence:user_joined` - User came online
- Event: `presence:user_left` - User went offline
- Event: `presence:status_changed` - User status changed

**Repository API:**
- `repository:get_user_repositories` - Get user's open repos
- Event: `repository:opened` - User opened a repository
- Event: `repository:closed` - User closed a repository
- Event: `repository:active_changed` - User switched active repo

**Git API:**
- Event: `git:status_updated` - Git status changed
- Event: `github:push` - Push webhook received

### Server Configuration

**Location:** `/Users/griever/Developer/messaging-server/repository-traffic-controller/src/server-control-tower.ts:234-263`

**Key Settings:**
- Heartbeat: 30s
- Away threshold: 60s
- Disconnect: 90s
- Grace period: 30s

---

**Document Version:** 1.0
**Last Updated:** 2026-04-09
**Author:** Claude (via user request)
