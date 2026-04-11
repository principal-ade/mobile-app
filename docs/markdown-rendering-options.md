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

## Decision Required

- [ ] Confirm markdown-display as primary choice
- [ ] Review theme integration requirements
- [ ] Determine if we need syntax highlighting
- [ ] Decide on link handling (open in browser vs in-app)
