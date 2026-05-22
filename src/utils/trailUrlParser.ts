/**
 * Extract a trail id from clipboard input. Accepts either a bare UUID
 * (the form web-ade uses internally) or any URL whose path contains
 * `/trail/<uuid>` — e.g. `https://app.principal-ade.com/trail/...`,
 * `https://localhost:3000/trail/...`, or just `/trail/...`.
 *
 * Returns the UUID string or `null` if the input doesn't contain one.
 * Mirrors `extractTrailId` in `web-ade/src/lib/topics/validation.ts`
 * so mobile and web agree on what counts as a trail link.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTrailUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function extractTrailId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isTrailUuid(trimmed)) return trimmed;
  const match = trimmed.match(/trail\/([0-9a-f-]+)/i);
  if (match && isTrailUuid(match[1])) return match[1];
  return null;
}
