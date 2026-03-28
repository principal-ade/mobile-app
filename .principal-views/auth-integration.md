# Auth Server Integration

## Status: Implemented

The mobile app now authenticates through the centralized auth server, matching the web-ade authentication flow.

## What Problem Does This Solve?

The mobile app previously authenticated directly with GitHub, bypassing our centralized auth infrastructure. This created several issues:

1. **Fragmented user accounts** - Mobile users were separate from web users
2. **No session management** - No refresh tokens, no centralized session control
3. **Can't call web-ade APIs** - Web-ade requires WorkOS authentication
4. **No unified auth** - Different OAuth clients, different token types

By integrating with our auth server, mobile users are now first-class citizens in the Principal ecosystem with the same authentication flow as web-ade.

## What Operations Are Available?

The mobile app now supports:

- **Sign in via WorkOS** - Same auth flow as web-ade
- **Unified tokens** - GitHub token + WorkOS token + refresh token
- **Web-ade API access** - Authenticated access to all Principal services
- **Session persistence** - Secure token storage with refresh capability
- **Sign out** - Clears all tokens

## Implementation Details

### Mobile App Components

| File | Purpose |
|------|---------|
| `src/services/AuthService.ts` | Handles auth flow with `openAuthSessionAsync` |
| `src/context/AuthContext.tsx` | Manages auth state, provides `signIn`/`signOut` |
| `src/utils/authStorage.ts` | Secure storage for multiple tokens |
| `src/utils/pkce.ts` | PKCE challenge generation |
| `src/utils/config.ts` | Auth server URL configuration |
| `src/screens/AboutScreen.tsx` | Sign in/out UI in Account section |

### Auth Server Changes

The auth server callback (`/api/auth/workos/callback`) was updated to:
- Detect mobile URLs (custom schemes like `principal-ai://`)
- Store tokens in session for mobile flow (instead of cookies)
- Redirect to app with state parameter
- Mobile app calls `/token` endpoint to retrieve tokens

## Auth Flow

```
1. User taps "Sign in with GitHub" in About screen
2. App generates PKCE (code_verifier, code_challenge) and state
3. App calls /api/auth/workos/start with:
   - code_challenge
   - state
   - return_url: principal-ai://auth/callback
4. Auth server returns auth_url
5. App opens auth_url with openAuthSessionAsync()
6. User completes OAuth: WorkOS → GitHub → authorize
7. Auth server callback:
   - Detects mobile URL (principal-ai://)
   - Exchanges code for tokens
   - Stores tokens in session
   - Redirects to principal-ai://auth/callback?state=...
8. Browser auto-closes, app receives redirect
9. App extracts state, calls /api/auth/workos/token/mobile with:
   - state
   - code_verifier (PKCE proof)
10. Auth server verifies PKCE, returns tokens
11. App stores tokens securely
12. User is signed in!
```

## Token Storage

Tokens are stored securely using `expo-secure-store`:

| Key | Purpose |
|-----|---------|
| `github_access_token` | GitHub API calls |
| `workos_access_token` | Web-ade API authentication |
| `refresh_token` | Session renewal |

## Configuration

**app.json:**
```json
{
  "scheme": "principal-ai",
  "extra": {
    "authServerUrl": "https://auth.principal-ade.com"
  }
}
```

## Error Handling

- **Auth cancelled** - User dismissed browser, show "Sign in was cancelled"
- **Auth server unreachable** - Network error displayed
- **Token exchange fails** - PKCE mismatch or session expired
- **State mismatch** - Possible tampering, auth rejected

## Security Features

- **PKCE** - Proof Key for Code Exchange prevents code interception
- **State parameter** - CSRF protection
- **Secure storage** - Tokens in iOS Keychain / Android Keystore
- **No tokens in URLs** - Tokens retrieved via secure /token endpoint
