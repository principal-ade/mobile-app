/**
 * Minimal stand-in for CSS `color-mix(in srgb, ...)` so the trail brief card
 * can carry over the same eyebrow-tinted borders and pill backgrounds the web
 * version uses. Returns an `rgba()` string suitable for any RN color prop.
 *
 * Supports the two shapes the card actually emits:
 *   - `mix(color, weight, 'transparent')` → `color` with alpha = weight
 *   - `mix(colorA, weightA, colorB)`      → linear blend of the two opaques
 */

type RGBA = { r: number; g: number; b: number; a: number };

const parseHex = (hex: string): RGBA | null => {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b, a };
};

const parseFunctional = (color: string): RGBA | null => {
  const m = color
    .trim()
    .match(/^rgba?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/);
  if (!m) return null;
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
    a: m[4] != null ? Number(m[4]) : 1,
  };
};

const parseColor = (color: string): RGBA => {
  if (color === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  return (
    parseHex(color) ?? parseFunctional(color) ?? { r: 0, g: 0, b: 0, a: 1 }
  );
};

const toRgbaString = ({ r, g, b, a }: RGBA): string =>
  `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;

/**
 * Mix `colorA` (at `weight` fraction, 0..1) with `colorB`. When `colorB` is
 * omitted or `'transparent'`, this collapses to "apply `weight` as alpha on
 * `colorA`" — the most common eyebrow-tint pattern in the card.
 */
export const mixColors = (
  colorA: string,
  weight: number,
  colorB: string = 'transparent',
): string => {
  const w = Math.max(0, Math.min(1, weight));
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  // Linear blend in sRGB — same model `color-mix(in srgb, ...)` uses.
  return toRgbaString({
    r: Math.round(a.r * w + b.r * (1 - w)),
    g: Math.round(a.g * w + b.g * (1 - w)),
    b: Math.round(a.b * w + b.b * (1 - w)),
    a: a.a * w + b.a * (1 - w),
  });
};

/** Convenience: same as `mixColors(color, weight, 'transparent')`. */
export const withAlpha = (color: string, weight: number): string =>
  mixColors(color, weight, 'transparent');
