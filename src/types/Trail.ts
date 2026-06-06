/**
 * Trail types.
 *
 * Ported from `industry-themed-file-city-panels/src/types/Trail.ts`. These
 * types will eventually live in a centralized principal-view core package;
 * this is a working copy until that consolidation happens. Keep the shapes
 * in lock-step with the web copy — drift here will hurt when the merge lands.
 *
 * Trails are a new authored-walkthrough medium that ships parallel to the
 * existing sequence-diagram stack. The only shared point of contact is the
 * upstream `SequenceDiagramRenderer`, which the `views[].kind:'sequence'`
 * renderer feeds at render time.
 *
 * See `industry-themed-file-city-panels/docs/TRAIL_DESIGN.md` for the full
 * design — particularly the "Coexistence with sequence diagrams" and
 * "Addressing markers across repos and time" sections.
 *
 * v1 ships:
 * - `TrailPayload` shape, including the `repos[]` registry and provenance
 * - `TrailMarker` content fields (sourcePath, snippet, description)
 * - `TrailSliceSnippet` and `TrailDiffSnippet`
 * - `TrailView` discriminated union (only `kind:'sequence'` has a registered
 *   renderer in v1; other kinds are declared so the schema is committed)
 * - Notes anchored to marker ids (snippet anchors, markdown anchors, and
 *   anchor-free marker comments)
 *
 * v1 explicitly does NOT ship (all non-breaking future additions):
 * - Per-marker time pin (`marker.at`)
 * - Baked slice content (`TrailSliceSnippet.contents`)
 * - Two-sided historic diffs (`TrailDiffSnippet.oldRef` / `newRef`)
 * - File-rename archeology for File City highlight
 */

// Local placeholders until the centralized core package lands. The web copy
// pulls `Purl` from `@principal-ai/alexandria-core-library` and `SequenceEdge`
// from `@principal-ai/principal-view-react`; neither is a mobile-app dep yet.
export type Purl = string;
export interface SequenceEdge {
  from: string;
  to: string;
  kind?: string;
  label?: string;
}

// ============================================================================
// Repo registry — portable identity + provenance
// ============================================================================

export interface TrailRepo {
  /**
   * Canonical repo identity, encoded as a Package URL (PURL).
   * Globally unique by construction, stable across repo renames as long
   * as remote redirects exist.
   */
  id: Purl;

  /** Human label for picker UIs and overlays. */
  name: string;

  /** Remote location — meaningful on any machine. */
  remote?: {
    host: 'github' | 'gitlab' | 'bitbucket' | 'other';
    owner: string;
    name: string;
  };

  /** The commit this trail was authored against. */
  authoredAtSha?: string;

  /** Branch/tag at author time — for human display. */
  authoredAtRef?: string;

  /** Future hydration baseline. v1 consumers ignore this. */
  defaultRef?: string;
}

// ============================================================================
// Snippets — slice and diff variants
// ============================================================================

export interface TrailSliceSnippet {
  kind: 'slice';
  /** First line of the snippet (1-based, inclusive). */
  startLine: number;
  /** Last line of the snippet (1-based, inclusive). */
  endLine: number;
  /** Line to highlight as the focus point. Defaults to `startLine`. */
  focusLine?: number;
  /** Lines of context above/below the snippet. Defaults to 2. */
  contextLines?: number;
}

export interface TrailDiffSnippet {
  kind: 'diff';
  /** Pre-change file contents. */
  oldContents: string;
  /** Post-change file contents. Resolver fills when omitted. */
  newContents?: string;
  /** 1-based inclusive. */
  startLine: number;
  /** 1-based inclusive. */
  endLine: number;
  /** 1-based line to focus on. */
  focusLine?: number;
  /** Defaults to 2. */
  contextLines?: number;
  diffStyle?: 'unified' | 'split';
  language?: string;
  /** Forward-compat scaffolding for two-sided historic diffs. */
  gitRef?: { sha: string; path: string; branch?: string };
}

export type TrailMarkerSnippet = TrailSliceSnippet | TrailDiffSnippet;

// ============================================================================
// Marker — view-agnostic content
// ============================================================================

export interface TrailMarker {
  /** Stable id referenced by views and notes. */
  id: string;
  /** Display label. */
  label?: string;
  /** Which `TrailRepo.id` this marker is anchored to. */
  repo?: Purl;
  /** Path within the marker's repo (repo-relative, never absolute). */
  sourcePath?: string;
  /** Slice or diff snippet rendered inline. */
  snippet?: TrailMarkerSnippet;
  /** Markdown description for the left-edge overlay. */
  description?: string;
  /** Special role this marker plays on the trail. */
  kind?: TrailMarkerKind;
}

/**
 * Marker role discriminator. Most markers have no kind set and are
 * just regular stops; `'subject'` is the load-bearing marker on an
 * investigation trail.
 */
export type TrailMarkerKind = 'subject';

// ============================================================================
// Views — how to render the markers
// ============================================================================

export interface SequenceMarkerRef {
  /** Foreign key into `TrailPayload.markers[].id`. */
  markerId: string;
  /** Dotted namespaced identifier — first segment becomes the default lane. */
  name: string;
  /** Lane bucket override. */
  participant?: string;
  /** Whether this marker crosses participant boundaries. */
  moveEvent?: boolean;
  /** Optional event type for styling. */
  type?: string;
}

export interface SequenceViewLayout {
  /** Resolved namespaces in left-to-right order. */
  laneOrder?: string[];
}

export type TrailView =
  | TrailSequenceView
  | TrailLinearView
  | TrailGraphView
  | TrailTreeView
  | TrailTimelineView;

export interface SequenceViewActor {
  /** Lane id — namespace string just like `SequenceMarkerRef.name`. */
  name: string;
  /** Display label; defaults to last namespace segment of `name`. */
  label?: string;
}

export interface TrailSequenceView {
  kind: 'sequence';
  markers: SequenceMarkerRef[];
  edges: SequenceEdge[];
  actors?: SequenceViewActor[];
  layout?: SequenceViewLayout;
}

export interface TrailLinearView {
  kind: 'linear';
  /** Marker ids in display order. Defaults to `payload.markers[]` order. */
  order?: string[];
}

export interface TrailGraphView {
  kind: 'graph';
  nodes: unknown[];
  edges: unknown[];
  layout?: unknown;
}

export interface TrailTreeView {
  kind: 'tree';
  /** `parent[childMarkerId]` = parent marker id, or `null` for roots. */
  parent: Record<string, string | null>;
}

export interface TrailTimelineView {
  kind: 'timeline';
  /** `at[markerId]` = ISO 8601 timestamp. */
  at: Record<string, string>;
}

// ============================================================================
// Notes — anchored to snippet lines or markdown selections
// ============================================================================

export interface TrailSliceRange {
  startLine: number;
  endLine: number;
  startLineText: string;
  endLineText: string;
}

export interface TrailSnippetSliceAnchor {
  kind: 'slice';
  ranges: TrailSliceRange[];
}

export interface TrailSnippetDiffAnchor {
  kind: 'diff';
  side: 'deletions' | 'additions';
  lineNumber: number;
}

export interface TrailSnippetNote {
  id: string;
  kind: 'snippet';
  scope: { markerId: string };
  anchor: TrailSnippetSliceAnchor | TrailSnippetDiffAnchor;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrailMarkdownTextQuoteAnchor {
  kind: 'text-quote';
  exact: string;
  prefix?: string;
  suffix?: string;
}

export type TrailMarkdownNoteScope =
  | { kind: 'description'; markerId: string }
  | { kind: 'summary' };

export interface TrailMarkdownNote {
  id: string;
  kind: 'markdown';
  scope: TrailMarkdownNoteScope;
  anchor: TrailMarkdownTextQuoteAnchor;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A free-text comment pinned to a marker — no code/text anchor. The
 * simplest note kind, and the only one authored on mobile (snippet and
 * markdown notes need a selection UI). Mirrors the web `TrailMarkerNote`.
 */
export interface TrailMarkerNote {
  id: string;
  kind: 'marker';
  scope: { markerId: string };
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export type TrailNote = TrailSnippetNote | TrailMarkdownNote | TrailMarkerNote;

export type TrailNoteDraft =
  | Omit<TrailSnippetNote, 'id' | 'createdAt' | 'updatedAt'>
  | Omit<TrailMarkdownNote, 'id' | 'createdAt' | 'updatedAt'>
  | Omit<TrailMarkerNote, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// Sign-offs — multi-reviewer LGTM stamps
// ============================================================================

export interface TrailSignOff {
  id: string;
  author: string;
  /** ISO 8601 — set at write time by the host. */
  signedAt: string;
  comment?: string;
}

export type TrailSignOffDraft = Omit<TrailSignOff, 'id' | 'signedAt'>;

// ============================================================================
// Payload — the shape both hosts produce, persist, and consume
// ============================================================================

/**
 * The three states of being a trail can occupy.
 * `investigation` and `changelog` are ephemeral work-in-progress;
 * `informative` is the durable form.
 */
export type TrailPurpose = 'investigation' | 'changelog' | 'informative';

export interface TrailShare {
  /** Opaque share id. Presence flags the trail as *shared*. */
  id: string;
}

export interface TrailPayload {
  id: string;
  title: string;
  /** Defaults to `'investigation'` when omitted. */
  purpose?: TrailPurpose;
  /** Presence flags the trail as *shared*. */
  share?: TrailShare;
  summary?: string;
  /** Optional Mermaid diagram source for the trail brief. */
  diagram?: string;
  /** Short verb phrase naming what the producer wants from the reader. */
  request?: string;
  /** Repo registry. Optional for single-repo trails. */
  repos?: TrailRepo[];
  /** Single-repo provenance shorthand. */
  authoredAt?: { sha: string; ref?: string };
  /** Display name of the trail author. */
  author?: string;
  markers: TrailMarker[];
  views: TrailView[];
  notes?: TrailNote[];
  signOffs?: TrailSignOff[];
  visitors?: {
    named: string[];
    anonymousCount: number;
  };
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

// ============================================================================
// Index entry — base shape for picker / list UIs
// ============================================================================

export interface BaseTrailIndexEntry {
  id: string;
  title: string;
  summaryPreview: string;
  markerCount: number;
  repoNames: string[];
  hasDiffSnippets: boolean;
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
}
