# Markdown Rendering Options for Expo

**Date**: 2026-04-10
**Status**: Research & Evaluation

## Current State

We currently display markdown content as plain text in `DocumentScreen` (src/screens/DocumentScreen.tsx:77). We need a proper markdown renderer to display formatted content from GitHub files.

## Available Options

### 1. react-native-markdown-display (Recommended)

**Package**: `react-native-markdown-display`

**Pros**:
- 100% CommonMark compatible
- No native dependencies (works with Expo Go)
- Highly customizable styles
- Good TypeScript support
- Popular and well-maintained
- Easy integration with existing code

**Cons**:
- Slightly larger bundle size than minimal solutions

**Best For**: Displaying markdown content from external sources (our use case)

**Installation**:
```bash
npm install react-native-markdown-display
```

**Example Usage**:
```tsx
import Markdown from 'react-native-markdown-display';

<Markdown style={customStyles}>
  {content}
</Markdown>
```

---

### 2. react-native-enriched-markdown

**Package**: `react-native-enriched-markdown`

**Pros**:
- Officially recommended by Expo documentation
- By Software Mansion Labs (reputable)
- Supports iOS, Android, macOS
- Renders as native text
- Includes rich text input component
- Recently updated (active maintenance)

**Cons**:
- Requires New Architecture (Fabric)
- May be overkill if we only need display (not editing)

**Best For**: Apps using New Architecture that need both display and editing

**Installation**:
```bash
npx expo install react-native-enriched-markdown
```

---

### 3. react-native-marked

**Package**: `react-native-marked`

**Pros**:
- Powered by marked.js (battle-tested parser)
- Lightweight and performant
- Simple API
- FlatList support for large documents

**Cons**:
- Less customization than markdown-display
- Smaller community

**Best For**: Simple markdown rendering with minimal configuration

**Installation**:
```bash
npm install react-native-marked
```

---

### 4. @docren/react-native-markdown

**Package**: `@docren/react-native-markdown`

**Pros**:
- Powered by MDAST (Markdown Abstract Syntax Tree)
- Highly flexible and performant
- Custom styling and extendable render rules
- Recently updated (January 2026)

**Cons**:
- More complex API
- Less documentation/examples

**Best For**: Advanced use cases requiring custom markdown extensions

**Installation**:
```bash
npm install @docren/react-native-markdown
```

---

### 5. react-native-live-markdown

**Package**: `react-native-live-markdown`

**Pros**:
- Live markdown formatting while typing
- Drop-in TextInput replacement
- Great editing experience

**Cons**:
- **Does NOT support Expo Go** - requires Expo Dev Client
- Focused on editing, not display
- Native code dependencies

**Best For**: Markdown editing (not our current use case)

---

## Recommendation

**Primary Recommendation**: `react-native-markdown-display`

**Reasoning**:
1. Works with Expo Go (no build required)
2. Well-established and maintained
3. Easy to integrate into existing DocumentScreen
4. Fully customizable to match our theme
5. No New Architecture requirement
6. CommonMark compliant

**Alternative**: If we migrate to New Architecture in the future, consider `react-native-enriched-markdown` for the official Expo support and Software Mansion backing.

---

## Implementation Plan

### Phase 1: Basic Integration
1. Install `react-native-markdown-display`
2. Replace `<Text>{content}</Text>` in DocumentScreen with `<Markdown>{content}</Markdown>`
3. Test with existing markdown files

### Phase 2: Theme Integration
1. Create custom styles matching our theme system
2. Configure syntax highlighting for code blocks
3. Handle link rendering and navigation

### Phase 3: Optimization
1. Add loading states for images
2. Test with large documents
3. Implement caching if needed

---

## Resources

- [Expo Rich Text Documentation](https://docs.expo.dev/guides/editing-richtext/)
- [react-native-markdown-display GitHub](https://github.com/jonasmerlin/react-native-markdown-display)
- [react-native-enriched-markdown GitHub](https://github.com/software-mansion-labs/react-native-enriched-markdown)
- [react-native-marked GitHub](https://github.com/gmsgowtham/react-native-marked)
- [@docren/react-native-markdown npm](https://www.npmjs.com/package/@docren/react-native-markdown)
- [react-native-live-markdown GitHub](https://github.com/Expensify/react-native-live-markdown)

---

## Repo Profile Page Integration

### Context
Currently, when users tap on a repo card (RepositoryListScreen or StarredRepoCard), they either see a file browser or navigate to specific screens. We want to create dedicated repo profile pages that display:

1. Repo metadata (name, description, stars, language, topics)
2. Rendered README content
3. Quick actions (browse files, view File City, open in GitHub)

### Design Approaches

#### Option A: Dedicated RepoProfileScreen
Create a new screen that becomes the primary destination when tapping a repo card.

**Pros**:
- Clean separation of concerns
- Full screen real estate for README
- Easy to add tabs (README, Files, Activity, etc.)
- Can show comprehensive repo info at top

**Cons**:
- Adds another navigation layer
- Requires new screen component

**Navigation Flow**:
```
RepoCard → RepoProfileScreen (README + metadata) → FilesBrowser/FileCity
```

#### Option B: Bottom Sheet README Preview
Show README in an expandable bottom sheet, similar to the current file browser.

**Pros**:
- Maintains current navigation patterns
- Quick preview without full navigation
- Can keep context of repo list visible

**Cons**:
- Limited screen space for long READMEs
- May feel cramped on smaller devices

#### Option C: Enhanced Repo Cards
Expand repo cards to show README preview inline (collapsed by default).

**Pros**:
- No navigation required
- Fast access to README snippets
- Good for scanning multiple repos

**Cons**:
- Can make list feel cluttered
- Performance concerns with many expanded cards
- Limited space for full README

### Recommended: Option A - Dedicated RepoProfileScreen

**Reasoning**:
1. Provides best reading experience for markdown content
2. Aligns with GitHub's repo page concept (familiar UX)
3. Extensible - can add more tabs/sections later (Issues, PRs, etc.)
4. Works well with the markdown renderer's need for space

### Implementation Considerations

#### 1. README Fetching Strategy
```typescript
// In GithubService.ts
export async function fetchRepoReadme(
  token: string,
  owner: string,
  repo: string
): Promise<string> {
  // GitHub API endpoint: GET /repos/{owner}/{repo}/readme
  // Returns README in various formats (raw, html, etc.)
}
```

**Caching Strategy**:
- Cache README content with repo metadata
- Invalidate on repo refresh/pull-to-refresh
- Consider storing in AsyncStorage for offline access

#### 2. Fallback Handling
Not all repos have READMEs. Handle gracefully:
```typescript
if (!readme) {
  return <EmptyState message="No README available" />;
}
```

#### 3. README File Detection
GitHub's API returns the canonical README (README.md, readme.txt, etc.). Use the API endpoint rather than searching manually.

#### 4. Markdown Renderer Configuration
For repo profiles, customize the renderer:
```typescript
const repoReadmeStyles = {
  // Larger headings for repo titles
  heading1: { fontSize: 24, fontWeight: 'bold', marginTop: 20 },

  // Code blocks with syntax highlighting
  code_block: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: 12,
    borderRadius: 8
  },

  // Clickable links (open in browser or in-app)
  link: { color: theme.colors.primary },

  // Responsive images
  image: { maxWidth: '100%', borderRadius: 8 }
};
```

#### 5. Performance Optimization
- Lazy load images in README
- Use FlatList/ScrollView with good performance
- Consider limiting initial render to first N paragraphs with "Show more" button for very long READMEs

#### 6. Navigation Integration
Update navigation types to include RepoProfile:
```typescript
// AboutStackParamList
type AboutStackParamList = {
  // ... existing routes
  RepoProfile: {
    owner: string;
    repo: string;
    repoData?: GitHubRepository | StarredRepo;
  };
};
```

Update both RepositoryListScreen and StarredRepoCard to navigate to RepoProfile:
```typescript
onPress={() => navigation.navigate('RepoProfile', {
  owner: repo.owner.login,
  repo: repo.name,
  repoData: repo
})}
```

#### 7. Screen Layout Structure
```tsx
<RepoProfileScreen>
  <Header>
    <RepoMetadata /> {/* Name, stars, language, topics */}
    <QuickActions /> {/* Browse Files, File City, Open in GitHub */}
  </Header>

  <TabView> or <ScrollView>
    <ReadmeTab>
      <Markdown style={repoReadmeStyles}>
        {readmeContent}
      </Markdown>
    </ReadmeTab>

    {/* Future: Files tab, Activity tab, etc. */}
  </TabView>
</RepoProfileScreen>
```

### Phase Approach

**Phase 1**: Basic repo profile screen with README
1. Create RepoProfileScreen component
2. Implement README fetching in GithubService
3. Add navigation from repo cards
4. Integrate react-native-markdown-display
5. Test with various repos (with/without README)

**Phase 2**: Enhanced experience
1. Add custom markdown styles matching theme
2. Implement link handling (internal/external)
3. Add syntax highlighting for code blocks
4. Implement caching strategy
5. Add pull-to-refresh

**Phase 3**: Additional features
1. Add quick actions (browse files, File City, open in browser)
2. Consider tabs for different sections
3. Add share functionality
4. Offline support with cached READMEs

---

## Decision Required

- [x] ~~Confirm markdown-display as primary choice~~ - **Rejected** (see implementation learnings below)
- [x] ~~Decide on repo profile page approach (A, B, or C)~~ - **Simplified to button in header**
- [x] Review theme integration requirements - **WebView with GitHub CSS**
- [ ] Determine if we need syntax highlighting
- [ ] Decide on link handling (open in browser vs in-app)
- [ ] Define README caching strategy

---

## Implementation Learnings (2026-04-12)

**Status**: ✅ **Implemented** using WebView + GitHub HTML API

### What We Tried

We attempted to implement README rendering using pure React Native markdown libraries, but encountered fundamental limitations with GitHub READMEs:

#### Attempt 1: react-native-markdown-display
- **Issue**: Only renders pure markdown, cannot handle HTML tags
- **Problem**: GitHub READMEs contain HTML like `<p align="center">`, `<picture>`, `<source>`, badges, etc.
- **Result**: HTML tags were either ignored or broke rendering

#### Attempt 2: react-native-marked
- **Issue**: Same HTML limitation as markdown-display
- **Additional Problem**: White background persisted despite theme color overrides
- **Result**: Rejected due to inability to handle HTML and styling issues

#### Attempt 3: react-native-markdown-renderer
- **Issue**: Same HTML handling problems
- **Result**: Rejected for same reasons as above

### The Core Problem

**GitHub Flavored Markdown (GFM) is not pure markdown.** GitHub READMEs commonly include:
- HTML alignment tags (`<p align="center">`)
- Responsive images (`<picture>`, `<source>`)
- Custom badges and buttons
- Embedded HTML for layout control

**React Native markdown libraries cannot render arbitrary HTML** because:
1. They convert markdown to React Native components (Text, View, etc.)
2. They don't have HTML parsers or DOM renderers
3. Adding HTML support would require bundling a full HTML-to-RN converter

### The Solution: WebView + GitHub HTML API

Instead of converting markdown ourselves, we let GitHub do the work:

```typescript
// 1. Fetch pre-rendered HTML from GitHub
const response = await fetch(`${BASE_URL}/repos/${owner}/${repo}/readme`, {
  headers: {
    Accept: 'application/vnd.github.html', // Key: Request HTML, not markdown
    Authorization: `token ${token}`,
  },
});

// 2. Load GitHub's markdown CSS
const htmlContent = `
  <!DOCTYPE html>
  <html data-color-mode="${isDark ? 'dark' : 'light'}">
    <head>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown${isDark ? '-dark' : ''}.min.css">
    </head>
    <body>${readme}</body>
  </html>
`;

// 3. Render in WebView
<WebView
  source={{ html: htmlContent }}
  style={{ backgroundColor: isDark ? '#0d1117' : '#ffffff' }}
/>
```

**Benefits**:
- ✅ Perfect GitHub rendering (it's exactly what GitHub sends)
- ✅ All HTML tags work correctly
- ✅ GitHub's CSS handles all styling
- ✅ Light/dark theme support via GitHub CSS variants
- ✅ No custom markdown parsing needed

**Tradeoffs**:
- ⚠️ Requires network to load GitHub CSS (could bundle CSS locally)
- ⚠️ WebView is heavier than native components
- ⚠️ Less control over individual element styling
- ✅ But: These are acceptable tradeoffs for accurate GitHub rendering

### Implementation Details

**File**: `src/screens/RepoReadmeScreen.tsx`

**Key Decisions**:
1. **GitHub HTML API** (`Accept: application/vnd.github.html`) instead of raw markdown
2. **GitHub Markdown CSS** from CDN for authentic styling
3. **WebView** instead of native React Native components
4. **Dark mode detection** based on theme background color
5. **Minimal custom styling** - let GitHub's CSS do the work

**Navigation**:
- Added README button to `RepoFileCityScreen` header
- No complex wrapper or tabs - simple dedicated screen
- Back button returns to File City view

### Why This Approach is Better

1. **Accuracy**: GitHub renders their own markdown → we get 100% accuracy
2. **Maintainability**: No need to keep up with GFM spec changes
3. **Performance**: GitHub's rendering is pre-computed server-side
4. **Future-proof**: Works with any GitHub README format (MDX, custom HTML, etc.)

### Recommendations for Future

- **For pure markdown content**: React Native libraries work fine (comments, notes, etc.)
- **For GitHub content**: Always use WebView + GitHub HTML API
- **For custom markdown with HTML**: Consider `react-native-render-html` + markdown-to-HTML conversion

### Updated Decision Matrix

| Use Case | Solution | Rationale |
|----------|----------|-----------|
| GitHub READMEs | WebView + GitHub HTML API | Handles HTML, accurate rendering |
| Pure markdown (user content) | react-native-markdown-display | Lightweight, native components |
| Markdown editing | react-native-live-markdown | Built for editing experience |
| Complex HTML documents | react-native-webview | Full HTML/CSS support |

---

## Lessons Learned

1. **Don't fight the platform**: GitHub's HTML is designed for browsers, so use a browser (WebView)
2. **Test with real data early**: We discovered HTML tags by inspecting actual README content
3. **Library descriptions can be misleading**: "Markdown renderer" doesn't mean "GitHub Flavored Markdown with HTML"
4. **WebView is not always heavy**: For document rendering, it's often the right tool
5. **Let the server do the work**: GitHub already renders markdown perfectly, reuse it
