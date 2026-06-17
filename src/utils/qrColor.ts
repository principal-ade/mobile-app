/**
 * QR module-color helpers shared by the screens that render a QR code
 * (About screen, the trail-tutorial "make a trail" finale). Kept here so
 * both surfaces pick the same on-brand, high-contrast module color for a
 * given background instead of duplicating the math.
 */

/**
 * Mix a hex color toward black by `amount` (0 = unchanged, 1 = black).
 * Used to darken the theme primary into a high-contrast QR module color —
 * the bright brand primary on white scans poorly, the darkened tint reads
 * on-brand while keeping ~10:1 contrast. Falls back to near-black for any
 * non-hex input.
 */
export function darken(color: string, amount: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!m) return '#0a0f14';
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const t = Math.max(0, Math.min(1, amount));
  const ch = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

/** Perceived luminance (0 = black, 1 = white) of a hex color; defaults to
 *  dark for non-hex input so callers treat unknowns as a dark surface. */
export function isLightColor(color: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!m) return false;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Rec. 601 luma — cheap and good enough for a light/dark decision.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/**
 * QR module color for a given background: on a light surface use the
 * darkened brand primary (normal dark-on-light QR); on a dark surface use
 * the bright primary so the code stays on-brand as a high-contrast
 * inverted QR. Keeps the code on the app's own background color in either
 * theme while preserving the contrast a scanner needs.
 */
export function qrModuleColor(primary: string, background: string): string {
  return isLightColor(background) ? darken(primary, 0.65) : primary;
}
