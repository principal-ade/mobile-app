# iPad Profile Layouts - Desktop Pattern Reference

This document outlines the desktop app's profile panel layouts to guide iPad implementation.

## Common Layout Pattern (User & Org Profiles)

All profile panels follow a similar structure that works well for iPad:

```
┌─────────────────────────────────────────┐
│     Activity Heatmap Banner (170px)     │ ← Fixed height
├─────────────────────────────────────────┤
│  ╭─────╮  Stats Row                     │
│  │     │  • Commits/Projects/etc        │ ← Fixed header, no scroll
│  │ AVA │  • Followers/Following/etc     │   Avatar overlaps with
│  │ TAR │  • Members (orgs)              │   marginTop: -60
│  ╰─────╯                                 │
│  Name / Username / Bio / Links          │
├─────────────────────────────────────────┤
│                                          │
│  Popular Repositories (Scrollable)      │ ← Scrollable content
│  ┌──────────┐ ┌──────────┐              │
│  │ Repo 1   │ │ Repo 2   │              │
│  │ [3D viz] │ │ [3D viz] │              │
│  └──────────┘ └──────────┘              │
│                                          │
└─────────────────────────────────────────┘
```

---

## 1. UserProfilePanel Layout

**File**: `desktop-app/electron-app/src/renderer/panels/UserProfilePanel.tsx`

### Structure

```jsx
<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

  {/* 1. ACTIVITY HEATMAP BANNER - Fixed */}
  <div style={{ height: 170, flexShrink: 0 }}>
    <ActivityHeatmap bannerHeight={170} />
  </div>

  {/* 2. PROFILE HEADER - Fixed, overlapping banner */}
  <div style={{ padding: 16, marginTop: -60, flexShrink: 0 }}>

    {/* Avatar + Stats Row */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>

      {/* Circular Avatar (120x120) */}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',  // Circular for users
        border: '4px solid background',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }} />

      {/* Stats */}
      <div style={{ flex: 1, display: 'flex', gap: 24 }}>
        <Stat label="commits this year" value={commitsThisYear} />
        <Stat label="projects" value={totalRepos} />
        <Stat label="followers" value={followers} />
        <Stat label="following" value={following} />
      </div>
    </div>

    {/* Name + Username */}
    <h2>{name}</h2>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Github /> @{username}
      {twitterHandle && (
        <>
          <span>•</span>
          <Twitter /> @{twitterHandle}
        </>
      )}
    </div>

    {/* Bio */}
    {bio && <p>{bio}</p>}
  </div>

  {/* 3. REPOSITORIES GRID - Scrollable */}
  <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
    <h3>Popular repositories</h3>
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
      gap: 16
    }}>
      {repositories.map(repo => (
        <RepoCard repo={repo} fileTree={fileTree} />
      ))}
    </div>
  </div>
</div>
```

### Key Measurements

- **Banner height**: 170px
- **Avatar size**: 120x120px
- **Avatar border**: 4px solid
- **Avatar overlap**: `marginTop: -60` (half height)
- **Avatar shape**: Circular (`borderRadius: '50%'`)
- **Stats gap**: 24px (lg spacing)
- **Grid min-width**: 450px per card
- **Grid gap**: 16px

### Stats Order
1. Commits this year (hover highlights current year in heatmap)
2. Projects
3. Followers
4. Following

---

## 2. OrgProfilePanel Layout

**File**: `desktop-app/electron-app/src/renderer/panels/OrgProfilePanel.tsx`

### Differences from UserProfilePanel

Almost identical layout with these key differences:

```jsx
{/* Rounded Square Avatar instead of circular */}
<div style={{
  width: 120,
  height: 120,
  borderRadius: 16,  // ← Rounded square for orgs (vs '50%' for users)
  border: '4px solid background'
}} />

{/* Different Stats */}
<Stat label="projects" value={publicRepos} />
<Stat label="members" value={members} />      // ← Org-specific
<Stat label="commits" value={totalCommits} />
```

### Stats Order
1. Projects
2. Members (instead of followers/following)
3. Commits (total, not "this year")

---

## 3. RepositoryProfilePanel Layout

**File**: `desktop-app/electron-app/src/renderer/panels/RepositoryProfilePanel.tsx`

### Structure (Split View)

```
┌─────────────────────────────────────────┐
│  Activity Heatmap Banner (170px)        │
│  ╭─────╮  Stats + Action Buttons        │  ← Scrollable top section
│  │ AVA │  • Contributors • Commits • Age│     (flex: 0 1 auto)
│  ╰─────╯  [Open] [Delete]               │
│  Repo Name / Description / Languages    │
├─────────────────────────────────────────┤
│  Repository Stats  │  File City 3D      │  ← Fixed bottom section
│  (Left Panel)      │  (Right Panel)     │     (flex: 1)
│  • Total Commits   │  [3D Visualization]│
│  • Last Updated    │                    │
│  • Open Issues     │                    │
│  • Activity •      │                    │
└────────────────────┴────────────────────┘
```

### Code Structure

```jsx
<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

  {/* TOP SECTION - Scrollable profile info */}
  <div style={{ flex: '0 1 auto', overflow: 'auto' }}>

    {/* Heatmap Banner (170px) */}
    <div style={{ height: 170 }}>
      <ActivityHeatmap />
    </div>

    {/* Profile Content with overlap */}
    <div style={{ padding: 16, marginTop: -60 }}>

      {/* Owner Avatar (clickable to view owner profile) */}
      <div style={{
        width: 120,
        height: 120,
        borderRadius: ownerType === 'Organization' ? 12 : '50%',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        hover: { transform: 'scale(1.05)' }
      }} />

      {/* Stats + Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <Stat label="devs" value={contributors} onClick={showContributors} />
          <Stat label="commits" value={totalCommits} />
          <Stat label="old" value={repositoryAge} />
        </div>

        {/* Action buttons (for local repos) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={FolderOpen}>Open</Button>
          <Button icon={Trash2} variant="danger">Delete</Button>
        </div>
      </div>

      {/* Repo Name, Description, Languages */}
      <h2>{repoName}</h2>
      <p>{description}</p>
      <LanguageBadges languages={languages} />
    </div>
  </div>

  {/* BOTTOM SECTION - Split view (Stats | File City 3D) */}
  <div style={{
    flex: 1,
    display: 'flex',
    gap: 16,
    padding: 16,
    overflow: 'hidden'
  }}>

    {/* Left: Repository Stats */}
    <section style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <h4>Repository Stats</h4>

      <div>Total Commits: {totalCommits}</div>
      <div>Last Updated: {updatedAt}</div>
      <div>Open Issues: {openIssues}</div>

      {/* Activity Indicator */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'green'
        }} />
        Active repository
      </div>
    </section>

    {/* Right: File City 3D */}
    <div style={{
      flex: 1,
      height: '100%',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      <FileCity3D
        cityData={cityData}
        width="100%"
        height="100%"
        showControls={true}
      />
    </div>
  </div>
</div>
```

### Key Measurements

- **Top section**: `flex: 0 1 auto` (auto-sized, scrollable)
- **Bottom section**: `flex: 1` (fills remaining space, fixed height)
- **Bottom split**: Two columns, each `flex: 1` (50/50 split)
- **Avatar click**: Opens owner profile (transform: scale(1.05) on hover)
- **Contributors stat**: Clickable, toggles contributors list

### Stats Order
1. Devs (contributors, clickable)
2. Commits
3. Old (repository age)

---

## Common UI Patterns

### Spacing System
```typescript
spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
}
```

### Avatar Styles
```typescript
// User Avatar
{
  borderRadius: '50%',  // Circular
  width: 120,
  height: 120,
  border: '4px solid background',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
}

// Organization Avatar
{
  borderRadius: 16,     // Rounded square
  // ... same other styles
}

// Fallback (no image)
{
  backgroundColor: 'primary + 20% opacity',
  display: initials,
  fontSize: 40,
  fontWeight: 600
}
```

### Stats Component Pattern
```typescript
<div style={{ textAlign: 'center' }}>
  <div style={{ fontSize: 18, fontWeight: 600 }}>
    {formatNumber(value)}  // 1.2k, 3.4m formatting
  </div>
  <div style={{ fontSize: 11, color: 'textSecondary' }}>
    {label}
  </div>
</div>
```

### Activity Heatmap
- **Height-responsive**: Square size = `(bannerHeight - padding) / 7 - gap`
- **7 rows**: Days of week (Sun-Sat)
- **Columns**: Weeks, scrollable horizontally
- **Month labels**: On first day of each month
- **Color intensity**: Based on commit count
- **Hover**: Shows date + commit count
- **Current year highlight**: Outline when hovering "commits this year" stat

### Repository Grid
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
gap: 16px;
```

**For iPad adaptation**: Change min-width based on screen size:
- iPad (landscape): `minmax(450px, 1fr)` → 2 columns
- iPad (portrait): `minmax(100%, 1fr)` → 1 column

---

## Adaptation Notes for React Native

### Layout Translation

**Desktop CSS** → **React Native**

```jsx
// Desktop
<div style={{
  display: 'flex',
  flexDirection: 'column',
  height: '100%'
}}>

// React Native
<View style={{
  flex: 1,
  flexDirection: 'column'
}}>

// Desktop Grid
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))'
}}>

// React Native (use FlatList with numColumns or custom grid)
<FlatList
  data={repositories}
  numColumns={isTablet ? 2 : 1}
  columnWrapperStyle={{ gap: 16 }}
/>
```

### Activity Heatmap
- Desktop uses CSS Grid with scrollable overflow
- React Native: Use `ScrollView` horizontal with `flexDirection: 'row'`
- Square sizing: Calculate based on available height

### File City 3D
- Desktop: Uses `@principal-ai/file-city-ui` with WebGL
- Mobile: Already implemented in `src/components/FileCity/FileCityCanvas.tsx`
- Works with Three.js via Expo GL

### Overlapping Avatar
```jsx
// Desktop
<div style={{ marginTop: -60 }}>

// React Native
<View style={{ marginTop: -60 }}>
// Works the same!
```

### Responsive Grid
```typescript
const isTablet = useIsTablet();
const columns = isTablet ? 2 : 1;

<FlatList
  data={repositories}
  numColumns={columns}
  key={columns} // Important: remount when columns change
/>
```

---

## Implementation Priority

For iPad, implement in this order:

1. **UserProfilePanel** - Core layout pattern, most common
2. **OrgProfilePanel** - Slight variation (reuse 95% of User layout)
3. **RepositoryProfilePanel** - More complex split view

### Shared Components to Build

1. `ActivityHeatmap` - Reusable across all profiles
2. `ProfileHeader` - Avatar + stats pattern
3. `StatItem` - Number + label display
4. `RepoCard` - Grid item with File City preview
5. `ProfileLayout` - Container with banner + overlapping header

---

## Desktop Files Reference

```
desktop-app/electron-app/src/renderer/panels/
├── UserProfilePanel.tsx           (835 lines)
├── OrgProfilePanel.tsx            (748 lines)
├── RepositoryProfilePanel.tsx     (1192 lines)
└── RepoCard.tsx                   (150 lines)
```

## Current Mobile Files to Adapt

```
mobile-app/src/screens/
├── UserProfileScreen.tsx          (Update for iPad layout)
└── OrganizationScreen.tsx         (Update for iPad layout)

mobile-app/src/components/
├── FileCity/FileCityCanvas.tsx    (Already works for 3D viz)
└── MobileRepoCard.tsx             (Adapt for grid layout)
```
