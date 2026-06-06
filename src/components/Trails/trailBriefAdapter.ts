/**
 * Map a stored `TrailPayload` onto the prop shape `TrailBriefCard`
 * expects. The card is intentionally narrow (label / sourcePath /
 * description / kind per stop) — this adapter pulls just those bits
 * out of the richer payload shape and derives the cohort lists from
 * `notes`.
 */

import type { TrailNote, TrailPayload, TrailSnippetNote } from '../../types/Trail';
import type {
  TrailBriefCardProps,
  TrailBriefCardStop,
  TrailBriefNote,
} from './TrailBriefCard';

/** EN DASH — line-range separator in note location captions. */
const RANGE_DASH = '–';

/**
 * Build the monospace location caption for a snippet note, e.g.
 * `src/auth/session.ts:12–18`. Slice anchors span first-range start to
 * last-range end; diff anchors point at a single line. Returns undefined
 * when there's no path to anchor against.
 */
function snippetAnchorCaption(
  note: TrailSnippetNote,
  sourcePath: string | undefined,
): string | undefined {
  if (!sourcePath) return undefined;
  if (note.anchor.kind === 'slice') {
    const ranges = note.anchor.ranges;
    if (ranges.length === 0) return sourcePath;
    const start = ranges[0].startLine;
    const end = ranges[ranges.length - 1].endLine;
    return start === end
      ? `${sourcePath}:${start}`
      : `${sourcePath}:${start}${RANGE_DASH}${end}`;
  }
  return `${sourcePath}:${note.anchor.lineNumber}`;
}

/** Flatten a stored note onto the narrow shape the card renders. */
function toBriefNote(
  note: TrailNote,
  sourcePath: string | undefined,
): TrailBriefNote {
  return {
    id: note.id,
    author: note.author,
    body: note.body,
    createdAt: note.createdAt,
    anchorCaption:
      note.kind === 'snippet'
        ? snippetAnchorCaption(note, sourcePath)
        : undefined,
  };
}

export function trailPayloadToBriefProps(
  payload: TrailPayload,
): Omit<TrailBriefCardProps, 'presentation'> {
  // markerId → sourcePath, used to caption snippet notes by location.
  const sourcePathByMarker = new Map<string, string | undefined>();
  payload.markers.forEach((m) => sourcePathByMarker.set(m.id, m.sourcePath));

  // Group note bodies: marker-scoped notes attach to their stop;
  // summary-scoped markdown notes surface under the Overview row.
  const notesByMarker: Record<string, TrailBriefNote[]> = {};
  const summaryNotes: TrailBriefNote[] = [];
  payload.notes?.forEach((n) => {
    // Marker-scoped notes attach to their stop; summary-scoped markdown
    // notes surface under the Overview row instead.
    let markerId: string;
    if (n.kind === 'snippet') {
      markerId = n.scope.markerId;
    } else if (n.scope.kind === 'description') {
      markerId = n.scope.markerId;
    } else {
      summaryNotes.push(toBriefNote(n, undefined));
      return;
    }
    const list = notesByMarker[markerId] ?? [];
    list.push(toBriefNote(n, sourcePathByMarker.get(markerId)));
    notesByMarker[markerId] = list;
  });

  const stops: TrailBriefCardStop[] = payload.markers.map((marker, i) => ({
    id: marker.id,
    label: marker.label ?? `Step ${i + 1}`,
    sourcePath: marker.sourcePath,
    kind: marker.kind,
    description: marker.description,
    notes: notesByMarker[marker.id],
    snippet: marker.snippet,
  }));

  // Distinct repo count — `repos` is the canonical registry; fall back
  // to deduping marker repos when the registry is absent (single-repo
  // trails often omit it).
  const repoIds = new Set<string>();
  payload.repos?.forEach((r) => repoIds.add(r.id));
  payload.markers.forEach((m) => {
    if (m.repo) repoIds.add(m.repo);
  });

  const fileCount = new Set(
    payload.markers
      .map((m) => m.sourcePath)
      .filter((p): p is string => !!p),
  ).size;

  // Distinct authors of notes — feeds the NOTES BY strip + the avatar
  // tap filter (notesByAuthor maps author → markerIds[]).
  const notesByAuthor: Record<string, string[]> = {};
  payload.notes?.forEach((n) => {
    // Snippet notes always carry a markerId; markdown notes only when
    // scoped to a description (summary-scoped notes are global).
    let markerId: string | null = null;
    if (n.kind === 'snippet') {
      markerId = n.scope.markerId;
    } else if (n.scope.kind === 'description') {
      markerId = n.scope.markerId;
    }
    if (!markerId) return;
    const list = notesByAuthor[n.author] ?? [];
    if (!list.includes(markerId)) list.push(markerId);
    notesByAuthor[n.author] = list;
  });
  const notedBy = Object.keys(notesByAuthor);

  return {
    body: payload.summary ?? '',
    title: payload.title,
    request: payload.request,
    author: payload.author,
    createdAt: payload.createdAt,
    repoCount: repoIds.size,
    fileCount,
    stops,
    signOffs: payload.signOffs,
    summaryNotes: summaryNotes.length > 0 ? summaryNotes : undefined,
    notedBy: notedBy.length > 0 ? notedBy : undefined,
    notesByAuthor: notedBy.length > 0 ? notesByAuthor : undefined,
    isShared: !!payload.share,
    purpose: payload.purpose,
  };
}
