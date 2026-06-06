/**
 * Shiki highlighter for trail code snippets.
 *
 * Follows the architecture documented in the `t3code` "Mobile renders code
 * with Shiki" trail:
 *   - build a `createHighlighterCore` instance backed by
 *     `react-native-shiki-engine`'s native Oniguruma engine, falling back to
 *     `createJavaScriptRegexEngine` when the native engine isn't available
 *     (Storybook-on-web, Old Architecture, or a build without the pod);
 *   - lazy-load language grammars on demand and cache the loaded set;
 *   - resolve a file extension to a grammar, with unknown types rendering as
 *     plain `text` (no grammar, no colors).
 *
 * The native engine import is dynamic + guarded: importing
 * `react-native-shiki-engine` evaluates a `TurboModuleRegistry.getEnforcing`
 * at module load, which throws off-device — so we catch and degrade to the
 * JS engine rather than letting the whole module fail.
 */

import {
  createHighlighterCore,
  type HighlighterCore,
  type ThemedToken,
} from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import githubLight from '@shikijs/themes/github-light';
import githubDark from '@shikijs/themes/github-dark';

export type ShikiThemeName = 'github-light' | 'github-dark';
export type { ThemedToken };

/**
 * Grammar import thunks. Metro can only bundle `import()` with a static
 * specifier, so each language is an explicit entry rather than a templated
 * path. Keep this list to the languages worth shipping — anything missing
 * resolves to plain `text`.
 */
const LANG_IMPORTS: Record<string, () => Promise<unknown>> = {
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  javascript: () => import('@shikijs/langs/javascript'),
  jsx: () => import('@shikijs/langs/jsx'),
  json: () => import('@shikijs/langs/json'),
  python: () => import('@shikijs/langs/python'),
  ruby: () => import('@shikijs/langs/ruby'),
  rust: () => import('@shikijs/langs/rust'),
  go: () => import('@shikijs/langs/go'),
  java: () => import('@shikijs/langs/java'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  swift: () => import('@shikijs/langs/swift'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  csharp: () => import('@shikijs/langs/csharp'),
  php: () => import('@shikijs/langs/php'),
  objc: () => import('@shikijs/langs/objective-c'),
  shellscript: () => import('@shikijs/langs/shellscript'),
  yaml: () => import('@shikijs/langs/yaml'),
  toml: () => import('@shikijs/langs/toml'),
  markdown: () => import('@shikijs/langs/markdown'),
  html: () => import('@shikijs/langs/html'),
  css: () => import('@shikijs/langs/css'),
  scss: () => import('@shikijs/langs/scss'),
  sql: () => import('@shikijs/langs/sql'),
  graphql: () => import('@shikijs/langs/graphql'),
  diff: () => import('@shikijs/langs/diff'),
};

/** Extension → grammar name. Unmapped extensions fall through to `text`. */
const EXT_ALIAS: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  json: 'json',
  jsonc: 'json',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  cs: 'csharp',
  php: 'php',
  m: 'objc',
  mm: 'objc',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  diff: 'diff',
  patch: 'diff',
};

/** `text`/`plaintext` are built into shiki core — no grammar load needed. */
const PLAIN_LANG = 'text';

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();

/** Which regex engine the active highlighter ended up on. Read for debug. */
export type ShikiEngineKind = 'native' | 'javascript';
let activeEngineKind: ShikiEngineKind = 'javascript';
export function getActiveEngineKind(): ShikiEngineKind {
  return activeEngineKind;
}

async function resolveEngine() {
  try {
    const mod = await import('react-native-shiki-engine');
    if (mod.isNativeEngineAvailable()) {
      activeEngineKind = 'native';
      if (__DEV__) console.log('[shiki] using native Oniguruma engine');
      return mod.createNativeEngine();
    }
    if (__DEV__) {
      console.warn(
        '[shiki] native engine not available (rebuild the dev client after ' +
          'adding the pod). Falling back to the JS engine, which does NOT ' +
          'run on Hermes — code will render uncolored on-device.',
      );
    }
  } catch (err) {
    if (__DEV__) console.warn('[shiki] native engine import failed:', err);
  }
  // `forgiving` skips patterns the runtime can't compile instead of throwing,
  // so the JS engine degrades to partial/no color rather than failing the
  // whole snippet. It still can't fully tokenize on Hermes.
  activeEngineKind = 'javascript';
  return createJavaScriptRegexEngine({ forgiving: true });
}

/**
 * Lazily build (and memoize) the shared highlighter. Themes are loaded up
 * front (both are small); languages load on demand via `ensureLanguage`.
 */
export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const engine = await resolveEngine();
      return createHighlighterCore({
        themes: [githubLight, githubDark],
        langs: [],
        engine,
      });
    })();
  }
  return highlighterPromise;
}

/** Map a file path to a grammar name; unknown extensions → `text`. */
export function resolveLanguage(filePath: string | undefined): string {
  const ext = filePath?.split('.').pop()?.toLowerCase() ?? '';
  return EXT_ALIAS[ext] ?? PLAIN_LANG;
}

/**
 * Ensure a grammar is registered. Returns the language actually usable —
 * `text` when the requested grammar isn't in `LANG_IMPORTS` or fails to
 * load — so callers can pass the result straight to `codeToTokensBase`.
 */
async function ensureLanguage(
  highlighter: HighlighterCore,
  lang: string,
): Promise<string> {
  if (lang === PLAIN_LANG || loadedLangs.has(lang)) return lang;
  const imp = LANG_IMPORTS[lang];
  if (!imp) return PLAIN_LANG;
  try {
    const mod = (await imp()) as { default?: unknown };
    await highlighter.loadLanguage(
      (mod.default ?? mod) as Parameters<HighlighterCore['loadLanguage']>[0],
    );
    loadedLangs.add(lang);
    return lang;
  } catch {
    return PLAIN_LANG;
  }
}

/**
 * Tokenize `code` into per-line themed tokens. Resolves the grammar from
 * `filePath`, loads it if needed, and returns shiki's `ThemedToken[][]`
 * (one array per line). On any failure the caller should fall back to
 * rendering plain text.
 */
export async function highlightToLines(
  code: string,
  filePath: string | undefined,
  themeName: ShikiThemeName,
): Promise<ThemedToken[][]> {
  const highlighter = await getHighlighter();
  const lang = await ensureLanguage(highlighter, resolveLanguage(filePath));
  return highlighter.codeToTokensBase(code, { lang, theme: themeName });
}
