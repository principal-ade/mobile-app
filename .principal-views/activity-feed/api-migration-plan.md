# File City API Migration Plan

## Confirmation: Web App Uses PNG Endpoint

**File**: `web-ade/src/components/home/MobileRepoCard.tsx`

```typescript
// Line 60
const baseImageUrl = `/api/file-city/${summary.owner}/${summary.repo}?width=800&height=800`;

// Line 76 - Prefetch
img.src = `${baseImageUrl}&commit=${commit.sha}`;

// Line 471 - Render
<img
  src={`${baseImageUrl}&commit=${commit.sha}`}
  alt={`${summary.fullName} file structure`}
  // ...
/>
```

**Conclusion**: We **cannot modify** the existing `/api/file-city/[owner]/[repo]` endpoint without breaking the web app's mobile homepage.

## Recommended Approach: New JSON Endpoint

### Create New Route: `/api/file-city-data/[owner]/[repo]`

This keeps the PNG endpoint intact for web usage while providing JSON data for the React Native app.

## Implementation Steps

### Step 1: Create New API Route (Web-ADE)

**Location**: `web-ade/src/app/api/file-city-data/[owner]/[repo]/route.ts`

```typescript
/**
 * File City Data API
 *
 * GET /api/file-city-data/[owner]/[repo] - Get city data as JSON
 *
 * Query parameters:
 *   - ref: Git ref/branch (default: "HEAD")
 *   - commit: Optional single commit SHA to include changed files
 *   - commits: Optional comma-separated commit SHAs
 *
 * Returns JSON with city data and optional commit highlights.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  CodeCityBuilderWithGrid,
  getFilesFromGitHubTree,
  buildFileSystemTreeFromFileInfoList,
} from '@principal-ai/file-city-builder';
import { gitTreeCache } from '@/lib/git-tree-cache';
import { getCached, setCachedAsync, getCommitDetailCacheKey } from '@/lib/redis-cache';
import type { GitHubCommitDetailResponse } from '@/types/api';

interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

const CACHE_TTL_24H = 86400; // 24 hours

/**
 * Fetch commit details with Redis caching
 * (Same as file-city route)
 */
async function fetchCommitDetails(
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommitDetailResponse | null> {
  const cacheKey = getCommitDetailCacheKey(owner, repo, sha);
  const cached = await getCached<GitHubCommitDetailResponse>(cacheKey);
  if (cached) return cached;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'WebADE/1.0',
  };
  if (token) headers['Authorization'] = `token ${token}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`,
      { headers }
    );

    if (!response.ok) return null;

    const commit: GitHubCommitDetailResponse = await response.json();
    setCachedAsync(cacheKey, commit, CACHE_TTL_24H);
    return commit;
  } catch (err) {
    console.warn('[File City Data] Error fetching commit:', err);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { owner, repo } = await params;
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get('ref') || 'HEAD';
    const commitSha = searchParams.get('commit');
    const commitsSha = searchParams.get('commits');

    // Parse commit SHAs
    const commitShas: string[] = [];
    if (commitSha) commitShas.push(commitSha);
    if (commitsSha) {
      commitShas.push(...commitsSha.split(',').map(s => s.trim()).filter(Boolean));
    }

    // 1. Fetch GitHub tree (uses same cache as PNG endpoint)
    const cacheKey = `${owner}/${repo}/${ref}`;
    let tree = gitTreeCache.get(cacheKey);

    if (!tree) {
      const token = process.env.GITHUB_TOKEN;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'WebADE/1.0',
      };
      if (token) headers['Authorization'] = `token ${token}`;

      const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
      const response = await fetch(treeUrl, { headers });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      tree = await response.json();
      gitTreeCache.set(cacheKey, tree);
      gitTreeCache.set(tree.sha, tree);
    }

    // 2. Build city data
    const files = getFilesFromGitHubTree(tree);
    const fileTree = buildFileSystemTreeFromFileInfoList(files, tree.sha);
    const builder = new CodeCityBuilderWithGrid();
    const cityData = builder.buildCityFromFileSystem(fileTree, '', {
      paddingTop: 2,
      paddingBottom: 2,
      paddingLeft: 2,
      paddingRight: 2,
    });

    // 3. Fetch commit details if requested
    let highlightFiles: Array<{ path: string; status: 'added' | 'modified' | 'removed' }> | undefined;

    if (commitShas.length > 0) {
      const commitPromises = commitShas.map(sha => fetchCommitDetails(owner, repo, sha));
      const commitResults = await Promise.all(commitPromises);

      const fileMap = new Map<string, 'added' | 'modified' | 'removed'>();
      for (const commitDetails of commitResults) {
        if (commitDetails?.files) {
          for (const f of commitDetails.files) {
            const status = f.status === 'added' ? 'added'
              : f.status === 'removed' ? 'removed'
              : 'modified';
            const existing = fileMap.get(f.filename);
            if (!existing) {
              fileMap.set(f.filename, status);
            } else if (existing !== status) {
              fileMap.set(f.filename, 'modified');
            }
          }
        }
      }

      if (fileMap.size > 0) {
        highlightFiles = Array.from(fileMap.entries()).map(([path, status]) => ({ path, status }));
      }
    }

    // 4. Return JSON
    return NextResponse.json({
      cityData,
      highlightFiles: highlightFiles || [],
      treeSha: tree.sha,
      truncated: tree.truncated || false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
      },
    });

  } catch (error) {
    console.error('Error generating File City data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate File City data', message },
      { status: 500 }
    );
  }
}
```

### Step 2: Update Mobile App Service

**Location**: `mobile-app/src/services/FileCityService.ts`

Add new function to fetch city data with commit highlights:

```typescript
export interface FileCityDataResult {
  cityData: CityData;
  highlightFiles: Array<{
    path: string;
    status: 'added' | 'modified' | 'removed';
  }>;
  treeSha: string;
  truncated: boolean;
}

/**
 * Fetch File City data with optional commit highlighting
 * Uses new JSON endpoint instead of PNG
 */
export async function getFileCityData(
  owner: string,
  repo: string,
  options?: {
    ref?: string;
    commit?: string;
    commits?: string[];
  }
): Promise<FileCityDataResult> {
  const params = new URLSearchParams();
  if (options?.ref) params.set('ref', options.ref);
  if (options?.commit) params.set('commit', options.commit);
  if (options?.commits) params.set('commits', options.commits.join(','));

  const url = `${apiConfig.baseUrl}/file-city-data/${owner}/${repo}?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch city data: ${response.status} - ${errorText}`);
  }

  return await response.json();
}
```

### Step 3: Update MobileRepoCard

**Location**: `mobile-app/src/components/ActivityFeed/MobileRepoCard.tsx`

Replace image loading with city data + FileCityCanvas:

```typescript
import { FileCityCanvas } from '../FileCity';
import { getFileCityData } from '../../services/FileCityService';
import type { CityData, HighlightLayer } from '@principal-ai/file-city-builder';

// Add state
const [cityData, setCityData] = useState<CityData | null>(null);
const [baseHighlightLayers, setBaseHighlightLayers] = useState<HighlightLayer[]>([]);

// Fetch city data once per repo
useEffect(() => {
  let cancelled = false;

  async function loadCityData() {
    try {
      const result = await getFileCityData(summary.owner, summary.repo);

      if (!cancelled) {
        setCityData(result.cityData);
        // Generate base highlight layers for file types
        const { highlightLayers } = generateHighlightLayersAndIcons(result.cityData);
        setBaseHighlightLayers(highlightLayers);
      }
    } catch (err) {
      console.error('[MobileRepoCard] Failed to load city data:', err);
    }
  }

  loadCityData();

  return () => { cancelled = true; };
}, [summary.owner, summary.repo]);

// Build commit highlight layer for active commit
const commitHighlightLayer = useMemo(() => {
  if (!activeCommit || !cityData) return null;

  // Get changed files from commit (already fetched for stats)
  const changedFiles = /* extract from commit details */;

  return {
    name: 'commit-changes',
    color: theme.colors.warning,
    opacity: 0.8,
    enabled: true,
    items: changedFiles.map(file => ({
      path: file.filename,
      type: 'file' as const,
      renderStrategy: file.status === 'added' ? 'fill' : 'border',
    })),
  };
}, [activeCommit, cityData, theme]);

// Combine layers
const allLayers = commitHighlightLayer
  ? [...baseHighlightLayers, commitHighlightLayer]
  : baseHighlightLayers;

// Replace Image component with:
{cityData ? (
  <FileCityCanvas
    cityData={cityData}
    highlightLayers={allLayers}
    iconMap={iconMap}
    showFileTypeIcons={true}
    backgroundColor="transparent"
    enableZoom={false}
    enablePan={false}
    onBuildingPress={handleBuildingPress}
  />
) : (
  <Logo width={120} height={120} color={theme.colors.textSecondary} opacity={0.6} />
)}
```

## Migration Timeline

1. **Phase 1: Create new endpoint** (web-ade)
   - Add `/api/file-city-data/[owner]/[repo]/route.ts`
   - Deploy to staging
   - Test JSON response

2. **Phase 2: Update mobile app** (mobile-app)
   - Add `getFileCityData()` to `FileCityService.ts`
   - Update `MobileRepoCard.tsx` to use FileCityCanvas
   - Test on dev build

3. **Phase 3: Gradual rollout**
   - Keep PNG endpoint untouched
   - Mobile app uses new JSON endpoint
   - Web app continues using PNG
   - Monitor performance/bandwidth

4. **Future: Migrate web mobile view** (optional)
   - Once proven stable, web could also switch to canvas rendering
   - Or keep PNG for web (simpler, works everywhere)

## Benefits of This Approach

✅ **No breaking changes** - Web app continues working
✅ **Shared caching** - Both endpoints use same tree/commit cache
✅ **Independent evolution** - Mobile can use interactive canvas
✅ **Bandwidth savings** - 70-85% reduction for mobile users
✅ **Cleaner architecture** - Data vs presentation separation
