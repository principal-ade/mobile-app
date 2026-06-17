/**
 * Self-contained mock "file city" for the logged-out "Learn about trails"
 * walkthrough. Built once, offline, from the bundled medium mock repo — no
 * network, no auth. The screen morphs ONE city across three steps:
 *
 *   1. plain city            → buildings are files
 *   2. one numbered trail    → a marker path through a few files
 *   3. many trails (coverage)→ the map fills in
 *
 * Everything here is fixture data (mirrors `data/sampleTrail.ts`'s approach):
 * the layers and marker paths are resolved against the *actual* generated
 * building paths so they always match what the canvas renders.
 */

import { generateMockCityData } from '../components/FileCity';
import type {
  CityBuilding,
  CityData,
  HighlightLayer,
} from '../components/FileCity';

/** The onboarding repo — ~40 realistic files (auth flow, forms, tests…). */
export const LEARN_CITY: CityData = generateMockCityData({ complexity: 'medium' });

/**
 * Resolve a human-written path suffix (e.g. `src/services/auth.ts`) to the
 * real building path the builder produced. Exact match first, then a
 * `/suffix` match, then a plain suffix — robust to any root prefixing.
 */
function findBuilding(suffix: string): CityBuilding | undefined {
  const { buildings } = LEARN_CITY;
  return (
    buildings.find((b) => b.path === suffix) ??
    buildings.find((b) => b.path.endsWith('/' + suffix)) ??
    buildings.find((b) => b.path.endsWith(suffix))
  );
}

function resolvePaths(suffixes: string[]): string[] {
  return suffixes
    .map((s) => findBuilding(s)?.path)
    .filter((p): p is string => Boolean(p));
}

/** A coverage trail rendered as a filled highlight layer. */
function buildLayer(
  id: string,
  name: string,
  color: string,
  priority: number,
  suffixes: string[],
): HighlightLayer {
  return {
    id,
    name,
    enabled: true,
    color,
    opacity: 1,
    borderWidth: 2,
    priority,
    items: resolvePaths(suffixes).map((path) => ({
      path,
      type: 'file' as const,
      renderStrategy: 'fill' as const,
    })),
  };
}

/** Accent shared by the single-trail layer + the numbered connector. */
export const TRAIL_COLOR = '#22d3ee';

/** Display name of the walkthrough trail (the one TRAIL_MARKERS describes). */
export const TRAIL_NAME = 'Sign-in flow';

/**
 * Step 2's ordered stops — a tiny "how sign-in flows" trail. `path` is the
 * resolved real building path, so it can be passed straight to the canvas as
 * `markerTrail` and the numbered badges line up with this list.
 */
export const TRAIL_MARKERS: Array<{
  path: string;
  label: string;
  note: string;
}> = [
  {
    path: findBuilding('src/hooks/useAuth.ts')?.path ?? 'src/hooks/useAuth.ts',
    label: 'Start sign-in',
    note: 'The sign-in screen calls this hook when someone submits the form.',
  },
  {
    path: findBuilding('src/services/auth.ts')?.path ?? 'src/services/auth.ts',
    label: 'Build the request',
    note: 'It hands credentials to the auth service, which builds the request.',
  },
  {
    path: findBuilding('src/services/api.ts')?.path ?? 'src/services/api.ts',
    label: 'Call the server',
    note: 'The service sends the request to the server and parses the response.',
  },
  {
    path: findBuilding('src/App.tsx')?.path ?? 'src/App.tsx',
    label: 'Show login success',
    note: 'The signed-in user flows back up, and the app shows the home screen.',
  },
];

/**
 * Common parent directory of the marker paths — used as step 1's default
 * `zoomToPath` so the whole trail stays framed (vs. zooming to one file).
 */
export const TRAIL_FRAME: string = (() => {
  const parts = TRAIL_MARKERS.map((m) => m.path.split('/'));
  const common: string[] = [];
  for (let i = 0; i < parts[0].length - 1; i++) {
    const seg = parts[0][i];
    if (parts.every((p) => p[i] === seg)) common.push(seg);
    else break;
  }
  return common.join('/');
})();

/** The single highlighted trail shown in step 2 (the marker path's files). */
export const SINGLE_TRAIL_LAYER: HighlightLayer = buildLayer(
  'auth-trail',
  'Sign-in flow',
  TRAIL_COLOR,
  100,
  TRAIL_MARKERS.map((m) => m.path),
);

/**
 * Step 3 — several trails at once. Each is a distinct color; together they
 * "cover" much of the city, standing in for accumulated understanding. Also
 * drives the on-screen legend.
 */
// Each trail threads the files that collaborate in one *flow* (crossing
// directories), not a category of files — so they read as paths through the
// codebase. Trails overlap on shared files, which is the point: flows reuse code.
export const COVERAGE_LAYERS: HighlightLayer[] = [
  buildLayer('cov-signin', 'Sign-in flow', TRAIL_COLOR, 50, [
    'src/hooks/useAuth.ts',
    'src/services/auth.ts',
    'src/services/api.ts',
    'src/types/user.ts',
    'src/services/analytics.ts',
  ]),
  buildLayer('cov-form', 'Form submit', '#f472b6', 40, [
    'src/components/forms/Form.tsx',
    'src/components/forms/Input.tsx',
    'src/components/forms/Select.tsx',
    'src/components/forms/Checkbox.tsx',
    'src/utils/validators.ts',
    'src/hooks/useApi.ts',
    'src/services/api.ts',
  ]),
  buildLayer('cov-fetch', 'Load & render data', '#a78bfa', 30, [
    'src/App.tsx',
    'src/hooks/useApi.ts',
    'src/services/api.ts',
    'src/types/api.ts',
    'src/components/Card.tsx',
    'src/components/Modal.tsx',
    'src/utils/formatters.ts',
  ]),
  buildLayer('cov-persist', 'Save & restore', '#34d399', 20, [
    'src/hooks/useLocalStorage.ts',
    'src/services/storage.ts',
    'src/utils/helpers.ts',
    'src/utils/constants.ts',
  ]),
  buildLayer('cov-startup', 'App startup', '#fbbf24', 10, [
    'src/index.ts',
    'src/App.tsx',
    'src/components/Header.tsx',
    'src/components/Footer.tsx',
    'src/components/Button.tsx',
  ]),
];

// ── Step 4 — team coverage. Each teammate "understands" part of the city; the
// union of all four covers every building (100%). Selecting one isolates their
// slice; tapping a file lists who covers it. ──

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  color: string;
  /** Resolved building paths this teammate covers. */
  files: string[];
};

/**
 * Themed assignment by path suffix. A few files are deliberately shared (e.g.
 * `src/App.tsx`, `src/services/api.ts`) so tapping them shows two coverers.
 * After the themed pass, every still-unclaimed building is swept into Diego so
 * the team's union is always the whole city — "together = full coverage".
 */
const TEAM_SPEC: Array<Omit<TeamMember, 'files'> & { suffixes: string[] }> = [
  {
    id: 'aisha',
    name: 'Aisha',
    initials: 'Ai',
    color: '#22d3ee',
    suffixes: ['src/App.tsx', 'src/components/'],
  },
  {
    id: 'ben',
    name: 'Ben',
    initials: 'Be',
    color: '#f472b6',
    suffixes: ['src/services/', 'src/hooks/', 'src/App.tsx'],
  },
  {
    id: 'carla',
    name: 'Carla',
    initials: 'Ca',
    color: '#a78bfa',
    suffixes: ['src/types/', 'src/utils/', 'src/index.ts', 'src/services/api.ts'],
  },
  {
    id: 'diego',
    name: 'Diego',
    initials: 'Di',
    color: '#fbbf24',
    suffixes: [
      'tests/',
      'package.json',
      'tsconfig.json',
      '.gitignore',
      'jest.config.js',
      'README.md',
      'src/components/Button.test.tsx',
    ],
  },
];

/** Buildings whose path contains any of the given suffix fragments. */
function buildingsMatching(suffixes: string[]): string[] {
  return LEARN_CITY.buildings
    .filter((b) => suffixes.some((s) => b.path === s || b.path.includes(s)))
    .map((b) => b.path);
}

export const TEAM_MEMBERS: TeamMember[] = (() => {
  const members: TeamMember[] = TEAM_SPEC.map(({ suffixes, ...rest }) => ({
    ...rest,
    files: buildingsMatching(suffixes),
  }));
  // Sweep any building no member claimed into the last member (Diego) so the
  // union is guaranteed to be the entire city.
  const claimed = new Set(members.flatMap((m) => m.files));
  const leftovers = LEARN_CITY.buildings
    .map((b) => b.path)
    .filter((p) => !claimed.has(p));
  members[members.length - 1].files.push(...leftovers);
  return members;
})();

/** One filled highlight layer for a teammate (reuses the coverage builder). */
export function teamMemberLayer(member: TeamMember, priority = 50): HighlightLayer {
  return buildLayer(member.id, member.name, member.color, priority, member.files);
}

/** The teammates who cover a given building path (for the file-tap panel). */
export function membersCoveringPath(path: string): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.files.includes(path));
}

// ── Faux file contents for step 1's "tap a building → open the file" card ──

/** Bespoke snippets for a few hero files, keyed by path suffix. */
const HERO_SNIPPETS: Array<{ match: string; lines: string[] }> = [
  {
    match: 'services/auth.ts',
    lines: [
      'export async function login(email, password) {',
      "  const res = await api.post('/login', { email, password });",
      '  if (!res.ok) throw new AuthError(res.status);',
      '  return res.json();',
      '}',
    ],
  },
  {
    match: 'hooks/useAuth.ts',
    lines: [
      'export function useAuth() {',
      '  const [user, setUser] = useState(null);',
      '  const signIn = async (e, p) => setUser(await login(e, p));',
      '  return { user, signIn };',
      '}',
    ],
  },
  {
    match: 'services/api.ts',
    lines: [
      'export const api = {',
      '  post: (path, body) =>',
      '    fetch(BASE_URL + path, {',
      "      method: 'POST',",
      '      body: JSON.stringify(body),',
      '    }),',
      '};',
    ],
  },
  {
    match: 'App.tsx',
    lines: [
      'export default function App() {',
      '  return (',
      '    <AuthProvider>',
      '      <Router />',
      '    </AuthProvider>',
      '  );',
      '}',
    ],
  },
  {
    match: 'Button.tsx',
    lines: [
      'export function Button({ label, onPress }) {',
      '  return (',
      '    <Pressable onPress={onPress}>',
      '      <Text>{label}</Text>',
      '    </Pressable>',
      '  );',
      '}',
    ],
  },
];

/** Generic illustrative content by file extension. */
function genericSnippet(path: string): string[] {
  const name = path.split('/').pop() ?? path;
  const ext = name.includes('.') ? name.split('.').pop() ?? '' : '';
  switch (ext) {
    case 'tsx':
      return [
        `export function ${name.replace(/\.tsx$/, '')}() {`,
        '  return <View>{/* … */}</View>;',
        '}',
      ];
    case 'ts':
      return [
        `// ${name}`,
        'export function run(input) {',
        '  return transform(input);',
        '}',
      ];
    case 'json':
      return ['{', `  "name": "${name.replace(/\.json$/, '')}",`, '  "version": "1.0.0"', '}'];
    case 'md':
      return [`# ${name.replace(/\.md$/, '')}`, '', 'Project documentation lives here.'];
    default:
      return [`// ${name}`, '// (illustrative file in the sample repo)'];
  }
}

/**
 * Faux full source for a building path, fed to `TrailCodeSnippet` through a
 * `readFile` so the tutorial preview reuses the real snippet component
 * (line numbers + syntax highlighting) instead of a bespoke card.
 */
export function learnFileContents(path: string): string {
  const hero = HERO_SNIPPETS.find((h) => path.endsWith(h.match));
  const lines = hero ? hero.lines : genericSnippet(path);
  return lines.join('\n');
}
