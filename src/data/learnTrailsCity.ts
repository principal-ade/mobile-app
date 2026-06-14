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
    label: 'useAuth() hook',
    note: 'The sign-in screen calls this hook — the trail starts where the user does.',
  },
  {
    path: findBuilding('src/services/auth.ts')?.path ?? 'src/services/auth.ts',
    label: 'login() service',
    note: 'It hands credentials to the auth service, which builds the request.',
  },
  {
    path: findBuilding('src/services/api.ts')?.path ?? 'src/services/api.ts',
    label: 'api.post()',
    note: 'Which posts to the API and parses the response. Three stops, one flow.',
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
  ]),
  buildLayer('cov-form', 'Form submit', '#f472b6', 40, [
    'src/components/forms/Form.tsx',
    'src/components/forms/Input.tsx',
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
  ]),
  buildLayer('cov-persist', 'Save & restore', '#34d399', 20, [
    'src/hooks/useLocalStorage.ts',
    'src/services/storage.ts',
    'src/utils/helpers.ts',
  ]),
  buildLayer('cov-startup', 'App startup', '#fbbf24', 10, [
    'src/index.ts',
    'src/App.tsx',
    'src/components/Header.tsx',
    'src/components/Footer.tsx',
  ]),
];

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
