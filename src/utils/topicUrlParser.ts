/**
 * Extract a topic id from clipboard input. Accepts either a bare UUID
 * (the form web-ade uses internally) or any URL whose path contains
 * `/topic/<uuid>` — e.g. `https://app.principal-ade.com/topic/...`,
 * `https://localhost:3000/topic/...`, or just `/topic/...`.
 *
 * Returns the UUID string or `null` if the input doesn't contain one.
 * Sibling of `trailUrlParser.extractTrailId`.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTopicUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function extractTopicId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isTopicUuid(trimmed)) return trimmed;
  const match = trimmed.match(/topic\/([0-9a-f-]+)/i);
  if (match && isTopicUuid(match[1])) return match[1];
  return null;
}
