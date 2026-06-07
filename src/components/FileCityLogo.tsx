import React, { useId } from 'react';
import Svg, {
  Rect,
  G,
  Path,
  Circle,
  Defs,
  ClipPath,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from '@principal-ade/industry-theme';
import type { Theme } from '@principal-ade/industry-theme';

/**
 * React Native port of the web `FileCityLogo` from the `logo-component`
 * workspace. The web original renders raw DOM SVG; this version draws the
 * identical geometry with `react-native-svg` primitives. The static look is
 * faithful to the source — the animated heatmap build-on is web-only (CSS
 * keyframes + masks) and is intentionally not ported.
 */

export type FileCityMark = 'P' | 'AI' | 'PAI' | 'lockup' | 'none';

/**
 * How the per-file shading of the mark is chosen.
 * - `scatter`: each file picks a random shade (the default texture)
 * - `vertical` / `horizontal` / `diagonal`: a smooth directional gradient
 *   across the grid, dark → light.
 */
export type FileCityGradient =
  | 'scatter'
  | 'vertical'
  | 'horizontal'
  | 'diagonal';

export interface FileCityLogoProps {
  width?: number;
  height?: number;
  /**
   * Which brand mark the primary-colored files spell out. `'none'` is a
   * plain city grid with an optional single highlighted file.
   */
  mark?: FileCityMark;
  /**
   * Primary color — the tint of the files that form the mark and the
   * brighter building shades. Defaults to the theme's `primary`.
   */
  primary?: string;
  /**
   * Accent color used for the `trail` overlay so it stands apart from
   * the primary-colored mark. Defaults to the theme's `accent` (falling
   * back to the primary color).
   */
  accent?: string;
  /**
   * Base color the neutral building tints are derived from (the
   * equivalent of the theme's text color in TrailCityDiagram).
   */
  color?: string;
  /**
   * Panel background behind the grid. Pass `"transparent"` to drop the
   * panel and let the mark sit directly on its surface.
   */
  background?: string;
  /**
   * Optional theme — fills `primary` / `color` / `background` for any
   * that aren't passed explicitly. Defaults to the app theme via
   * `useTheme()`.
   */
  theme?: Theme;
  /** Grid size for the `'none'` plain-city variant (columns === rows). */
  cells?: number;
  /** For `mark="none"`: highlight one center file in the primary color. */
  highlight?: boolean;
  /**
   * Render part of the mark as a code trail — the lower stem + base of
   * the P's bowl become a dashed path with marker dots instead of solid
   * files, nodding to TrailCityDiagram. Only applies to marks containing
   * a "P" (`"P"` and `"PAI"`).
   */
  trail?: boolean;
  /**
   * How the mark's files are shaded. `diagonal` (default) runs a smooth
   * dark→light gradient corner to corner; `vertical` / `horizontal` do
   * the same in other directions; `scatter` gives each file a random shade.
   */
  gradient?: FileCityGradient;
  /** Round the panel corners. Default true. */
  rounded?: boolean;
  /**
   * Empty ring of city cells around the mark glyph, in cells. `1`
   * (default) gives the mark breathing room; `0` packs the glyph
   * edge-to-edge so each square is larger — e.g. a 3×5 "P" fills a 5×5
   * grid instead of sitting in a 7×7 one.
   */
  margin?: number;
  /**
   * Drop a small "file card" into the bottom-right of the grid (3 cells
   * across × 2 down) with **AI** as its contents — echoing the filename +
   * snippet card from TrailCityDiagram. Only applies to `mark="P"`; the P
   * is nudged one column left to clear room for the card.
   */
  aiCard?: boolean;
  opacity?: number;
}

const VIEW = 100;
// Corner radius for the rounded panel, as a fraction of the panel side.
// macOS app icons use a ~22.4% continuous-corner ("squircle") radius; a
// plain SVG rx is a close approximation.
const PANEL_RADIUS = VIEW * 0.2237;
// Width of the edge hairline (in viewBox units) that keeps the icon
// defined against the dock background.
const HAIRLINE = 0.75;

// 5-row pixel glyphs — the primary-colored files trace these.
//   `1` = a mark (primary) file
//   `H` = the letter's counter — a forced hole (background shows through,
//         no city file) so the loop reads as a real hole
//   `0` = a city file (muted backdrop)
const GLYPHS: Record<'P' | 'A' | 'I', string[]> = {
  // Closed bowl with a single hole punched in its center.
  P: ['111', '1H1', '111', '100', '100'],
  A: ['0110', '1HH1', '1111', '1001', '1001'],
  I: ['111', '010', '010', '010', '111'],
};

type CellKind = 'mark' | 'accent' | 'accentDim' | 'void' | 'city';

const MARK_LETTERS: Record<'P' | 'AI' | 'PAI', Array<'P' | 'A' | 'I'>> = {
  P: ['P'],
  AI: ['A', 'I'],
  PAI: ['P', 'A', 'I'],
};

/** Compose letters side by side (1 city column between them) into a
 *  single kind map: 1 = mark, 2 = void/hole, 0 = city. */
function composeMark(letters: Array<'P' | 'A' | 'I'>, gap = 1): number[][] {
  const rows = 5;
  const out: number[][] = Array.from({ length: rows }, () => [] as number[]);
  letters.forEach((key, li) => {
    if (li > 0) for (let r = 0; r < rows; r++) out[r].push(...new Array(gap).fill(0));
    const glyph = GLYPHS[key];
    for (let r = 0; r < rows; r++) {
      for (const ch of glyph[r]) out[r].push(ch === '1' ? 1 : ch === 'H' ? 2 : 0);
    }
  });
  return out;
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function withAlpha(color: string, alpha: number): string {
  // Accept #rgb / #rrggbb — leave non-hex as-is and rely on the caller.
  if (/^#([0-9a-f]{3}){1,2}$/i.test(color)) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `#${hex}${a}`;
  }
  return color;
}

function toRgb(color: string): [number, number, number] | null {
  if (!/^#([0-9a-f]{3}){1,2}$/i.test(color)) return null;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** Blend two colors. `t` = 0 returns `a`, `t` = 1 returns `b`. Falls
 *  back to `a` when either side isn't a parseable hex. */
function mix(a: string, b: string, t: number): string {
  const ca = toRgb(a);
  const cb = toRgb(b);
  if (!ca || !cb) return a;
  const ch = (i: number) =>
    Math.round(ca[i] + (cb[i] - ca[i]) * Math.max(0, Math.min(1, t)))
      .toString(16)
      .padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

/**
 * One rendered grid square of the file-city mark: its position, final
 * fill / stroke, and whether it belongs to the letter.
 */
export interface FileCityCell {
  key: string;
  c: number;
  r: number;
  x: number;
  y: number;
  sq: number;
  rx: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  isLetter: boolean;
  weight: number;
}

/** The resolved geometry + palette for a {@link FileCityLogo}. */
export interface FileCityLayout {
  /** Grid squares, post skip/void culling, in render order. */
  cells: FileCityCell[];
  /** Overlay nodes (trail path/dots, AI card) drawn above the grid. */
  extras: React.ReactNode[];
  bgColor: string;
  baseColor: string;
  rounded: boolean;
  opacity: number;
  mark: FileCityMark;
}

/**
 * Compute the full layout (cells + overlays + palette) for a file-city
 * mark from the public props. Pure — no hooks.
 */
export function computeFileCityLayout({
  mark = 'P',
  primary,
  accent,
  color,
  background,
  theme,
  cells = 5,
  highlight = true,
  trail = false,
  gradient = 'diagonal',
  rounded = true,
  margin = 1,
  aiCard = false,
  opacity = 0.9,
}: FileCityLogoProps): FileCityLayout {
  const primaryColor = primary ?? theme?.colors.primary ?? '#22d3ee';
  const accentColor = accent ?? theme?.colors.accent ?? primaryColor;
  const baseColor = color ?? theme?.colors.text ?? '#f8fafc';
  const bgColor = background ?? theme?.colors.background ?? '#0a0f14';

  // Same palette weighting as TrailCityDiagram so the two read as a set.
  const palette = [
    withAlpha(primaryColor, 0.18),
    withAlpha(primaryColor, 0.32),
    withAlpha(baseColor, 0.08),
    withAlpha(baseColor, 0.14),
    withAlpha(baseColor, 0.22),
  ];

  // The mark files vary in shade so the letter doesn't read as one flat
  // block, but every shade stays vivid so it still stands out from the
  // muted city behind it.
  const markPalette = [
    primaryColor,
    mix(primaryColor, '#ffffff', 0.22),
    mix(primaryColor, '#ffffff', 0.1),
    withAlpha(primaryColor, 0.82),
  ];

  // Same idea for `accent` cells (e.g. the AI in the lockup), so they
  // read in the accent color while the P stays primary.
  const accentPalette = [
    accentColor,
    mix(accentColor, '#ffffff', 0.22),
    mix(accentColor, '#ffffff', 0.1),
    withAlpha(accentColor, 0.82),
  ];

  // Dimmed accent — used for the A in the lockup so it sits back from the
  // brighter I.
  const accentDimPalette = [
    withAlpha(accentColor, 0.5),
    withAlpha(accentColor, 0.62),
    withAlpha(accentColor, 0.42),
    withAlpha(accentColor, 0.55),
  ];

  // Build a square grid. For `mark="none"` it's a plain `cells × cells`
  // city; otherwise the glyph bitmap sits inside a square grid (side =
  // longest glyph dimension + a margin ring) so the city reads square.
  const trailEnabled = trail && (mark === 'P' || mark === 'PAI');
  const aiCardOn = aiCard && mark === 'P';
  let side: number;
  let offX = 0;
  let offY = 0;
  let kindAt: (c: number, r: number) => CellKind;

  if (mark === 'none') {
    side = cells;
    const hi = Math.floor((cells - 1) / 2);
    kindAt = (c, r) => (highlight && c === hi && r === hi ? 'mark' : 'city');
  } else if (mark === 'lockup') {
    // Brand lockup: P on the left (cols 0-2, vertically centered), a gap
    // column, then a stacked "AI" filling the right 3 columns — A in the
    // top 4 rows, I in the bottom 3.
    side = 7;
    const pGlyph = GLYPHS.P; // 3 × 5
    const aGlyph = ['111', '1H1', '111', '101']; // 3 × 4
    const iGlyph = ['111', '010', '111']; // 3 × 3
    const at = (g: string[], gc: number, gr: number): string | null => {
      if (gr < 0 || gr >= g.length) return null;
      const row = g[gr];
      return gc < 0 || gc >= row.length ? null : row[gc];
    };
    kindAt = (c, r) => {
      // P is primary; the stacked AI is accent.
      const pch = at(pGlyph, c, r - 1); // P: cols 0-2, rows 1-5
      if (pch != null) {
        return pch === '1' ? 'mark' : pch === 'H' ? 'void' : 'city';
      }
      const ach = at(aGlyph, c - 4, r); // A: cols 4-6, rows 0-3 (dimmer)
      if (ach != null) {
        return ach === '1' ? 'accentDim' : ach === 'H' ? 'void' : 'city';
      }
      const ich = at(iGlyph, c - 4, r - 4); // I: cols 4-6, rows 4-6 (brighter)
      if (ich != null) {
        return ich === '1' ? 'accent' : ich === 'H' ? 'void' : 'city';
      }
      return 'city';
    };
  } else {
    const bitmap = composeMark(MARK_LETTERS[mark]);
    const bw = bitmap[0].length;
    const bh = bitmap.length;
    side = Math.max(bw, bh) + margin * 2;
    // With a trail, shove the letter to the left so the trail has room
    // on the right; otherwise center it in the square.
    offX = trailEnabled ? margin : Math.floor((side - bw) / 2);
    // Nudge the P one column left so the AI card has room on the right.
    if (aiCardOn) offX = Math.max(0, offX - 1);
    offY = Math.floor((side - bh) / 2);
    kindAt = (c, r) => {
      const bc = c - offX;
      const br = r - offY;
      if (br < 0 || br >= bh || bc < 0 || bc >= bw) return 'city';
      const v = bitmap[br][bc];
      return v === 1 ? 'mark' : v === 2 ? 'void' : 'city';
    };
  }
  const cols = side;
  const rows = side;

  // The AI card occupies the bottom-right 4×3 block of cells. Those cells
  // render no building — the card covers them.
  const AI_CARD_COLS = 3;
  const AI_CARD_ROWS = 2;
  // Inset one cell up and left from the bottom-right corner.
  const aiCardC0 = cols - AI_CARD_COLS - 1;
  const aiCardR0 = rows - AI_CARD_ROWS - 1;
  // Nudge the card down half a cell so it straddles the row line — its
  // body sits over the bottom of the top row and the top of the bottom
  // row. The city renders behind it, so squares show around its edges.
  const AI_CARD_ROW_SHIFT = 0.5;
  const AI_CARD_COL_SHIFT = 0.5;

  // Trail to the right of the letter — starts in the top-right corner,
  // crosses 2 cells diagonally to its first node, zigzags down, and ends
  // in the bottom-right corner. The dots sit on city files, which are
  // forced to render under them.
  const trailGrid: Array<[number, number]> = trailEnabled
    ? [
        [cols - 1, 0], // start: top-right corner
        [cols - 3, 2], // first segment crosses 2 diagonally
        [cols - 2, 4],
        [cols - 1, rows - 1], // end: bottom-right corner
      ]
    : [];
  const trailKeys = new Set(trailGrid.map(([c, r]) => `${c}-${r}`));
  const centerOf = (c: number, r: number) => ({
    x: startX + c * cell + cell / 2,
    y: startY + r * cell + cell / 2,
  });

  // True when an edge neighbor is a letter file (mark or accent) — those
  // city cells must always render so no empty square shares a side with
  // the letter (and breaks a stroke). Diagonal corners are allowed to go
  // empty, so the margins around the letter still get some missing squares.
  const isLetterKind = (k: CellKind) =>
    k === 'mark' || k === 'accent' || k === 'accentDim';
  const touchesMark = (c: number, r: number) =>
    isLetterKind(kindAt(c - 1, r)) ||
    isLetterKind(kindAt(c + 1, r)) ||
    isLetterKind(kindAt(c, r - 1)) ||
    isLetterKind(kindAt(c, r + 1));

  // Per-file shade for a letter cell. `scatter` keeps the random-shade
  // texture; the directional modes interpolate the letter's base color
  // dark→light across the grid.
  const baseFor = (kind: CellKind) =>
    kind === 'accent'
      ? accentColor
      : kind === 'accentDim'
        ? mix(accentColor, bgColor, 0.45)
        : primaryColor;
  const gradientShade = (base: string, c: number, r: number) => {
    const fx = cols > 1 ? c / (cols - 1) : 0;
    const fy = rows > 1 ? r / (rows - 1) : 0;
    const t =
      gradient === 'vertical'
        ? fy
        : gradient === 'horizontal'
          ? fx
          : (fx + fy) / 2; // diagonal
    const lo = mix(base, '#000000', 0.12);
    const hi = mix(base, '#ffffff', 0.4);
    return mix(lo, hi, t);
  };

  // Square files centered in the panel; letterboxed when the mark is
  // wider than it is tall (AI / PAI).
  const pad = 12;
  const avail = VIEW - pad * 2;
  const cell = Math.min(avail / cols, avail / rows);
  const sq = cell * 0.74; // smaller than the cell → gaps between buildings
  const inset = (cell - sq) / 2;
  const startX = (VIEW - cell * cols) / 2;
  const startY = (VIEW - cell * rows) / 2;

  const rng = mulberry32(7);
  const cellsOut: FileCityCell[] = [];
  const extras: React.ReactNode[] = [];
  // Track the previous cell to the left (per row) and above (per column)
  // so we never leave two empty squares back to back in either
  // direction — that's what produced the long blank runs.
  const colEmpty: boolean[] = new Array(cols).fill(false);
  for (let r = 0; r < rows; r++) {
    let lastEmpty = false;
    for (let c = 0; c < cols; c++) {
      const kind = kindAt(c, r);
      const skipRoll = rng();
      const colorRoll = rng();
      // Void cells are the letter's counter — leave them empty so the
      // background shows through as a real hole. Mark files always
      // render; city files skip occasionally so the primary letters read
      // against a sparser, muted backdrop — but only when the square to
      // the left and the square above are both filled, so gaps stay
      // isolated.
      if (kind === 'void') {
        lastEmpty = true;
        colEmpty[c] = true;
        continue;
      }
      if (
        kind === 'city' &&
        !lastEmpty &&
        !colEmpty[c] &&
        !touchesMark(c, r) &&
        !trailKeys.has(`${c}-${r}`) &&
        skipRoll < 0.2
      ) {
        lastEmpty = true;
        colEmpty[c] = true;
        continue;
      }
      lastEmpty = false;
      colEmpty[c] = false;
      const isLetter = isLetterKind(kind);
      const letterPalette =
        kind === 'accent'
          ? accentPalette
          : kind === 'accentDim'
            ? accentDimPalette
            : markPalette;
      const letterColor =
        kind === 'accent' || kind === 'accentDim' ? accentColor : primaryColor;
      const letterFill =
        gradient === 'scatter'
          ? letterPalette[Math.floor(colorRoll * letterPalette.length)]
          : gradientShade(baseFor(kind), c, r);
      const x = startX + c * cell + inset;
      const y = startY + r * cell + inset;
      cellsOut.push({
        key: `${c}-${r}`,
        c,
        r,
        x,
        y,
        sq,
        rx: Math.max(1, sq * 0.12),
        fill: isLetter
          ? letterFill
          : palette[Math.floor(colorRoll * palette.length)],
        stroke: isLetter ? withAlpha(letterColor, 0.55) : withAlpha(baseColor, 0.08),
        strokeWidth: isLetter ? 0.6 : 0.4,
        isLetter,
        // Letter files weigh the most; city files weigh less.
        weight: isLetter ? 1 : 0.4,
      });
    }
  }

  // AI card — a small file card (filename header band + "AI" contents)
  // dropped into the bottom-right block, mirroring TrailCityDiagram's
  // snippet card.
  if (aiCardOn) {
    const cx0 = startX + (aiCardC0 + AI_CARD_COL_SHIFT) * cell + inset;
    const cy0 = startY + (aiCardR0 + AI_CARD_ROW_SHIFT) * cell + inset;
    const cw = AI_CARD_COLS * cell - inset * 2;
    const chh = AI_CARD_ROWS * cell - inset * 2;
    const headerH = chh * 0.28;
    const cardR = Math.max(2, cell * 0.2);
    const barH = Math.max(1, headerH * 0.26);
    const fs = Math.min(cw * 0.42, (chh - headerH) * 0.64);

    // Leader — anchored at the center of the P's bottom square. Routed
    // with right-angle segments: down, right, up, then right into the
    // card's left edge, "opening" the block. Dot at each end.
    const aX = startX + (offX + 0.5) * cell; // center of the stem column
    const aY = startY + (offY + 4.5) * cell; // middle of the bottom square
    const bX = cx0; // left edge of the card
    const bY = cy0 + chh * 0.2; // near the top of that edge
    // Route along grid centerlines so the runs thread through square
    // centers: dip to the row below the P, climb at the column just left
    // of the card.
    const valleyY = startY + (offY + 5.5) * cell; // center of the next row down
    const turnX = startX + 2.5 * cell; // center of the 3rd column
    const dot = Math.max(1, cell * 0.12);
    const leaderPath = `M ${aX} ${aY} L ${aX} ${valleyY} L ${turnX} ${valleyY} L ${turnX} ${bY} L ${bX} ${bY}`;
    extras.push(
      <G key="ai-leader" opacity={0.75}>
        <Path
          d={leaderPath}
          fill="none"
          stroke={accentColor}
          strokeWidth={Math.max(0.6, cell * 0.07)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[cell * 0.2, cell * 0.15]}
        />
        <Circle cx={aX} cy={aY} r={dot} fill={accentColor} />
        <Circle cx={bX} cy={bY} r={dot} fill={accentColor} />
      </G>,
    );
    extras.push(
      <G key="ai-card">
        <Rect
          x={cx0}
          y={cy0}
          width={cw}
          height={chh}
          rx={cardR}
          fill={mix(bgColor, '#ffffff', 0.06)}
          stroke={withAlpha(accentColor, 0.55)}
          strokeWidth={0.8}
        />
        {/* Header band — only the top corners rounded, like a file tab. */}
        <Path
          d={`M ${cx0} ${cy0 + headerH} L ${cx0} ${cy0 + cardR} Q ${cx0} ${cy0} ${cx0 + cardR} ${cy0} L ${cx0 + cw - cardR} ${cy0} Q ${cx0 + cw} ${cy0} ${cx0 + cw} ${cy0 + cardR} L ${cx0 + cw} ${cy0 + headerH} Z`}
          fill={withAlpha(accentColor, 0.14)}
        />
        {/* Filename placeholder bar. */}
        <Rect
          x={cx0 + cw * 0.16}
          y={cy0 + headerH / 2 - barH / 2}
          width={cw * 0.44}
          height={barH}
          rx={barH / 2}
          fill={withAlpha(baseColor, 0.5)}
        />
        {/* Contents — "AI" instead of code lines. */}
        <SvgText
          x={cx0 + cw / 2}
          y={cy0 + headerH + (chh - headerH) / 2}
          textAnchor="middle"
          alignmentBaseline="central"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight="700"
          fontSize={fs}
          letterSpacing={fs * 0.06}
          fill={accentColor}
        >
          AI
        </SvgText>
      </G>,
    );
  }

  // Trail overlay — a dashed accent path to the right of the letter with
  // a marker dot on each node.
  if (trailEnabled && trailGrid.length > 1) {
    const linePts = trailGrid.map(([c, r]) => centerOf(c, r));
    const d = linePts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
    const dot = Math.max(1.5, sq * 0.3);
    extras.push(
      <Path
        key="trail-path"
        d={d}
        fill="none"
        stroke={accentColor}
        strokeWidth={Math.max(1, cell * 0.12)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[cell * 0.18, cell * 0.18]}
        opacity={0.9}
      />,
    );
    trailGrid.forEach(([c, r], i) => {
      const p = centerOf(c, r);
      extras.push(
        <Circle
          key={`trail-dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={dot}
          fill={mix(accentColor, '#ffffff', 0.15)}
          stroke={bgColor}
          strokeWidth={0.5}
        />,
      );
    });
  }

  return { cells: cellsOut, extras, bgColor, baseColor, rounded, opacity, mark };
}

/** Accessible label for a given mark. */
export function fileCityLabel(mark: FileCityMark): string {
  return mark === 'none'
    ? 'A top-down grid of file squares'
    : `A top-down grid of file squares spelling ${mark}`;
}

/**
 * A compact, iconic "file city" mark — a top-down grid of file squares
 * where the primary-colored files spell out the brand mark (P / AI / PAI)
 * so the letters emerge from the muted city.
 */
export function FileCityLogo(props: FileCityLogoProps) {
  const { theme: appTheme } = useTheme();
  const { width = 150, height = 150 } = props;
  const uid = useId().replace(/:/g, '');
  // Fall back to the app theme for any color not passed explicitly, the
  // way the existing Logo does — while still allowing a raw `theme` prop.
  const { cells, extras, bgColor, baseColor, rounded, opacity, mark } =
    computeFileCityLayout({ theme: appTheme, ...props });

  const clipId = `fc-panel-${uid}`;
  const panelR = rounded ? PANEL_RADIUS : 0;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      opacity={opacity}
      accessibilityRole="image"
      accessibilityLabel={fileCityLabel(mark)}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={VIEW} height={VIEW} rx={panelR} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x={0} y={0} width={VIEW} height={VIEW} fill={bgColor} rx={panelR} />
        {cells.map((cell) => (
          <Rect
            key={cell.key}
            x={cell.x}
            y={cell.y}
            width={cell.sq}
            height={cell.sq}
            rx={cell.rx}
            fill={cell.fill}
            stroke={cell.stroke}
            strokeWidth={cell.strokeWidth}
          />
        ))}
        {extras}
      </G>
      {/* Hairline tracing the panel edge so the icon stays defined against
          both light and dark backgrounds. Inset by half its width so the
          whole stroke sits inside the canvas, radius reduced to match. */}
      <Rect
        x={HAIRLINE / 2}
        y={HAIRLINE / 2}
        width={VIEW - HAIRLINE}
        height={VIEW - HAIRLINE}
        rx={rounded ? Math.max(0, PANEL_RADIUS - HAIRLINE / 2) : 0}
        fill="none"
        stroke={withAlpha(baseColor, 0.14)}
        strokeWidth={HAIRLINE}
      />
    </Svg>
  );
}

export default FileCityLogo;
