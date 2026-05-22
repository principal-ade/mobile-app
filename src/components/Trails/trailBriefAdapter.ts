/**
 * Map a stored `TrailPayload` onto the prop shape `TrailBriefCard`
 * expects. The card is intentionally narrow (label / sourcePath /
 * description / kind per stop) — this adapter pulls just those bits
 * out of the richer payload shape and derives the cohort lists from
 * `notes`.
 */

import type { TrailPayload } from '../../types/Trail';
import type {
  TrailBriefCardProps,
  TrailBriefCardStop,
} from './TrailBriefCard';

export function trailPayloadToBriefProps(
  payload: TrailPayload,
): Omit<TrailBriefCardProps, 'presentation'> {
  const stops: TrailBriefCardStop[] = payload.markers.map((marker, i) => ({
    id: marker.id,
    label: marker.label ?? `Step ${i + 1}`,
    sourcePath: marker.sourcePath,
    kind: marker.kind,
    description: marker.description,
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
    notedBy: notedBy.length > 0 ? notedBy : undefined,
    notesByAuthor: notedBy.length > 0 ? notesByAuthor : undefined,
    isShared: !!payload.share,
    purpose: payload.purpose,
  };
}
