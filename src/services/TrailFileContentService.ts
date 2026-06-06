/**
 * Resolves repo-relative source files for trail code snippets.
 *
 * Trail slice snippets carry a line window (`startLine`/`endLine`/…) but no
 * baked file contents — v1 `TrailSliceSnippet` deliberately omits a
 * `contents` field (see `types/Trail.ts`). On the web the host supplies a
 * `readFile(path)` action backed by the local checkout; mobile has no
 * checkout, so we fetch the file from GitHub at the commit the trail was
 * authored against. This is the mobile equivalent of that host action.
 *
 * Diff snippets are NOT resolved here — they already carry
 * `oldContents`/`newContents` in the payload and render without a network
 * round-trip.
 *
 * Auth: the viewer's GitHub token (from `useAuth`) gates private-repo
 * access. A 403/404 surfaces as a `GitHubFileContentError` so the snippet
 * slot can render a "couldn't load source" state instead of throwing.
 */

import {
  fetchRawFileContent,
  GitHubFileContentError,
} from './GithubService';

export { GitHubFileContentError };

/** A host-style file reader: repo-relative path in, file text out. */
export type TrailFileReader = (path: string) => Promise<string>;

export interface TrailFileReaderConfig {
  owner: string;
  repo: string;
  /** Commit/branch/tag the trail was authored against. */
  ref?: string;
  /** Viewer's GitHub token; undefined for anonymous (public-repo) reads. */
  token?: string;
}

/**
 * Process-lifetime cache of resolved file contents. A single trail opens the
 * same file across multiple markers, and re-renders re-request the same
 * slice, so caching by `owner/repo@ref:path` keeps it to one fetch per file.
 * Stores the in-flight promise (not just the resolved value) so concurrent
 * requests for the same file coalesce. Errors are not cached — a transient
 * failure shouldn't poison the slot for the rest of the session.
 */
const cache = new Map<string, Promise<string>>();

function cacheKey(config: TrailFileReaderConfig, path: string): string {
  return `${config.owner}/${config.repo}@${config.ref ?? 'HEAD'}:${path}`;
}

/**
 * Build a stable `readFile` closure for one trail's provenance. The cache is
 * module-level, so even if a caller rebuilds the reader on re-render the
 * underlying fetches still coalesce. Callers should still memoize the
 * returned function on `owner`/`repo`/`ref`/`token` so downstream effects
 * keyed on its identity don't refire.
 */
export function createTrailFileReader(
  config: TrailFileReaderConfig,
): TrailFileReader {
  return (path: string) => {
    const key = cacheKey(config, path);
    const existing = cache.get(key);
    if (existing) return existing;

    if (!config.token) {
      // No token means we can only reach public repos; GitHub's raw
      // contents endpoint still requires auth for the higher rate limit
      // and any private access. Surface a typed error rather than a bare
      // 401 string so the snippet slot reads as "sign in to view source".
      return Promise.reject(
        new GitHubFileContentError('Sign in to load source for this snippet.', 401),
      );
    }

    const pending = fetchRawFileContent(
      config.token,
      config.owner,
      config.repo,
      path,
      config.ref,
    ).catch((err: unknown) => {
      // Drop failed reads from the cache so a retry can re-fetch.
      cache.delete(key);
      throw err;
    });
    cache.set(key, pending);
    return pending;
  };
}
