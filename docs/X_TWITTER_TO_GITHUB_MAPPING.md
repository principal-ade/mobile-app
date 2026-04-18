# X/Twitter to GitHub Username Mapping

## Feature Overview

Enhanced double-tap clipboard feature that allows users to copy an X/Twitter profile URL and navigate directly to the corresponding GitHub user profile (if the user has the same handle on both platforms).

## Current Behavior

Currently, the double-tap clipboard feature (`AppNavigator.tsx:478-547`) supports:
- GitHub repository URLs (e.g., `github.com/owner/repo`)
- GitHub user URLs (e.g., `github.com/username`)

When you double-tap the Search tab, it:
1. Reads clipboard content
2. Parses GitHub URLs via `githubUrlParser.ts`
3. Navigates directly to the repo or user profile

## The Problem

Many developers share their GitHub profiles on X/Twitter, but copying an X profile URL doesn't currently do anything useful in the app. Users have to:
1. Copy the X URL
2. Note the username
3. Manually search for that username on GitHub
4. Hope they use the same handle

## GitHub API Limitations

**GitHub's Search API does NOT support searching by Twitter username.**

Available user search qualifiers:
- `in:login`, `in:name`, `in:email`
- `type:user`, `type:org`
- `repos:>N`, `followers:>N`
- `location:city`
- `language:javascript`
- `created:>YYYY-MM-DD`

**Missing**: No `twitter:username` qualifier exists.

### What the API Does Provide

While searching by Twitter username isn't supported, the GitHub API does expose Twitter information:

1. **User Profile API** (`GET /users/:username`):
   ```json
   {
     "login": "elonmusk",
     "name": "Elon Musk",
     "twitter_username": "elonmusk",
     "bio": "...",
     ...
   }
   ```

2. **Social Accounts API** (`GET /users/:username/social_accounts`):
   ```json
   [
     {
       "provider": "twitter",
       "url": "https://twitter.com/elonmusk"
     }
   ]
   ```

## Proposed Solution

### Client-Side Approach (Current Limitation)

The naive approach would be:
1. Extract username from X URL (`x.com/elonmusk` → `elonmusk`)
2. Try direct GitHub lookup: `GET /users/elonmusk`
3. If user exists, optionally verify `twitter_username` matches
4. Navigate to profile

**Limitations:**
- Only works when usernames match exactly across platforms
- No way to find users who use different handles
- False positives possible (different people with same handle)

### Server-Side Approach (Recommended for Future)

Build a cached mapping service on the web-ade backend:

#### 1. Cache Building Strategy

**Periodic Crawler:**
```
For each GitHub user in our database:
  - Fetch user profile with twitter_username field
  - If twitter_username exists:
    - Store mapping: twitter_username → github_login
    - Store reverse mapping: github_login → twitter_username
```

**Cache Structure:**
```typescript
interface TwitterGitHubMapping {
  twitterUsername: string;
  githubLogin: string;
  lastVerified: Date;
  confidence: 'exact_match' | 'verified' | 'unverified';
}
```

#### 2. API Endpoint

```typescript
// New endpoint in web-ade
GET /api/github/lookup-by-twitter/:twitterUsername

Response:
{
  found: boolean;
  githubLogin?: string;
  confidence?: 'exact_match' | 'verified';
  alternates?: string[]; // Other possible matches
}
```

#### 3. Cache Population Sources

**Primary:**
- GitHub user profiles with `twitter_username` field
- Our existing user database (authenticated users, search results, etc.)

**Secondary (optional):**
- Crawl top GitHub users periodically
- Index users as they're searched/viewed in the app
- Community contributions/corrections

#### 4. Cache Refresh Strategy

```typescript
interface CacheRefreshConfig {
  // How often to verify existing mappings
  verificationInterval: '30 days';

  // Mark as stale if not verified within
  staleThreshold: '90 days';

  // Remove if GitHub user no longer exists
  pruneDeletedUsers: true;

  // Recheck if twitter_username field changes
  detectChanges: true;
}
```

## Implementation Plan

### Phase 1: Client-Side Direct Lookup (Quick Win)

**Mobile App Changes:**
1. Extend `githubUrlParser.ts` to recognize X/Twitter URLs
2. Add `type: 'x-profile'` parse result
3. Update double-tap handler in `AppNavigator.tsx`:
   ```typescript
   if (parseResult.type === 'x-profile') {
     // Try direct lookup with same username
     try {
       const user = await getUserProfile(parseResult.username);
       // Optionally verify twitter_username matches
       if (user.twitter_username === parseResult.username) {
         // High confidence match
       }
       navigation.navigate('UserProfile', { username: user.login });
     } catch {
       // No match - fall back to search
       navigation.navigate('Search', {
         query: parseResult.username
       });
     }
   }
   ```

**Pros:**
- Simple implementation
- No backend changes needed
- Works immediately for matching usernames

**Cons:**
- Limited success rate
- Only exact username matches
- No way to handle different handles

### Phase 2: Server-Side Cache (Full Solution)

**Backend Changes (web-ade):**

1. **Database Schema:**
   ```sql
   CREATE TABLE twitter_github_mappings (
     twitter_username VARCHAR(255) PRIMARY KEY,
     github_login VARCHAR(255) NOT NULL,
     last_verified TIMESTAMP NOT NULL,
     confidence VARCHAR(50) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_github_login ON twitter_github_mappings(github_login);
   CREATE INDEX idx_last_verified ON twitter_github_mappings(last_verified);
   ```

2. **Cache Builder Service:**
   ```typescript
   class TwitterGitHubCacheBuilder {
     async buildCache() {
       // For users we've seen (from searches, views, etc.)
       const users = await db.getRecentlyViewedUsers();

       for (const user of users) {
         await this.updateMapping(user.login);
       }
     }

     async updateMapping(githubLogin: string) {
       const profile = await github.getUser(githubLogin);

       if (profile.twitter_username) {
         await db.upsertMapping({
           twitterUsername: profile.twitter_username,
           githubLogin: profile.login,
           confidence: 'verified',
           lastVerified: new Date()
         });
       }
     }

     async refreshStale() {
       const stale = await db.getStaleMappings('90 days');
       for (const mapping of stale) {
         await this.updateMapping(mapping.githubLogin);
       }
     }
   }
   ```

3. **API Endpoint:**
   ```typescript
   // server/routes/github.ts
   router.get('/lookup-by-twitter/:username', async (req, res) => {
     const { username } = req.params;

     const mapping = await db.getMappingByTwitter(username);

     if (mapping) {
       return res.json({
         found: true,
         githubLogin: mapping.github_login,
         confidence: mapping.confidence,
         lastVerified: mapping.last_verified
       });
     }

     // Not in cache - try direct lookup as fallback
     try {
       const user = await github.getUser(username);
       if (user.twitter_username === username) {
         // Found a match! Cache it for next time
         await db.upsertMapping({
           twitterUsername: username,
           githubLogin: user.login,
           confidence: 'verified',
           lastVerified: new Date()
         });

         return res.json({
           found: true,
           githubLogin: user.login,
           confidence: 'verified'
         });
       }
     } catch {
       // No direct match
     }

     return res.json({ found: false });
   });
   ```

**Mobile App Changes:**
```typescript
// services/GitHubSearchService.ts
export async function lookupGitHubByTwitter(
  twitterUsername: string
): Promise<{ found: boolean; githubLogin?: string }> {
  const url = `${API_BASE}/github/lookup-by-twitter/${twitterUsername}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { found: false };
  }

  return await response.json();
}

// navigation/AppNavigator.tsx
if (parseResult.type === 'x-profile') {
  const lookup = await lookupGitHubByTwitter(parseResult.username);

  if (lookup.found) {
    navigation.navigate('UserProfile', {
      username: lookup.githubLogin
    });
  } else {
    // Fallback to search
    navigation.navigate('Search', {
      query: parseResult.username
    });
  }
}
```

**Pros:**
- High success rate for active users
- Handles different usernames across platforms
- Verified mappings via GitHub's own data
- Fast lookups (cached)
- Improves over time as cache grows

**Cons:**
- Requires backend infrastructure
- Initial cache building time
- Needs periodic refresh jobs
- Storage requirements

## Success Metrics

Track these metrics to measure effectiveness:

```typescript
interface LookupMetrics {
  // How many X URLs were parsed
  xUrlsParsed: number;

  // Direct username match attempts
  directLookupAttempts: number;
  directLookupSuccesses: number;

  // Cache hits (Phase 2)
  cacheHits: number;
  cacheMisses: number;

  // Final outcomes
  navigatedToProfile: number;
  fallbackToSearch: number;
}
```

## Future Enhancements

1. **Multi-Platform Support:**
   - LinkedIn profiles → GitHub
   - Dev.to profiles → GitHub
   - Mastodon handles → GitHub

2. **User Corrections:**
   - Allow users to report incorrect mappings
   - Community-verified mappings

3. **Confidence Scoring:**
   - Cross-reference multiple sources
   - Bio similarity analysis
   - Mutual follows on both platforms

4. **Smart Search Fallback:**
   - When cache misses, use fuzzy matching
   - Search by name + location + bio keywords
   - Suggest top 3 matches for user to choose

## References

- [GitHub User Search API](https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28)
- [GitHub Social Accounts API](https://docs.github.com/en/rest/users/social-accounts)
- [Feature Request: Search by Twitter Handle](https://github.com/orgs/community/discussions/27275)
- Current implementation: `src/navigation/AppNavigator.tsx:478-547`
- URL parser: `src/utils/githubUrlParser.ts`
