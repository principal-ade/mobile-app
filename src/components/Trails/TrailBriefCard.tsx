/**
 * Mobile port of the web `TrailBriefCard` from
 * `industry-themed-file-city-panels/src/panels/FileCityTrailExplorerPanel/overlays/TrailBriefCard.tsx`.
 *
 * Same visual unit: header → Description / Route tab switch → body → footer,
 * plus the REVIEWED BY / NOTES BY / VISITED BY avatar strips below. The
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
  ViewStyle,
  TextStyle,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme, type Theme } from '@principal-ade/industry-theme';
import { IndustryMarkdown } from '../IndustryMarkdown';
import type {
  TrailMarkerKind,
  TrailPurpose,
  TrailSignOff,
} from '../../types/Trail';
import { mixColors, withAlpha } from './colorMix';

export interface TrailBriefCardStop {
  id?: string;
  label: string;
  sourcePath?: string;
  /**
   * Marker role from `TrailMarker.kind`. `'subject'` rows underline
   * their label with the eyebrow color to direct the reader's focus.
   */
  kind?: TrailMarkerKind;
}

export interface TrailBriefCardProps {
  /** Markdown body — typically the trail's `summary`. */
  body: string;
  /** Whether the trail has a Mermaid diagram available. */
  hasDiagram?: boolean;
  /** Called when the reader taps the footer `DIAGRAM` button. */
  onOpenDiagram?: () => void;
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
  /** Called when the reader taps Start to commit the trail. */
  onBegin: (mode: 'city' | 'doc') => void;
  /** Called when the reader taps a stop in the route list. */
  onBeginAtStop?: (stopIndex: number, mode: 'city' | 'doc') => void;
  /** Persisted reviewer LGTMs. */
  signOffs?: TrailSignOff[];
  /** Whether the *current viewer* is one of the signers. */
  signedByCurrentUser?: boolean;
  /** Display names of distinct note-authors. */
  notedBy?: string[];
  /** Visit roster for the `VISITED BY` row. */
  visitedBy?: {
    verified: string[];
    anonymousCount: number;
  };
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
   * Optional delete handler. When provided, the card grows a `DELETE`
   * button in the footer's left slot.
   */
  onDelete?: () => void;
  /** Whether to render the primary `Start` button. Defaults to `false`. */
  showStart?: boolean;
  /**
   * Max card width in pixels. Defaults to 640. The card renders at
   * `min(maxWidth, container width)` via flex.
   */
  maxWidth?: number;
}

type TabKey = 'description' | 'route';

type ExplanationSegment = { text: string; bold?: boolean };

interface EyebrowMeta {
  label: string;
  color: string;
  explanation: ExplanationSegment[];
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
  hasDiagram = false,
  onOpenDiagram,
  request,
  title,
  author,
  createdAt,
  repoCount,
  fileCount,
  stops,
  onBegin,
  onBeginAtStop,
  signOffs,
  signedByCurrentUser = false,
  notedBy,
  visitedBy,
  notesByAuthor,
  isShared = false,
  purpose,
  onDelete,
  showStart = false,
  maxWidth = 640,
}) => {
  const { theme } = useTheme();

  const isInformative = !isShared || !request || request.trim().length === 0;
  const eyebrow = resolveEyebrow(theme, purpose, signOffs?.length ?? 0);
  const headingLine = isInformative ? title : (request as string);
  const stampText = isInformative ? 'ACK' : 'LGTM';

  const [activeTab, setActiveTab] = React.useState<TabKey>('description');
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [noteAuthorFilter, setNoteAuthorFilter] = React.useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = React.useState<Set<number>>(
    () => new Set(),
  );

  const showRoute = activeTab === 'route';
  const canExpandRoute = !!(stops && stops.length > 0);
  const diagramButtonVisible = hasDiagram && !!onOpenDiagram;

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
      setNoteAuthorFilter((prev) => (prev === avatarAuthor ? null : avatarAuthor));
      setActiveTab('route');
    },
    [notesByAuthor],
  );

  React.useEffect(() => {
    if (!showRoute) setNoteAuthorFilter(null);
  }, [showRoute]);

  React.useEffect(() => {
    if (!showRoute) setExpandedPaths(new Set());
  }, [showRoute]);

  const togglePathExpansion = React.useCallback((index: number) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const visitTotal =
    (visitedBy?.verified.length ?? 0) + (visitedBy?.anonymousCount ?? 0);
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

  // Outer container — width capped at `maxWidth`, but shrinks on narrower
  // viewports. Layout column so explanation popover + card + avatar
  // strips stack vertically.
  const containerStyle: ViewStyle = {
    width: '100%',
    maxWidth,
    alignSelf: 'center',
  };

  const showFooter = !!onDelete || diagramButtonVisible || showStart;
  const footerSlotCount = (onDelete ? 1 : 0) + (showStart ? 1 : 0) + (diagramButtonVisible ? 1 : 0);

  const headerHasRouteRow = routeParts.length > 0 || !!dateStamp;
  const headerHasFromRow =
    (author && author.trim().length > 0) || (isShared && visitTotal > 0);

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
        style={{
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: cardRadius,
          borderWidth: 1,
          borderStyle: borderStyle as ViewStyle['borderStyle'],
          borderColor,
          overflow: 'hidden',
        }}
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
                {isShared && visitTotal > 0 ? (
                  <Text
                    style={{
                      fontFamily: theme.fonts.monospace,
                      fontSize: theme.fontSizes[0],
                      color: theme.colors.textTertiary,
                      letterSpacing: 0.5,
                      lineHeight: theme.fontSizes[0] * 1.55,
                    }}
                  >
                    {visitTotal} {visitTotal === 1 ? 'visit' : 'visits'}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {isShared ? (
            <StampPlaceholder
              theme={theme}
              signed={signedByCurrentUser}
              stampText={stampText}
            />
          ) : null}
        </View>

        {/* Tab bar */}
        <View style={{ flexDirection: 'row' }}>
          {(['description', 'route'] as const).map((tabKey) => {
            const active = activeTab === tabKey;
            const enabled = tabKey === 'description' ? true : canExpandRoute;
            const label = tabKey === 'description' ? 'Description' : 'Trail Route';
            return (
              <Pressable
                key={tabKey}
                disabled={!enabled}
                onPress={() => {
                  if (!enabled) return;
                  setActiveTab(tabKey);
                  setShowExplanation(false);
                }}
                style={{
                  flex: 1,
                  paddingTop: 14,
                  paddingBottom: 10,
                  paddingHorizontal: 14,
                  alignItems: 'center',
                  opacity: enabled ? 1 : 0.5,
                }}
              >
                <Text
                  style={{
                    color: active ? eyebrow.color : theme.colors.textTertiary,
                    fontFamily: theme.fonts.body,
                    fontSize: theme.fontSizes[1],
                    fontWeight: String(
                      active ? theme.fontWeights.semibold : theme.fontWeights.medium,
                    ) as TextStyle['fontWeight'],
                    letterSpacing: 0.3,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Body */}
        <View style={{ minHeight: 220, maxHeight: 360 }}>
          {activeTab === 'description' ? (
            // `IndustryMarkdown` wraps `react-native-marked`, which renders
            // a FlatList. Don't wrap it in a ScrollView — nesting a
            // virtualized list inside a plain ScrollView with the same
            // orientation throws the "VirtualizedLists should never be
            // nested" warning and breaks windowing. The bounded
            // min/maxHeight on this parent is what lets the FlatList
            // measure itself and scroll internally.
            <IndustryMarkdown
              containerStyle={{ paddingVertical: 4, paddingHorizontal: 18 }}
            >
              {body.trim()}
            </IndustryMarkdown>
          ) : null}
          {showRoute && stops && stops.length > 0 ? (
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
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 15, paddingHorizontal: 19 }}
              >
                {stops.map((stop, i) => (
                  <RouteStopRow
                    key={stop.id ?? i}
                    theme={theme}
                    index={i}
                    stop={stop}
                    eyebrowColor={eyebrow.color}
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
                    pathExpanded={expandedPaths.has(i)}
                    onTogglePath={() => togglePathExpansion(i)}
                    onPress={
                      onBeginAtStop ? () => onBeginAtStop(i, 'city') : undefined
                    }
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        {showFooter ? (
          <View
            style={{
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {onDelete ? (
                <FooterButton
                  theme={theme}
                  label="Delete"
                  color={theme.colors.error}
                  borderColor={mixColors(theme.colors.error, 0.5, theme.colors.border)}
                  onPress={onDelete}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              {showStart ? (
                <Pressable
                  onPress={() => onBegin('city')}
                  style={{
                    backgroundColor: theme.colors.accent,
                    borderColor: theme.colors.accent,
                    borderWidth: 1,
                    borderRadius: theme.radii[3],
                    paddingVertical: 6,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: theme.fonts.body,
                      fontSize: theme.fontSizes[1],
                      fontWeight: String(
                        theme.fontWeights.semibold,
                      ) as TextStyle['fontWeight'],
                      color: theme.colors.background,
                    }}
                  >
                    Start
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {diagramButtonVisible ? (
                <FooterButton
                  theme={theme}
                  label="Diagram"
                  color={theme.colors.textSecondary}
                  borderColor={theme.colors.border}
                  onPress={() => onOpenDiagram?.()}
                />
              ) : null}
            </View>
            {/* Suppress lint about unused var when no slots are filled. */}
            {footerSlotCount === 0 ? null : null}
          </View>
        ) : null}
      </View>

      {/* Avatar strips */}
      {isShared && signOffs && signOffs.length > 0 ? (
        <AvatarStrip
          theme={theme}
          label="REVIEWED BY"
          ringed
          entries={signOffs.map((s) => {
            const hasNotes = (notesByAuthor?.[s.author]?.length ?? 0) > 0;
            return {
              key: s.id,
              name: s.author,
              onPress: hasNotes ? () => handleAvatarPress(s.author) : undefined,
              active: noteAuthorFilter === s.author,
            };
          })}
        />
      ) : null}
      {notedBy && notedBy.length > 0 ? (
        <AvatarStrip
          theme={theme}
          label="NOTES BY"
          entries={notedBy.map((name) => {
            const hasNotes = (notesByAuthor?.[name]?.length ?? 0) > 0;
            return {
              key: name,
              name,
              onPress: hasNotes ? () => handleAvatarPress(name) : undefined,
              active: noteAuthorFilter === name,
            };
          })}
        />
      ) : null}
      {isShared && visitedBy && visitedBy.verified.length > 0 ? (
        <AvatarStrip
          theme={theme}
          label="VISITED BY"
          entries={visitedBy.verified.map((name) => ({ key: name, name }))}
        />
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
  index: number;
  stop: TrailBriefCardStop;
  eyebrowColor: string;
  isLast: boolean;
  matchesFilter: boolean;
  dimmed: boolean;
  pathExpanded: boolean;
  onTogglePath: () => void;
  onPress?: () => void;
}> = ({
  theme,
  index,
  stop,
  eyebrowColor,
  isLast,
  matchesFilter,
  dimmed,
  pathExpanded,
  onTogglePath,
  onPress,
}) => {
  const fileName = stop.sourcePath
    ? stop.sourcePath.split('/').pop() || stop.sourcePath
    : null;
  const rowBackground = matchesFilter
    ? withAlpha(theme.colors.accent, 0.18)
    : 'transparent';
  const labelColor =
    stop.kind === 'subject' ? eyebrowColor : theme.colors.text;
  const numberColor =
    stop.kind === 'subject' ? eyebrowColor : theme.colors.textTertiary;

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
          paddingVertical: 6,
          paddingHorizontal: 8,
          marginHorizontal: -8,
          borderRadius: theme.radii[1],
          backgroundColor: rowBackground,
          borderLeftWidth: 3,
          borderLeftColor: matchesFilter ? theme.colors.accent : 'transparent',
          paddingLeft: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            disabled={!onPress}
            onPress={onPress}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Text
              style={{
                color: numberColor,
                minWidth: 24,
                fontFamily: theme.fonts.monospace,
                fontSize: theme.fontSizes[1],
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text
              style={{
                flex: 1,
                color: labelColor,
                fontFamily: theme.fonts.monospace,
                fontSize: theme.fontSizes[1],
                lineHeight: theme.fontSizes[1] * 1.6,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stop.label}
            </Text>
          </Pressable>
          {fileName ? (
            <Pressable
              onPress={onTogglePath}
              accessibilityState={{ expanded: pathExpanded }}
              style={{ maxWidth: '50%', marginLeft: 8 }}
            >
              <Text
                style={{
                  color: pathExpanded ? theme.colors.text : theme.colors.textTertiary,
                  fontFamily: theme.fonts.monospace,
                  fontSize: theme.fontSizes[1],
                  textDecorationLine: pathExpanded ? 'underline' : 'none',
                }}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {fileName}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {pathExpanded && stop.sourcePath ? (
          <Text
            style={{
              marginTop: 4,
              marginLeft: 36,
              fontFamily: theme.fonts.monospace,
              fontSize: theme.fontSizes[0],
              color: theme.colors.textTertiary,
              lineHeight: theme.fontSizes[0] * 1.4,
            }}
          >
            {stop.sourcePath}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const FooterButton: React.FC<{
  theme: Theme;
  label: string;
  color: string;
  borderColor: string;
  onPress: () => void;
}> = ({ theme, label, color, borderColor, onPress }) => (
  <Pressable
    onPress={onPress}
    style={{
      borderWidth: 1,
      borderColor,
      borderRadius: theme.radii[2],
      paddingVertical: 5,
      paddingHorizontal: 10,
    }}
  >
    <Text
      style={{
        fontFamily: theme.fonts.monospace,
        fontSize: theme.fontSizes[0],
        color,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: String(theme.fontWeights.medium) as TextStyle['fontWeight'],
      }}
    >
      {label}
    </Text>
  </Pressable>
);

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
            <Avatar theme={theme} name={entry.name} size={24} ringed={ringed} />
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
