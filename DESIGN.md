# React Native GitHub Markdown Reader - Design Document

## Project Overview

A React Native mobile application that authenticates with GitHub, allows users to browse their repositories, and renders Markdown files using a custom rendering library.

## Architecture

### Technology Stack
- **Framework**: React Native (Expo managed workflow)
- **Language**: TypeScript
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Authentication**: expo-auth-session
- **Secure Storage**: expo-secure-store
- **Markdown Rendering**: Custom library (to be integrated)

### Core Components
1. **Authentication Module**: GitHub OAuth flow implementation
2. **GitHub API Service**: Repository and file content fetching
3. **Repository Browser**: List and navigate repositories
4. **Markdown Renderer**: Display Markdown content using custom library

## Implementation Phases

### Phase 0: Project Setup and Build Confirmation

**Goal**: Establish foundational project structure and verify successful builds.

#### 0.1 Environment Setup
- Prerequisites: Node.js, Watchman, JDK
- Install Expo CLI globally: `npm install -g expo-cli`

#### 0.2 Project Initialization
```bash
expo init GithubMarkdownReader
cd GithubMarkdownReader
```
- Template: blank (TypeScript)

#### 0.3 Initial Build Test
- Start development: `expo start`
- Test on iOS Simulator (press `i`) and/or Android Emulator (press `a`)
- Verify default app screen loads correctly

#### 0.4 Basic Navigation Setup
```bash
npm install @react-navigation/native
expo install react-native-screens react-native-safe-area-context
npm install @react-navigation/stack
npm install @types/react-navigation
```
- Create `AppNavigator.tsx` for navigation structure
- Integrate into `App.tsx`

### Phase 1: GitHub OAuth Authentication

**Goal**: Implement secure GitHub authentication to access user repositories.

#### 1.1 GitHub OAuth Application Setup
1. Create OAuth App in GitHub Settings → Developer settings → OAuth Apps
2. Configure:
   - **Application Name**: GitHub Markdown Reader
   - **Homepage URL**: `https://github.com/`
   - **Authorization callback URL**: `https://auth.expo.io/@your-expo-username/GithubMarkdownReader`
3. Store credentials securely (`.env` or `app.config.js`)

#### 1.2 Authentication Implementation
```bash
expo install expo-auth-session expo-secure-store
```

**Key Features**:
- Use `useAuthRequest` for OAuth web flow
- Request scope: `repo` (private repos) or `public_repo` (public only)
- Implement `signInWithGitHub()` function
- Store access token using `expo-secure-store`

**Endpoints**:
- Authorization: `https://github.com/login/oauth/authorize`
- Token Exchange: `https://github.com/login/oauth/access_token`

**Type Definitions**:
```typescript
interface GitHubAuthResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: GitHubUser | null;
}
```

### Phase 2: GitHub API Integration & Data Fetching

**Goal**: Fetch repository lists and Markdown file content using GitHub API.

#### 2.1 HTTP Client Setup
```bash
npm install axios
```
- Create `GithubService.ts` for all API interactions
- Include access token in all requests: `Authorization: token <ACCESS_TOKEN>`

**Type Definitions**:
```typescript
interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
}

interface FileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}
```

#### 2.2 Repository Listing
- **Endpoint**: `GET /user/repos`
- Create `RepositoryListScreen.tsx` component
- Display repositories using `FlatList`

#### 2.3 File Content Retrieval
- **Browse files**: `GET /repos/{owner}/{repo}/contents/{path}`
- **Filter**: Show only `.md` and `.markdown` files
- **Fetch raw content**: Use header `Accept: application/vnd.github.v3.raw` to receive plain text

### Phase 3: Custom Markdown Rendering

**Goal**: Display fetched Markdown content using custom rendering library.

#### 3.1 Library Integration
- Import custom Markdown library (React Native compatible)
- Create `CustomMarkdownRenderer.tsx` wrapper component
- Handle props and styling configuration

**Type Definitions**:
```typescript
interface MarkdownRendererProps {
  content: string;
  style?: StyleProp<ViewStyle>;
}
```

#### 3.2 Display Screen
- Create `DocumentScreen.tsx` component
- Receive raw Markdown text via props or navigation params
- Pass content to `CustomMarkdownRenderer`
- Apply responsive styling:
  - Font sizes
  - Line height
  - Padding/margins
  - Device size adaptation

### Phase 4: Polish and Error Handling

**Goal**: Ensure robust user experience with proper loading states and error handling.

#### 4.1 UX Refinements
- **Loading States**: `ActivityIndicator` for all network operations
  - Login flow
  - Repository fetching
  - Document fetching
- **UI Design**: Clean navigation headers and button styles
- **Empty States**:
  - No repositories available
  - No Markdown files in selected repository

#### 4.2 Error Handling
- **Network Errors**: Try/catch blocks with user-friendly messages
- **Authentication Errors**:
  - Detect expired/invalid tokens
  - Prompt re-authentication
- **Markdown Rendering Errors**:
  - Implement `ErrorBoundary` around renderer
  - Handle parsing failures gracefully

**Type Definitions**:
```typescript
interface AppError {
  type: 'network' | 'auth' | 'rendering' | 'unknown';
  message: string;
  details?: any;
}
```

## Data Flow

```
User Login
    ↓
GitHub OAuth (get access token)
    ↓
Store token securely
    ↓
Fetch repositories list
    ↓
User selects repository
    ↓
Browse repository files
    ↓
User selects Markdown file
    ↓
Fetch raw content
    ↓
Render with custom library
```

## Security Considerations

1. **Token Storage**: Use `expo-secure-store` for access tokens (encrypted at rest)
2. **OAuth Flow**: Follow GitHub OAuth best practices
3. **API Key Management**: Never commit credentials to version control
4. **Scope Limitation**: Request minimum necessary permissions

## File Structure

```
GithubMarkdownReader/
├── App.tsx
├── app.config.js
├── package.json
├── tsconfig.json
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RepositoryListScreen.tsx
│   │   └── DocumentScreen.tsx
│   ├── services/
│   │   └── GithubService.ts
│   ├── components/
│   │   └── CustomMarkdownRenderer.tsx
│   ├── types/
│   │   ├── github.ts
│   │   └── auth.ts
│   └── utils/
│       └── auth.ts
└── assets/
```

## TypeScript Configuration

The project will use strict TypeScript configuration:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "module": "commonjs",
    "lib": ["esnext"],
    "jsx": "react-native",
    "noEmit": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

## Future Enhancements

- Offline caching of frequently accessed documents
- Search functionality across repositories
- Bookmark favorite documents
- Dark mode support
- Share/export rendered Markdown
- Support for other file types (code highlighting, images)

## Success Criteria

- [ ] User can authenticate with GitHub OAuth
- [ ] User can view list of their repositories
- [ ] User can browse Markdown files in a repository
- [ ] User can view rendered Markdown using custom library
- [ ] App handles errors gracefully
- [ ] App runs on both iOS and Android
- [ ] Loading states provide feedback during network operations
- [ ] Type safety throughout the application
