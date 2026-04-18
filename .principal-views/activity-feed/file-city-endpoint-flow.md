# File City Endpoint - Current Flow

## Endpoint: `GET /api/file-city/[owner]/[repo]`

This diagram shows how the server-side endpoint currently generates PNG images with optional commit highlighting.

```mermaid
sequenceDiagram
    participant Client as Mobile App<br/>(MobileRepoCard)
    participant API as /api/file-city<br/>[owner]/[repo]
    participant GitHub as GitHub API
    participant Redis as Redis Cache
    participant Builder as CodeCityBuilder
    participant Renderer as PNG Renderer

    Note over Client,Renderer: Request with commit SHA for highlighting

    Client->>API: GET /file-city/owner/repo?<br/>width=800&height=800&commit=abc123

    alt Has commit parameter
        API->>Redis: Check cache for commit details<br/>Key: commit:{owner}/{repo}/{sha}

        alt Cache miss
            Redis-->>API: null
            API->>GitHub: GET /repos/{owner}/{repo}/commits/{sha}
            GitHub-->>API: CommitDetailResponse<br/>{files: [{filename, status}]}
            API->>Redis: Cache commit details (24h TTL)
        else Cache hit
            Redis-->>API: CommitDetailResponse
        end

        Note over API: Extract changed files:<br/>[{path, status: added|modified|removed}]
    end

    API->>Redis: Check cache for tree<br/>Key: github-tree:{owner}/{repo}/{branch}

    alt Cache miss
        Redis-->>API: null
        API->>GitHub: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
        GitHub-->>API: GitHubTreeResponse<br/>{sha, tree: [{path, type, size}]}
        API->>Redis: Cache tree data
    else Cache hit
        Redis-->>API: GitHubTreeResponse
    end

    Note over API,Builder: Build city data from tree

    API->>Builder: getFilesFromGitHubTree(tree)
    Builder-->>API: FileInfo[]

    API->>Builder: buildFileSystemTreeFromFileInfoList(files)
    Builder-->>API: FileTree

    API->>Builder: CodeCityBuilderWithGrid.buildCityFromFileSystem(fileTree)
    Builder-->>API: CityData<br/>{buildings, districts, bounds, metadata}

    Note over API,Renderer: Render city to PNG with highlights

    API->>Renderer: renderFileCityPng({<br/>  cityData,<br/>  width: 800,<br/>  height: 800,<br/>  highlightFiles: [{path, status}]<br/>})

    Note over Renderer: Create canvas (800x800)
    Renderer->>Renderer: createDrawContext(cityData, padding)
    Renderer->>Renderer: drawDistricts(districts, context)
    Renderer->>Renderer: drawBuildings(buildings, context,<br/>changedFilesMap)
    Note over Renderer: Buildings with changed files<br/>rendered with highlight colors

    Renderer-->>API: PNG Buffer

    API->>Client: Response<br/>Content-Type: image/png<br/>Cache-Control: public, max-age=3600

    Note over Client: Displays PNG in <Image> component
```

## Key Points

### 1. **Server Has Full City Data**
The server builds complete `CityData` (buildings, districts, bounds) before rendering:
```typescript
const cityData = builder.buildCityFromFileSystem(fileTree, '');
// cityData.buildings: CityBuilding[]
// cityData.districts: CityDistrict[]
// cityData.bounds: { minX, maxX, minZ, maxZ }
```

### 2. **Commit Highlighting**
When `?commit=sha` is provided:
- Fetches commit details from GitHub API
- Extracts list of changed files with status
- Creates `changedFilesMap`: `Map<path, 'added'|'modified'|'deleted'>`
- Renderer uses this map to color buildings differently

### 3. **What Could Be Returned as JSON**
Instead of rendering to PNG, the endpoint could return:
```typescript
{
  cityData: CityData,              // Already built!
  highlightFiles: Array<{          // Already extracted!
    path: string,
    status: 'added' | 'modified' | 'removed'
  }>,
  treeSha: string,
  truncated: boolean
}
```

### 4. **Mobile App Already Has the Same Builder**
The mobile app (`FileCityService.ts`) uses the **exact same** `CodeCityBuilderWithGrid`:
```typescript
// Same imports as server
import { CodeCityBuilderWithGrid } from '@principal-ai/file-city-builder';

// Same build process
const builder = new CodeCityBuilderWithGrid();
const cityData = builder.buildCityFromFileSystem(fileTree, '');
```

## Current vs Potential Flow

### Current: Image-Based
```
Mobile → /file-city → GitHub Tree → Build City → Render PNG → Return Image
                    ↓
                  Redis Cache
```

### Potential: Data-Based
```
Mobile → /file-city-data → GitHub Tree → Build City → Return JSON
                         ↓
                       Redis Cache

Mobile builds highlight layer from commit file list
Mobile renders with FileCityCanvas (already exists)
```

## Performance Comparison

| Aspect | Current (PNG) | Potential (JSON + Canvas) |
|--------|--------------|---------------------------|
| **Bandwidth** | ~50-200KB per image | ~20-100KB JSON (one-time) |
| **Server CPU** | PNG encoding per request | JSON serialization |
| **Client CPU** | Image decode | Canvas rendering |
| **Caching** | Per width/height/commit | City data reusable |
| **Interactivity** | None | Full zoom/pan |
| **Commit switching** | New image per commit | Update highlight layer only |

## Proposed Alternative: JSON Data Flow

```mermaid
sequenceDiagram
    participant Client as Mobile App<br/>(MobileRepoCard)
    participant API as /api/file-city-data<br/>[owner]/[repo]<br/>(new endpoint)
    participant GitHub as GitHub API
    participant Redis as Redis Cache
    participant Builder as CodeCityBuilder
    participant Canvas as FileCityCanvas<br/>(React Native Skia)

    Note over Client,Canvas: One-time city data fetch per repo

    Client->>API: GET /file-city-data/owner/repo

    API->>Redis: Check tree cache
    Redis-->>API: GitHubTreeResponse (or null)

    alt Cache miss
        API->>GitHub: GET tree
        GitHub-->>API: TreeResponse
    end

    API->>Builder: Build city data
    Builder-->>API: CityData

    API->>Client: JSON Response<br/>{cityData, treeSha, truncated}

    Note over Client: Store city data in state<br/>(reused for all commits)

    loop For each commit in carousel
        Note over Client: User swipes to next commit

        Client->>Client: Check if commit details cached

        alt Not cached
            Client->>GitHub: GET /repos/owner/repo/commits/sha
            GitHub-->>Client: CommitDetails<br/>{files: [{filename, status}]}
        end

        Client->>Client: Build highlight layer:<br/>HighlightLayer {<br/>  items: files.map(f => ({<br/>    path: f.filename,<br/>    type: 'file',<br/>    renderStrategy: 'border'<br/>  }))<br/>}

        Client->>Canvas: Render with:<br/>cityData (same)<br/>highlightLayers (updated)

        Note over Canvas: GPU-accelerated render<br/>Zoom/Pan enabled<br/>Interactive
    end
```

## Comparison: Data Payloads

### Current PNG Approach (per commit)
```json
Request:  GET /file-city/owner/repo?commit=abc123&width=800&height=800
Response: [Binary PNG Data: ~100-200KB]

Request:  GET /file-city/owner/repo?commit=def456&width=800&height=800
Response: [Binary PNG Data: ~100-200KB]

Request:  GET /file-city/owner/repo?commit=ghi789&width=800&height=800
Response: [Binary PNG Data: ~100-200KB]
```

**Total for 3 commits: ~300-600KB**

### Proposed JSON Approach (once + commit details)
```json
// One-time city data fetch
Request:  GET /file-city-data/owner/repo
Response: {
  "cityData": {
    "buildings": [...],     // ~50-100 buildings typical
    "districts": [...],     // ~10-20 districts
    "bounds": {...},
    "metadata": {...}
  },
  "treeSha": "abc123...",
  "truncated": false
}
// Size: ~20-80KB (depends on repo size)

// Commit details (likely already cached from card data)
Request:  GET /repos/owner/repo/commits/abc123
Response: {
  "files": [
    {"filename": "src/App.tsx", "status": "modified"},
    {"filename": "src/utils.ts", "status": "added"}
  ]
}
// Size: ~1-5KB per commit

// Subsequent commits just need file list
Request:  GET /repos/owner/repo/commits/def456
Response: { "files": [...] }  // ~1-5KB

Request:  GET /repos/owner/repo/commits/ghi789
Response: { "files": [...] }  // ~1-5KB
```

**Total for 3 commits: ~23-95KB (70-85% reduction)**

## Next Steps Options

### Option A: New Data Endpoint (Recommended)
Create `/api/file-city-data/[owner]/[repo]` that returns JSON instead of PNG.

**Pros:**
- Clean separation of concerns
- Can cache independently of images
- Mobile has full control over rendering
- Enables interactivity (zoom/pan)
- Reduces bandwidth for multi-commit cards

**Cons:**
- Need to create new endpoint
- Mobile needs to build highlight layers

### Option B: Extend Tree Endpoint
The `/github/repo/[owner]/[repo]?action=tree` endpoint could include city data in response.

**Pros:**
- Reuses existing endpoint
- No new route needed

**Cons:**
- Mixes concerns (tree data + city layout)
- Larger payload for clients who just want tree

### Option C: Client-Side Only (Current Mobile)
Mobile already fetches tree and builds city. Just needs commit file list for highlights.

**Pros:**
- No server changes needed
- Mobile has full control

**Cons:**
- Client does all the work (tree fetch + build)
- Slower initial load
- No server-side caching benefits
