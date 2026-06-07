/**
 * Mobile port of the web `TrailBriefCard` from
 * `industry-themed-file-city-panels/src/panels/FileCityTrailExplorerPanel/overlays/TrailBriefCard.tsx`.
 *
 * Same visual unit: header → Description / Route tab switch → body → footer,
 * plus the REVIEWED BY / NOTES BY avatar strips below. The
 * surrounding modal chrome (backdrop, fade-on-commit) lives elsewhere so
 * this can be rendered standalone (stories, preview screens).
 *
 * V0 scope: faithful visual port. Interactions that the user can tap
 * (eyebrow toggle, tab switch, route stop press, avatar press, expand
 * path, delete / diagram / start) are wired through to handlers /
 * local state, but the host hasn't connected them to navigation yet.
 *
 * Web-only chrome deliberately skipped here:
 *   - drag-to-grow right-edge handle (mouse-only on the web)
 *   - hover tints on buttons / tabs
 *   - CSS transitions (`opacity 180ms`, etc.) — RN would need Animated
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme, type Theme } from '@principal-ade/industry-theme';
import { IndustryMarkdownInline } from '../IndustryMarkdown';
import type {
  TrailMarkerKind,
  TrailMarkerSnippet,
  TrailPurpose,
  TrailSignOff,
} from '../../types/Trail';
import type { TrailFileReader } from '../../services/TrailFileContentService';
import { TrailCodeSnippet } from './TrailCodeSnippet';
import { mixColors, withAlpha } from './colorMix';

/**
 * Kill-switch for the 80×80 sign-off stamp slot in the card header
 * (the dashed `TRAIL UNREVIEWED` placeholder, and the landed-stamp
 * variant when `signedByCurrentUser`). The slot is fully wired but
 * the sign-off flow isn't being used yet. Flip back to `false` when
 * sign-offs land. Mirrors the web card.
 */
const STAMP_SLOT_DISABLED = true;

/**
 * A single reader note, flattened to just what the card renders. The
 * richer `TrailNote` union (snippet vs markdown, anchors, scope) is
 * collapsed by `trailBriefAdapter` — the card only needs author / body
 * / time, plus an optional monospace location caption for snippet notes.
 */
export interface TrailBriefNote {
  id: string;
  author: string;
  /** Markdown note text. */
  body: string;
  /** ISO 8601 — drives the relative "2d ago" stamp. */
  createdAt?: string;
  /**
   * Location caption for snippet notes, e.g. `src/auth/session.ts:12–18`.
   * Absent for markdown notes (their anchor isn't a code location).
   */
  anchorCaption?: string;
}

export interface TrailBriefCardStop {
  id?: string;
  label: string;
  sourcePath?: string;
  /**
   * Marker role from `TrailMarker.kind`. `'subject'` rows underline
   * their label with the eyebrow color to direct the reader's focus.
   */
  kind?: TrailMarkerKind;
  /**
   * Optional marker description. When present, tapping the row expands
   * it inline so the reader can preview the stop's prose without
   * leaving the brief. Rows without a description fall back to the
   * existing `onBeginAtStop` navigation.
   */
  description?: string;
  /**
   * Reader notes anchored to this stop's marker — snippet notes plus
   * any markdown notes scoped to the marker's description. Rendered in
   * the row's expandable region, below the description.
   */
  notes?: TrailBriefNote[];
  /**
   * Code snippet for this stop's marker (slice or diff). When present and
   * the card has a `readFile`, it renders in the row's expandable region
   * below the description/notes.
   */
  snippet?: TrailMarkerSnippet;
}

export interface TrailBriefCardProps {
  /** Markdown body — typically the trail's `summary`. */
  body: string;
  /**
   * Short verb phrase shown as the main heading on shared trails
   * (e.g. `"Verify Direction"`). When unset, the heading falls back
   * to `title`.
   */
  request?: string;
  /** Trail title — used as the card heading when `request` is unset. */
  title: string;
  /** Display name of the trail author. */
  author?: string;
  /** ISO 8601 timestamp the trail was authored. */
  createdAt?: string;
  /** Hidden when 0 or 1 (single-repo trail). */
  repoCount?: number;
  /** Hidden when 0. */
  fileCount?: number;
  /** Stop rundown shown when the Route tab is selected. */
  stops?: TrailBriefCardStop[];
  /** Persisted reviewer LGTMs. */
  signOffs?: TrailSignOff[];
  /** Whether the *current viewer* is one of the signers. */
  signedByCurrentUser?: boolean;
  /**
   * Summary-scoped markdown notes — anchored to the trail summary
   * rather than any single marker. Rendered under the synthetic
   * Overview row (row 00), which already shows the trail body.
   */
  summaryNotes?: TrailBriefNote[];
  /** Display names of distinct note-authors. */
  notedBy?: string[];
  /**
   * Optional `author → markerIds[]` map. Avatars become tappable; tap
   * jumps to the route view filtered to that author's marker-scoped
   * notes.
   */
  notesByAuthor?: Record<string, string[]>;
  /** Whether the trail has an external audience. */
  isShared?: boolean;
  /** Trail's state-of-being tag. Defaults to `'investigation'`. */
  purpose?: TrailPurpose;
  /**
   * Fired whenever the selection changes (row tapped or row deselected).
   * Use this to mirror selection state at the host so the host can
   * render its own bottom panel layout — typically combined with
   * `hideSelectedPanel: true` to suppress the in-card render.
   */
  onSelectionChange?: (selection: TrailBriefSelection) => void;
  /**
   * Suppresses the in-card SelectedStopPanel render. Use when the host
   * is rendering its own panel (e.g. pinned to the bottom of the
   * screen). Selection still tracks internally and the row highlight
   * still updates — only the below-card slot is hidden.
   */
  hideSelectedPanel?: boolean;
  /**
   * Suppresses the cohort strips below the card body — `REVIEWED BY`
   * and `NOTES BY`. Set when the brief is competing for vertical
   * space with other UI.
   */
  hideCohortStrips?: boolean;
  /**
   * Max card width in pixels. Defaults to 640. The card renders at
   * `min(maxWidth, container width)` via flex. Ignored in `'screen'`
   * presentation, which always fills the parent.
   */
  maxWidth?: number;
  /**
   * Expand the selected row inline (sourcePath + description rendered
   * directly underneath the row's label) instead of surfacing them in
   * the below-card SelectedStopPanel. When set, the in-card panel is
   * suppressed even without `hideSelectedPanel`.
   */
  expandInline?: boolean;
  /**
   * Host file reader used to resolve slice-snippet source on demand
   * (GitHub at the trail's authored commit). When omitted, slice snippets
   * render a "no source available" state; diff snippets — which carry
   * their own contents — render regardless.
   */
  readFile?: TrailFileReader;
  /**
   * Viewer's GitHub login. Gates which notes show edit/delete affordances
   * (`note.author === currentUserLogin`). When unset, all notes render
   * read-only.
   */
  currentUserLogin?: string;
  /**
   * Persist a new marker note on a stop. When set (and `expandInline`),
   * expanded stops show a "+ Add note" affordance that opens an inline
   * composer in the row. Resolve to confirm + close the composer; reject
   * to keep it open with an error.
   */
  onCreateNote?: (markerId: string, body: string) => Promise<void>;
  /**
   * Persist an edit to an existing note. Surfaced only on the viewer's
   * own notes — tapping ✎ swaps the note for an inline editor. Same
   * resolve/reject contract as `onCreateNote`.
   */
  onUpdateNote?: (noteId: string, body: string) => Promise<void>;
  /**
   * Delete a note. Surfaced only on the viewer's own notes; the host is
   * expected to confirm before calling through.
   */
  onDeleteNote?: (noteId: string) => void;
  /**
   * Layout preset.
   *
   * - `'modal'` (default): the historical floating card — bordered,
   *   rounded, capped at `maxWidth`, body height bounded between
   *   220–360px, route rendered inside its own `ScrollView`. Designed
   *   to sit on top of another experience (the city/code view on web).
   * - `'screen'`: the brief *is* the screen. Drops the card chrome
   *   (border, radius, max-width), unbounds the body height, and
   *   defers scrolling to the host — the route renders inline and the
   *   description body uses `IndustryMarkdownInline` (no FlatList) so
   *   a wrapping `ScrollView` can drive the scroll.
   */
  presentation?: 'modal' | 'screen';
}

/**
 * Tagged shape for the currently-selected row in the route list. Mirrors
 * the internal `Selection` type — exported so hosts that listen via
 * `onSelectionChange` can pattern-match without re-deriving the union.
 */
export type TrailBriefSelection =
  | { kind: 'overview' }
  | { kind: 'stop'; index: number }
  | null;

type ExplanationSegment = { text: string; bold?: boolean };

interface EyebrowMeta {
  label: string;
  color: string;
  explanation: ExplanationSegment[];
}

/**
 * Hosts that render their own selected-stop panel (e.g. pinned to the
 * screen bottom in `TrailDetailScreen`) can call this to match the
 * trail-purpose-derived eyebrow tint the in-card panel uses.
 */
export function getTrailEyebrowColor(
  theme: Theme,
  purpose: TrailPurpose | undefined,
  signOffsCount: number,
): string {
  return resolveEyebrow(theme, purpose, signOffsCount).color;
}

/**
 * Purpose-derived eyebrow label + tint, for surfaces (e.g. `TrailFeedCard`)
 * that show the trail's state-of-being chip without rendering the full brief.
 */
export function getTrailEyebrow(
  theme: Theme,
  purpose: TrailPurpose | undefined,
  signOffsCount: number,
): { label: string; color: string } {
  const { label, color } = resolveEyebrow(theme, purpose, signOffsCount);
  return { label, color };
}

const resolveEyebrow = (
  theme: Theme,
  purpose: TrailPurpose | undefined,
  signOffsCount: number,
): EyebrowMeta => {
  switch (purpose ?? 'investigation') {
    case 'investigation':
      return {
        label: 'Investigation',
        color: '#a855f7',
        explanation: [
          { text: 'An ' },
          { text: 'Investigation Trail', bold: true },
          { text: ' tracks an open question about the codebase. Promote it once you have an answer, or delete it if the question stopped mattering.' },
        ],
      };
    case 'changelog':
      return {
        label: 'Changelog',
        color: '#f97316',
        explanation: [
          { text: 'A ' },
          { text: 'Changelog Trail', bold: true },
          { text: ' walks reviewers through a recent change. Delete it once the PR is merged — the commit history takes over from there.' },
        ],
      };
    case 'informative': {
      const verified = signOffsCount > 0;
      return verified
        ? {
            label: 'Informative: Verified',
            color: theme.colors.success ?? '#10b981',
            explanation: [
              { text: 'An ' },
              { text: 'Informative Trail', bold: true },
              { text: ' that has been stamped by at least one reviewer. Stamps decay as code shifts, so re-verify if the surrounding files have moved on.' },
            ],
          }
        : {
            label: 'Informative: Unverified',
            color: theme.colors.textTertiary,
            explanation: [
              { text: 'An ' },
              { text: 'Informative Trail', bold: true },
              { text: ' that has not been verified yet. Stamp it once you vouch for the content — nobody likes to read bad writing.' },
            ],
          };
    }
  }
};

const formatRelative = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(day / 365);
  return `${yr}y ago`;
};

export const TrailBriefCard: React.FC<TrailBriefCardProps> = ({
  body,
  request,
  title,
  author,
  createdAt,
  repoCount,
  fileCount,
  stops,
  signOffs,
  signedByCurrentUser = false,
  summaryNotes,
  notedBy,
  notesByAuthor,
  isShared = false,
  purpose,
  onSelectionChange,
  hideSelectedPanel = false,
  hideCohortStrips = false,
  maxWidth = 640,
  presentation = 'modal',
  expandInline = false,
  readFile,
  currentUserLogin,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const isScreen = presentation === 'screen';
  const { theme } = useTheme();

  const isInformative = !isShared || !request || request.trim().length === 0;
  const eyebrow = resolveEyebrow(theme, purpose, signOffs?.length ?? 0);
  const headingLine = isInformative ? title : (request as string);
  const stampText = isInformative ? 'ACK' : 'LGTM';

  const [showExplanation, setShowExplanation] = React.useState(false);
  const [noteAuthorFilter, setNoteAuthorFilter] = React.useState<string | null>(null);
  // Row selection set. Each entry is either `'overview'` (row 00) or a
  // numeric stop index. Stored as a Set so `expandInline` can keep
  // multiple rows open at once; non-inline modes are single-select
  // (the toggle helpers clear the set before adding).
  type SelectionKey = 'overview' | number;
  const [selectionSet, setSelectionSet] = React.useState<Set<SelectionKey>>(
    () => new Set(),
  );

  // Inline note composer — at most one open at a time across the whole
  // card. `create` targets a stop's marker; `edit` targets a note id.
  // The draft text + busy/error live inside the InlineNoteComposer; the
  // card only tracks which composer is open.
  type ComposerState =
    | { mode: 'create'; markerId: string }
    | { mode: 'edit'; noteId: string }
    | null;
  const [composer, setComposer] = React.useState<ComposerState>(null);
  const cancelComposer = React.useCallback(() => setComposer(null), []);
  // Close the composer immediately and let the host persist in the
  // background. The host shows the note optimistically, so keeping the
  // composer open (with a "Saving…" state) would briefly show the note and
  // the composer at once. The host owns failure feedback (rollback + alert).
  const handleComposerSubmit = React.useCallback(
    (textValue: string) => {
      if (!composer) return;
      if (composer.mode === 'create') {
        void onCreateNote?.(composer.markerId, textValue);
      } else {
        void onUpdateNote?.(composer.noteId, textValue);
      }
      setComposer(null);
    },
    [composer, onCreateNote, onUpdateNote],
  );

  const filteredMarkerIds = React.useMemo<Set<string> | null>(() => {
    if (!noteAuthorFilter) return null;
    const list = notesByAuthor?.[noteAuthorFilter];
    if (!list || list.length === 0) return null;
    return new Set(list);
  }, [noteAuthorFilter, notesByAuthor]);

  const handleAvatarPress = React.useCallback(
    (avatarAuthor: string) => {
      const markerIds = notesByAuthor?.[avatarAuthor];
      if (!markerIds || markerIds.length === 0) return;
      setNoteAuthorFilter((prev) =>
        prev === avatarAuthor ? null : avatarAuthor,
      );
    },
    [notesByAuthor],
  );

  const toggleSelectionKey = React.useCallback(
    (key: SelectionKey) => {
      setSelectionSet((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          if (!expandInline) next.clear();
          next.add(key);
        }
        return next;
      });
    },
    [expandInline],
  );

  const toggleOverviewSelection = React.useCallback(
    () => toggleSelectionKey('overview'),
    [toggleSelectionKey],
  );

  const toggleStopSelection = React.useCallback(
    (index: number) => toggleSelectionKey(index),
    [toggleSelectionKey],
  );

  // The pinned-panel API (`onSelectionChange`, in-card `SelectedStopPanel`)
  // is single-selection. Multi-select only matters for `expandInline`, so
  // we always surface a single Selection — the last-added key when the
  // set has one entry, otherwise null.
  const singleSelection: SelectionKey | null =
    selectionSet.size === 1
      ? (selectionSet.values().next().value as SelectionKey)
      : null;

  React.useEffect(() => {
    if (!onSelectionChange) return;
    if (singleSelection === 'overview') {
      onSelectionChange({ kind: 'overview' });
    } else if (typeof singleSelection === 'number') {
      onSelectionChange({ kind: 'stop', index: singleSelection });
    } else {
      onSelectionChange(null);
    }
  }, [singleSelection, onSelectionChange]);

  const dateStamp = React.useMemo(() => formatRelative(createdAt), [createdAt]);

  const routeParts: string[] = [];
  if (fileCount && fileCount > 0) {
    routeParts.push(`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`);
  }
  if (repoCount && repoCount > 1) {
    routeParts.push(`${repoCount} repos`);
  }

  const borderStyle = isShared ? 'solid' : 'dashed';
  const borderColor = mixColors(eyebrow.color, 0.55, theme.colors.border);
  const cardRadius = isShared ? 0 : theme.radii[4];

  // Outer container — width capped at `maxWidth` and centered in modal
  // mode; in screen mode the brief IS the viewport so flex to fill the
  // available height (the host is responsible for sizing the parent).
  const containerStyle: ViewStyle = isScreen
    ? { width: '100%', flex: 1 }
    : { width: '100%', maxWidth, alignSelf: 'center' };

  const headerHasRouteRow = routeParts.length > 0 || !!dateStamp;
  const headerHasFromRow = !!(author && author.trim().length > 0);

  return (
    <View style={containerStyle}>
      {showExplanation ? (
        <ExplanationPanel
          theme={theme}
          isShared={isShared}
          eyebrowColor={eyebrow.color}
          segments={eyebrow.explanation}
          onClose={() => setShowExplanation(false)}
        />
      ) : null}

      <View
        style={
          isScreen
            ? {
                flex: 1,
                backgroundColor: theme.colors.backgroundSecondary,
              }
            : {
                backgroundColor: theme.colors.backgroundSecondary,
                borderRadius: cardRadius,
                borderWidth: 1,
                borderStyle: borderStyle as ViewStyle['borderStyle'],
                borderColor,
                overflow: 'hidden',
              }
        }
      >
        {/* Header */}
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: theme.space[3],
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <EyebrowPill
              theme={theme}
              label={eyebrow.label}
              color={eyebrow.color}
              active={showExplanation}
              onPress={() => setShowExplanation((prev) => !prev)}
            />
            <Text
              style={{
                fontFamily: theme.fonts.body,
                fontSize: theme.fontSizes[3],
                fontWeight: String(theme.fontWeights.medium) as TextStyle['fontWeight'],
                color: theme.colors.text,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {headingLine}
            </Text>
            {headerHasRouteRow ? (
              <View style={styles.metaRow}>
                {dateStamp ? (
                  <MetaPair
                    theme={theme}
                    label="CREATED"
                    value={dateStamp}
                  />
                ) : null}
                {routeParts.length > 0 ? (
                  <MetaPair
                    theme={theme}
                    label="SCOPE"
                    value={routeParts.join(' · ')}
                  />
                ) : null}
              </View>
            ) : null}
            {headerHasFromRow ? (
              <View style={styles.metaRow}>
                {author && author.trim().length > 0 ? (
                  <MetaPair theme={theme} label="FROM" value={author} />
                ) : null}
              </View>
            ) : null}
          </View>

          {isShared && !STAMP_SLOT_DISABLED ? (
            <StampPlaceholder
              theme={theme}
              signed={signedByCurrentUser}
              stampText={stampText}
            />
          ) : null}
        </View>

        {/* Body — single route list. Row 00 is the synthetic Overview
            (trail body); the rest are real stops. Selecting any row
            surfaces its content in the SelectedStopPanel below the
            card. Scroll is always internal to the route ScrollView —
            in modal mode the body is bounded 220–360px; in screen
            mode it flexes to whatever space the host gave the card. */}
        <View
          style={
            isScreen ? { flex: 1 } : { minHeight: 220, maxHeight: 360 }
          }
        >
          <View style={{ flex: 1 }}>
            {noteAuthorFilter ? (
              <View
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.fonts.monospace,
                    fontSize: theme.fontSizes[0],
                    color: theme.colors.textTertiary,
                    letterSpacing: 0.4,
                    flex: 1,
                  }}
                >
                  NOTES BY{' '}
                  <Text style={{ color: theme.colors.text }}>{noteAuthorFilter}</Text>
                </Text>
                <Pressable
                  onPress={() => setNoteAuthorFilter(null)}
                  hitSlop={8}
                  accessibilityLabel="Clear filter"
                >
                  <Text
                    style={{
                      color: theme.colors.textTertiary,
                      fontSize: theme.fontSizes[1],
                      lineHeight: theme.fontSizes[1],
                    }}
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {/* Route list always lives in its own ScrollView so the
                header above stays fixed and only the rows scroll. The
                host must NOT wrap the card in another ScrollView with
                the same orientation, or RN will warn about nested
                virtualization. The ScrollView is inlined (rather than
                wrapped in an in-render component) because a per-render
                component identity remounts every row on selection
                change, resetting any per-row animation state. */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              // Inset for the keyboard so an inline note composer in a
              // lower row stays reachable when the keyboard is up (iOS).
              automaticallyAdjustKeyboardInsets
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingVertical: 15,
                paddingLeft: 10,
                paddingRight: 19,
              }}
            >
              <RouteStopRow
                theme={theme}
                numberLabel="00"
                label="Overview"
                eyebrowColor={eyebrow.color}
                kind="subject"
                isLast={!stops || stops.length === 0}
                matchesFilter={false}
                dimmed={filteredMarkerIds != null}
                onPress={toggleOverviewSelection}
                expandedDescription={expandInline ? body : undefined}
                notes={expandInline ? summaryNotes : undefined}
                noteCount={summaryNotes?.length ?? 0}
                currentUserLogin={currentUserLogin}
                onStartEditNote={
                  onUpdateNote
                    ? (noteId) => setComposer({ mode: 'edit', noteId })
                    : undefined
                }
                onDeleteNote={onDeleteNote}
                editingNoteId={
                  composer?.mode === 'edit' ? composer.noteId : undefined
                }
                onComposerSubmit={handleComposerSubmit}
                onComposerCancel={cancelComposer}
                expanded={expandInline && selectionSet.has('overview')}
              />
              {stops && stops.length > 0
                ? stops.map((stop, i) => (
                    <RouteStopRow
                      key={stop.id ?? i}
                      theme={theme}
                      numberLabel={String(i + 1).padStart(2, '0')}
                      label={stop.label}
                      eyebrowColor={eyebrow.color}
                      kind={stop.kind}
                      isLast={i === stops.length - 1}
                      matchesFilter={
                        filteredMarkerIds != null &&
                        stop.id != null &&
                        filteredMarkerIds.has(stop.id)
                      }
                      dimmed={
                        filteredMarkerIds != null &&
                        !(stop.id != null && filteredMarkerIds.has(stop.id))
                      }
                      onPress={() => toggleStopSelection(i)}
                      sourcePath={stop.sourcePath}
                      expandedDescription={
                        expandInline ? stop.description : undefined
                      }
                      notes={expandInline ? stop.notes : undefined}
                      noteCount={stop.notes?.length ?? 0}
                      snippet={expandInline ? stop.snippet : undefined}
                      readFile={readFile}
                      currentUserLogin={currentUserLogin}
                      onStartAddNote={
                        expandInline && onCreateNote && stop.id
                          ? () =>
                              setComposer({
                                mode: 'create',
                                markerId: stop.id as string,
                              })
                          : undefined
                      }
                      onStartEditNote={
                        onUpdateNote
                          ? (noteId) => setComposer({ mode: 'edit', noteId })
                          : undefined
                      }
                      onDeleteNote={onDeleteNote}
                      creating={
                        composer?.mode === 'create' &&
                        composer.markerId === stop.id
                      }
                      editingNoteId={
                        composer?.mode === 'edit' ? composer.noteId : undefined
                      }
                      onComposerSubmit={handleComposerSubmit}
                      onComposerCancel={cancelComposer}
                      expanded={expandInline && selectionSet.has(i)}
                    />
                  ))
                : null}
            </ScrollView>
          </View>
        </View>

      </View>

      {/*
       * Below-card slot — mutually exclusive between:
       *   - SelectedStopPanel: row 00 (Overview, renders the trail
       *     body) or a real stop (label / path / description).
       *   - Cohort strips (REVIEWED BY / NOTES BY): the idle state
       *     when nothing is selected.
       * Selection wins; the strips re-appear when the reader deselects.
       */}
      {!hideSelectedPanel && !expandInline && singleSelection === 'overview' ? (
        <View style={{ marginTop: 10 }}>
          <SelectedStopPanel
            theme={theme}
            eyebrowColor={eyebrow.color}
            description={body}
            notes={summaryNotes}
          />
        </View>
      ) : null}
      {!hideSelectedPanel &&
      !expandInline &&
      typeof singleSelection === 'number' &&
      stops &&
      stops[singleSelection] ? (
        <View style={{ marginTop: 10 }}>
          <SelectedStopPanel
            theme={theme}
            eyebrowColor={eyebrow.color}
            sourcePath={stops[singleSelection].sourcePath}
            description={stops[singleSelection].description}
            notes={stops[singleSelection].notes}
            snippet={stops[singleSelection].snippet}
            readFile={readFile}
          />
        </View>
      ) : null}
      {/* Strips are mutually exclusive with the below-card panel, so
          we hide them on selection in non-inline mode (the panel takes
          their slot). In `expandInline` mode the panel never renders,
          so the strips can always show. */}
      {expandInline || selectionSet.size === 0 ? (
        <>
          {!hideCohortStrips && isShared && signOffs && signOffs.length > 0 ? (
            <AvatarStrip
              theme={theme}
              label="REVIEWED BY"
              ringed
              entries={signOffs.map((s) => {
                const hasNotes =
                  (notesByAuthor?.[s.author]?.length ?? 0) > 0;
                return {
                  key: s.id,
                  name: s.author,
                  onPress: hasNotes
                    ? () => handleAvatarPress(s.author)
                    : undefined,
                  active: noteAuthorFilter === s.author,
                };
              })}
            />
          ) : null}
          {!hideCohortStrips && notedBy && notedBy.length > 0 ? (
            <AvatarStrip
              theme={theme}
              label="NOTES BY"
              entries={notedBy.map((name) => {
                const hasNotes = (notesByAuthor?.[name]?.length ?? 0) > 0;
                return {
                  key: name,
                  name,
                  onPress: hasNotes
                    ? () => handleAvatarPress(name)
                    : undefined,
                  active: noteAuthorFilter === name,
                };
              })}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
};

// ===========================================================================
// Sub-components
// ===========================================================================

const ExplanationPanel: React.FC<{
  theme: Theme;
  isShared: boolean;
  eyebrowColor: string;
  segments: ExplanationSegment[];
  onClose: () => void;
}> = ({ theme, isShared, eyebrowColor, segments, onClose }) => (
  <View
    style={{
      marginBottom: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderStyle: isShared ? 'solid' : 'dashed',
      borderColor: mixColors(eyebrowColor, 0.55, theme.colors.border),
    }}
  >
    <Pressable
      onPress={onClose}
      hitSlop={8}
      accessibilityLabel="Close explanation"
      style={{ position: 'absolute', top: 4, right: 8, padding: 4 }}
    >
      <Text style={{ color: theme.colors.textTertiary, fontSize: theme.fontSizes[3] }}>×</Text>
    </Pressable>
    <Text
      style={{
        fontFamily: theme.fonts.body,
        fontSize: theme.fontSizes[1],
        lineHeight: theme.fontSizes[1] * 1.5,
        color: theme.colors.textSecondary,
        paddingRight: 24,
      }}
    >
      {segments.map((seg, i) =>
        seg.bold ? (
          <Text
            key={i}
            style={{
              color: eyebrowColor,
              fontWeight: String(theme.fontWeights.semibold) as TextStyle['fontWeight'],
            }}
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  </View>
);

const EyebrowPill: React.FC<{
  theme: Theme;
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
}> = ({ theme, label, color, active, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    style={{
      alignSelf: 'flex-start',
      paddingVertical: 2,
      paddingHorizontal: 5,
      borderRadius: theme.radii[1],
      borderWidth: 1,
      borderColor: active ? withAlpha(color, 0.6) : 'transparent',
      backgroundColor: withAlpha(color, active ? 0.22 : 0.12),
    }}
  >
    <Text
      style={{
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[0],
        color,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: String(theme.fontWeights.semibold) as TextStyle['fontWeight'],
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const MetaPair: React.FC<{ theme: Theme; label: string; value: string }> = ({
  theme,
  label,
  value,
}) => (
  <Text
    style={{
      fontFamily: theme.fonts.monospace,
      fontSize: theme.fontSizes[0],
      color: theme.colors.textTertiary,
      letterSpacing: 0.5,
      lineHeight: theme.fontSizes[0] * 1.55,
    }}
  >
    {label}{' '}
    <Text style={{ color: theme.colors.textSecondary }}>{value}</Text>
  </Text>
);

const StampPlaceholder: React.FC<{
  theme: Theme;
  signed: boolean;
  stampText: string;
}> = ({ theme, signed, stampText }) => (
  <View
    style={{
      width: 80,
      height: 80,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii[1],
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {/* Dashed border via SVG so the stroke pattern survives any RN layout
        quirks; RN's `borderStyle: 'dashed'` is platform-inconsistent. */}
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 80 80"
      style={StyleSheet.absoluteFillObject}
    >
      <Rect
        x={1}
        y={1}
        width={78}
        height={78}
        rx={3}
        ry={3}
        fill="none"
        stroke={theme.colors.textTertiary}
        strokeWidth={2}
        strokeDasharray="5 5"
      />
    </Svg>
    {signed ? (
      <LgtmStamp theme={theme} size={80} rotated={false} text={stampText} />
    ) : (
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0] * 0.85,
            color: theme.colors.textTertiary,
            letterSpacing: 1,
            lineHeight: theme.fontSizes[0] * 1.1,
          }}
        >
          TRAIL
        </Text>
        <Text
          style={{
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0] * 0.85,
            color: theme.colors.textTertiary,
            letterSpacing: 1,
            lineHeight: theme.fontSizes[0] * 1.1,
          }}
        >
          UNREVIEWED
        </Text>
      </View>
    )}
  </View>
);

const RouteStopRow: React.FC<{
  theme: Theme;
  numberLabel: string;
  label: string;
  kind?: TrailMarkerKind;
  eyebrowColor: string;
  isLast: boolean;
  matchesFilter: boolean;
  dimmed: boolean;
  onPress?: () => void;
  /** Path shown under the row label whenever provided (not gated on
   *  expansion) — gives the reader the location at a glance. */
  sourcePath?: string;
  /** Optional markdown shown under the row when `expanded`. */
  expandedDescription?: string;
  /** Reader notes shown under the description when `expanded`. */
  notes?: TrailBriefNote[];
  /**
   * Number of notes anchored to this row, shown as a badge next to the
   * label. Independent of `notes` (which only populates when expanded)
   * so the badge reads in every presentation, collapsed or not.
   */
  noteCount?: number;
  /** Code snippet shown under the notes when `expanded`. */
  snippet?: TrailMarkerSnippet;
  /** Host file reader for resolving slice-snippet source. */
  readFile?: TrailFileReader;
  /** Viewer login — notes authored by this login show edit/delete. */
  currentUserLogin?: string;
  /** Open the inline create composer in this row (renders "+ Add note"). */
  onStartAddNote?: () => void;
  /** Open the inline edit composer for one of this row's notes. */
  onStartEditNote?: (noteId: string) => void;
  /** Delete a note on this row (surfaced on the viewer's own notes). */
  onDeleteNote?: (noteId: string) => void;
  /** This row is the active create composer. */
  creating?: boolean;
  /** Id of the note currently being edited (may belong to another row). */
  editingNoteId?: string;
  /** Submit the open composer's draft. The card closes it immediately. */
  onComposerSubmit?: (text: string) => void;
  /** Dismiss the open composer. */
  onComposerCancel?: () => void;
  /** Drives the inline expand animation (height + opacity). */
  expanded?: boolean;
}> = ({
  theme,
  numberLabel,
  label,
  kind,
  eyebrowColor,
  isLast,
  matchesFilter,
  dimmed,
  onPress,
  sourcePath,
  expandedDescription,
  notes,
  noteCount = 0,
  snippet,
  readFile,
  currentUserLogin,
  onStartAddNote,
  onStartEditNote,
  onDeleteNote,
  creating = false,
  editingNoteId,
  onComposerSubmit,
  onComposerCancel,
  expanded = false,
}) => {
  const labelColor = kind === 'subject' ? eyebrowColor : theme.colors.text;
  const numberColor =
    kind === 'subject' ? eyebrowColor : theme.colors.textTertiary;

  // Is one of this row's own notes being edited?
  const editingHere =
    editingNoteId != null &&
    (notes?.some((n) => n.id === editingNoteId) ?? false);
  // A composer (create or edit) is open in this row. While open we render
  // the row's expanded content statically (no clip/animation) so the
  // growing TextInput + keyboard never fight the height measurement.
  const composerOpen = creating || editingHere;

  const hasExpandable =
    !!expandedDescription ||
    (notes?.length ?? 0) > 0 ||
    !!snippet ||
    !!onStartAddNote ||
    composerOpen;
  const [contentHeight, setContentHeight] = React.useState(0);
  // Manual RAF-driven animation. RN core Animated.timing on `height`
  // was completing on open but visibly snapping on close — the most
  // likely cause is the parent's selection change interrupting the
  // animation. Driving the value through React state guarantees the
  // close runs to completion regardless of upstream re-renders.
  const [renderedHeight, setRenderedHeight] = React.useState(0);

  React.useEffect(() => {
    const target = expanded && contentHeight > 0 ? contentHeight : 0;
    const start = renderedHeight;
    if (start === target) return;
    const duration = 150;
    const startTime =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    let rafId = 0;
    let cancelled = false;
    const easeInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = () => {
      if (cancelled) return;
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOut(progress);
      setRenderedHeight(start + (target - start) * eased);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    // Intentionally omit `renderedHeight` so a new animation isn't
    // restarted on every animated frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, contentHeight]);

  // Row tint is driven solely by the note-author filter match. The
  // old eyebrow "selected row" tint + left border was dropped to match
  // the web card: rows expand inline and several can be open at once,
  // so a single "active" row no longer carries useful meaning — the
  // inline expansion itself is the signal.
  const rowBackground = matchesFilter
    ? withAlpha(theme.colors.accent, 0.18)
    : 'transparent';

  // The expanded content column (description → notes → snippet → add).
  // Shared between the animated wrapper (idle) and a static wrapper (while
  // a composer is open). A note being edited renders as an InlineNoteComposer
  // in place of its NoteCard.
  const expandedColumn = (
    <View style={{ flex: 1 }}>
      {expandedDescription && expandedDescription.trim().length > 0 ? (
        <View>
          <IndustryMarkdownInline>
            {expandedDescription.trim()}
          </IndustryMarkdownInline>
        </View>
      ) : null}
      {notes?.map((note) => {
        const isOwn =
          !!currentUserLogin && note.author === currentUserLogin;
        if (editingNoteId === note.id) {
          return (
            <InlineNoteComposer
              key={note.id}
              theme={theme}
              eyebrowColor={eyebrowColor}
              initialBody={note.body}
              onSubmit={onComposerSubmit ?? (() => {})}
              onCancel={onComposerCancel ?? (() => {})}
            />
          );
        }
        return (
          <NoteCard
            key={note.id}
            theme={theme}
            eyebrowColor={eyebrowColor}
            note={note}
            onEdit={
              isOwn && onStartEditNote
                ? () => onStartEditNote(note.id)
                : undefined
            }
            onDelete={
              isOwn && onDeleteNote ? () => onDeleteNote(note.id) : undefined
            }
          />
        );
      })}
      {snippet ? (
        <TrailCodeSnippet
          filePath={sourcePath}
          snippet={snippet}
          readFile={readFile}
          eyebrowColor={eyebrowColor}
        />
      ) : null}
      {creating ? (
        <InlineNoteComposer
          theme={theme}
          eyebrowColor={eyebrowColor}
          onSubmit={onComposerSubmit ?? (() => {})}
          onCancel={onComposerCancel ?? (() => {})}
        />
      ) : onStartAddNote ? (
        <Pressable
          onPress={onStartAddNote}
          hitSlop={6}
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
          accessibilityRole="button"
          accessibilityLabel="Add note"
        >
          <Text
            style={{
              fontFamily: theme.fonts.monospace,
              fontSize: theme.fontSizes[1],
              color: eyebrowColor,
              letterSpacing: 0.3,
            }}
          >
            + Add note
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderStyle: 'dashed',
        borderBottomColor: theme.colors.border,
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <View
        style={{
          paddingVertical: 10,
          paddingHorizontal: 8,
          marginHorizontal: -8,
          borderRadius: theme.radii[1],
          backgroundColor: rowBackground,
          borderLeftWidth: 3,
          borderLeftColor: matchesFilter ? theme.colors.accent : 'transparent',
          paddingLeft: 8,
        }}
      >
        <Pressable
          disabled={!onPress}
          onPress={onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <Text
            style={{
              color: numberColor,
              minWidth: 30,
              fontFamily: theme.fonts.monospace,
              fontSize: theme.fontSizes[2],
              lineHeight: theme.fontSizes[2] * 1.5,
            }}
          >
            {numberLabel}
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                color: labelColor,
                fontFamily: theme.fonts.monospace,
                fontSize: theme.fontSizes[2],
                lineHeight: theme.fontSizes[2] * 1.5,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {label}
            </Text>
            {sourcePath ? (
              <Text
                style={{
                  marginTop: 2,
                  fontFamily: theme.fonts.monospace,
                  fontSize: theme.fontSizes[0],
                  color: theme.colors.textTertiary,
                  lineHeight: theme.fontSizes[0] * 1.4,
                }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {sourcePath}
              </Text>
            ) : null}
          </View>
          {noteCount > 0 ? (
            <NoteCountBadge
              theme={theme}
              eyebrowColor={eyebrowColor}
              count={noteCount}
            />
          ) : null}
        </Pressable>
        {hasExpandable ? (
          // One wrapper for every state — idle, expanding, and composing.
          // Height interpolates 0 ↔ contentHeight; `overflow: hidden` clips
          // the absolutely-positioned content until the animation catches
          // up. Opening/closing the inline composer just changes
          // contentHeight, so it animates smoothly like any other content
          // — no wrapper swap, no remount, no pop. (Keeping a single tree
          // is why the composer's TextInput is a *fixed* height: a growing
          // field would re-trigger this animation on every keystroke.)
          <View style={{ overflow: 'hidden', height: renderedHeight }}>
            <View
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && h !== contentHeight) setContentHeight(h);
              }}
              // `paddingTop` (not `marginTop`) for the 6px gap above the
              // expanded content: the offset must live *inside* the box
              // `onLayout` measures, or the animated wrapper comes up 6px
              // short and clips the last element (e.g. "+ Add note").
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                flexDirection: 'row',
                gap: 12,
                paddingTop: 6,
              }}
            >
              <View style={{ minWidth: 30 }} />
              {expandedColumn}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

/**
 * The detail panel that appears below the card when the reader selects
 * a row in the route — either the synthetic Overview row (renders the
 * trail body) or a real stop (renders its label / path / description).
 * Occupies the same vertical slot as REVIEWED BY / NOTES BY,
 * replacing them while a selection is active.
 */
export interface SelectedStopPanelProps {
  theme: Theme;
  eyebrowColor: string;
  sourcePath?: string;
  description?: string;
  notes?: TrailBriefNote[];
  snippet?: TrailMarkerSnippet;
  readFile?: TrailFileReader;
}

export const SelectedStopPanel: React.FC<SelectedStopPanelProps> = ({
  theme,
  eyebrowColor,
  sourcePath,
  description,
  notes,
  snippet,
  readFile,
}) => {
  const hasDescription = !!description && description.trim().length > 0;
  const hasNotes = (notes?.length ?? 0) > 0;
  return (
    <View
      style={{
        // `flex: 1` so the panel fills whatever container the host
        // sized for it (e.g. the 30% slot in TrailDetailScreen). In
        // non-flex parents this is a no-op and the panel sizes to
        // content, which is what the in-card render path wants.
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: mixColors(eyebrowColor, 0.55, theme.colors.border),
      }}
    >
      {sourcePath ? (
        <Text
          style={{
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0],
            color: theme.colors.textTertiary,
            lineHeight: theme.fontSizes[0] * 1.4,
          }}
        >
          {sourcePath}
        </Text>
      ) : null}
      {hasDescription || hasNotes || snippet ? (
        // Internal scroll for the body + notes + snippet — sourcePath
        // above stays pinned, only the content scrolls when it overflows
        // the panel's height.
        <ScrollView
          style={{ flex: 1, marginTop: sourcePath ? 8 : 0 }}
          showsVerticalScrollIndicator={false}
        >
          {hasDescription ? (
            <IndustryMarkdownInline>
              {(description ?? '').trim()}
            </IndustryMarkdownInline>
          ) : null}
          {notes?.map((note) => (
            <NoteCard
              key={note.id}
              theme={theme}
              eyebrowColor={eyebrowColor}
              note={note}
            />
          ))}
          {snippet ? (
            <TrailCodeSnippet
              filePath={sourcePath}
              snippet={snippet}
              readFile={readFile}
              eyebrowColor={eyebrowColor}
            />
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
};

/**
 * Compact note-count pill shown to the right of a route row's label —
 * a chat-bubble glyph plus the count, tinted with the trail's eyebrow
 * color. Read-only signal that the stop carries notes; tapping the row
 * (not the badge) is what reveals them. Ported from the web card.
 */
const NoteCountBadge: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  count: number;
}> = ({ theme, eyebrowColor, count }) => (
  <View
    accessibilityLabel={`${count} ${count === 1 ? 'note' : 'notes'}`}
    style={{
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 1,
      paddingHorizontal: 6,
      borderRadius: theme.radii[1],
      borderWidth: 1,
      borderColor: mixColors(eyebrowColor, 0.45, theme.colors.border),
      backgroundColor: withAlpha(eyebrowColor, 0.14),
    }}
  >
    <Svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke={eyebrowColor}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
    <Text
      style={{
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[0],
        color: eyebrowColor,
        letterSpacing: 0.4,
      }}
    >
      {count}
    </Text>
  </View>
);

/**
 * A single reader note rendered inside an expanded route row or the
 * SelectedStopPanel. Compact header (NOTE · author · relative time),
 * markdown body, and an optional monospace location caption for snippet
 * notes. Tinted with the trail's eyebrow color so it reads as attached
 * to the surrounding row.
 */
const NoteCard: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  note: TrailBriefNote;
  /** When set, an edit (✎) control appears in the header. */
  onEdit?: () => void;
  /** When set, a delete (✕) control appears in the header. */
  onDelete?: () => void;
}> = ({ theme, eyebrowColor, note, onEdit, onDelete }) => {
  const when = formatRelative(note.createdAt);
  const hasBody = note.body.trim().length > 0;
  return (
    <View
      style={{
        marginTop: 8,
        borderLeftWidth: 2,
        borderLeftColor: withAlpha(eyebrowColor, 0.5),
        backgroundColor: withAlpha(eyebrowColor, 0.06),
        borderRadius: theme.radii[1],
        paddingVertical: 8,
        paddingHorizontal: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: hasBody ? 4 : 0,
        }}
      >
        <Text
          style={{
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0],
            color: theme.colors.textTertiary,
            letterSpacing: 0.5,
          }}
        >
          NOTE
        </Text>
        <Text
          style={{
            fontFamily: theme.fonts.body,
            fontSize: theme.fontSizes[0],
            fontWeight: String(
              theme.fontWeights.medium,
            ) as TextStyle['fontWeight'],
            color: theme.colors.text,
          }}
        >
          {note.author}
        </Text>
        {when ? (
          <Text
            style={{
              fontFamily: theme.fonts.body,
              fontSize: theme.fontSizes[0],
              color: theme.colors.textTertiary,
            }}
          >
            · {when}
          </Text>
        ) : null}
        {onEdit || onDelete ? (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {onEdit ? (
              <Pressable
                onPress={onEdit}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Edit note"
              >
                <Text
                  style={{
                    color: theme.colors.textTertiary,
                    fontSize: theme.fontSizes[1],
                  }}
                >
                  ✎
                </Text>
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                onPress={onDelete}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete note"
              >
                <Text
                  style={{
                    color: theme.colors.textTertiary,
                    fontSize: theme.fontSizes[1],
                  }}
                >
                  ✕
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {hasBody ? (
        <IndustryMarkdownInline>{note.body.trim()}</IndustryMarkdownInline>
      ) : null}
      {note.anchorCaption ? (
        <Text
          style={{
            marginTop: hasBody ? 6 : 0,
            fontFamily: theme.fonts.monospace,
            fontSize: theme.fontSizes[0],
            color: theme.colors.textTertiary,
          }}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          ⌁ {note.anchorCaption}
        </Text>
      ) : null}
    </View>
  );
};

/**
 * Inline note composer rendered inside an expanded route row — used for
 * both creating a new marker note and editing an existing note's body.
 * Holds only the draft text; tapping Save hands it up and the parent
 * closes the composer immediately (the host persists optimistically, so
 * the note shows at once — no in-composer "saving" state to overlap it).
 */
const InlineNoteComposer: React.FC<{
  theme: Theme;
  eyebrowColor: string;
  initialBody?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}> = ({ theme, eyebrowColor, initialBody = '', onSubmit, onCancel }) => {
  const [text, setText] = React.useState(initialBody);
  const trimmed = text.trim();
  const canSave = trimmed.length > 0;

  return (
    <View style={{ marginTop: 8 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        placeholder="Leave a note on this step…"
        placeholderTextColor={theme.colors.textTertiary}
        // Fixed height (not minHeight): the row's expand animation keys off
        // measured content height, so a field that grew with each line would
        // re-fire the animation on every keystroke. Overflow scrolls inside.
        style={{
          height: 96,
          borderWidth: 1,
          borderColor: withAlpha(eyebrowColor, 0.5),
          borderRadius: theme.radii[1],
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
          fontSize: theme.fontSizes[1],
          padding: 10,
          textAlignVertical: 'top',
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 18,
          marginTop: 8,
        }}
      >
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSizes[1],
            }}
          >
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={() => canSave && onSubmit(trimmed)}
          hitSlop={8}
          disabled={!canSave}
          accessibilityRole="button"
        >
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: theme.fontSizes[1],
              fontWeight: '600',
              opacity: canSave ? 1 : 0.4,
            }}
          >
            Save
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

interface AvatarStripEntry {
  key: string;
  name: string;
  onPress?: () => void;
  active?: boolean;
}

const AvatarStrip: React.FC<{
  theme: Theme;
  label: string;
  entries: AvatarStripEntry[];
  ringed?: boolean;
}> = ({ theme, label, entries, ringed = false }) => (
  <View
    style={{
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <Text
      style={{
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[0],
        color: theme.colors.textTertiary,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {label}
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ alignItems: 'center', gap: 6 }}
      style={{ flex: 1 }}
    >
      {entries.map((entry) => {
        const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
          entry.onPress ? (
            <Pressable
              onPress={entry.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 2,
                paddingHorizontal: 8,
                paddingLeft: 2,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: entry.active ? theme.colors.accent : 'transparent',
                backgroundColor: entry.active
                  ? withAlpha(theme.colors.accent, 0.18)
                  : 'transparent',
              }}
            >
              {children}
            </Pressable>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {children}
            </View>
          );
        return (
          <Wrapper key={entry.key}>
            <Avatar theme={theme} name={entry.name} size={32} ringed={ringed} />
            <Text
              style={{
                fontFamily: theme.fonts.body,
                fontSize: theme.fontSizes[0],
                color: theme.colors.textSecondary,
              }}
            >
              {entry.name}
            </Text>
          </Wrapper>
        );
      })}
    </ScrollView>
  </View>
);

const Avatar: React.FC<{
  theme: Theme;
  name: string;
  size: number;
  ringed?: boolean;
}> = ({ theme, name, size, ringed }) => {
  const initials = (() => {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  })();
  const borderWidth = ringed ? 2 : 0;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor: ringed ? theme.colors.success : 'transparent',
        backgroundColor: mixColors(theme.colors.accent, 0.3, theme.colors.background),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
          fontSize: Math.max(10, Math.round(size * 0.4)),
          fontWeight: String(theme.fontWeights.bold) as TextStyle['fontWeight'],
          letterSpacing: 0.4,
        }}
      >
        {initials || '?'}
      </Text>
    </View>
  );
};

/**
 * Reusable sign-off stamp — rotated, double-bordered, ink-colored.
 * Mirrors `LgtmStamp` from the web card.
 */
export const LgtmStamp: React.FC<{
  theme: Theme;
  size: number;
  rotated?: boolean;
  text?: string;
}> = ({ theme, size, rotated = true, text = 'LGTM' }) => {
  const inkColor = theme.colors.success;
  const borderWidth = Math.max(2, Math.round(size / 30));
  return (
    <View
      style={{
        width: size,
        height: size,
        transform: rotated ? [{ rotate: '-8deg' }] : undefined,
        borderWidth,
        // RN doesn't have `double` border style; emulate with two stacked
        // borders via wrapper + inner. For v0 a single thick border reads
        // close enough.
        borderColor: inkColor,
        borderRadius: theme.radii[1],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.9,
        padding: size * 0.05,
      }}
    >
      <Text
        style={{
          fontFamily: theme.fonts.monospace,
          color: inkColor,
          fontSize: size * 0.26,
          fontWeight: String(theme.fontWeights.bold) as TextStyle['fontWeight'],
          letterSpacing: 2,
          lineHeight: size * 0.28,
        }}
      >
        {text}
      </Text>
      <Text
        style={{
          fontFamily: theme.fonts.monospace,
          color: inkColor,
          fontSize: size * 0.1,
          letterSpacing: 1.2,
          marginTop: size * 0.05,
          lineHeight: size * 0.12,
        }}
      >
        {new Date().toISOString().slice(0, 10)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    marginTop: 4,
  },
});
