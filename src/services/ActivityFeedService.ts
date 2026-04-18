import type { RepoActivitySummary, ActivityCommit, CommitFile } from '../types/activity';
import { apiConfig } from '../utils/config';

const API_BASE = apiConfig.baseUrl;

// Featured repos to show in the feed (matching web-ade)
export const FEATURED_REPOS = [
  'garrytan/gstack',
  'pingdotgg/t3code',
  'iamlukethedev/Claw3D',
  'openclaw/openclaw',
  'paperclipai/paperclip',
  'Dimillian/CodexMonitor',
  'ubicloud/ubicloud',
  'different-ai/openwork',
  'ghostty-org/ghostty',
  'rivet-dev/secure-exec',
  'yazinsai/OpenOats',
  'tigerbeetle/tigerbeetle',
];

interface CommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

interface CommitStatsResponse {
  stats?: {
    additions: number;
    deletions: number;
  };
  files?: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

/**
 * Fetches recent commits for a repository
 */
export async function fetchRepoCommits(
  owner: string,
  repo: string,
  options?: { perPage?: number }
): Promise<ActivityCommit[]> {
  const perPage = options?.perPage ?? 10;
  const url = `${API_BASE}/github/repo/${owner}/${repo}/commits?per_page=${perPage}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch commits for ${owner}/${repo}: ${response.status}`);
  }

  const data = await response.json();
  // API returns { commits: [...] } object
  const commits: CommitResponse[] = data.commits || data || [];

  return commits.map((commit) => ({
    repoOwner: owner,
    repoName: repo,
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0] ?? '', // First line only
    author: commit.commit.author.name,
    authorLogin: commit.author?.login ?? null,
    authorEmail: commit.commit.author.email,
    authorAvatarUrl: commit.author?.avatar_url ?? null,
    date: commit.commit.author.date,
  }));
}

/**
 * Fetches stats (additions/deletions) and file changes for a specific commit
 */
export async function fetchCommitStats(
  owner: string,
  repo: string,
  sha: string
): Promise<{ additions: number; deletions: number; filesChanged: number; files: CommitFile[] } | null> {
  const url = `${API_BASE}/github/repo/${owner}/${repo}/commits/${sha}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.log(`[fetchCommitStats] Failed to fetch: ${response.status} for ${owner}/${repo}@${sha.slice(0, 7)}`);
    return null;
  }

  const data: CommitStatsResponse = await response.json();

  if (!data.stats) {
    console.log(`[fetchCommitStats] No stats in response for ${owner}/${repo}@${sha.slice(0, 7)}`);
    return null;
  }

  const files: CommitFile[] = (data.files || []).map(file => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
  }));

  console.log(`[fetchCommitStats] Fetched ${files.length} files for ${owner}/${repo}@${sha.slice(0, 7)}`);

  return {
    additions: data.stats.additions,
    deletions: data.stats.deletions,
    filesChanged: data.files?.length ?? 0,
    files,
  };
}

/**
 * Fetches activity summaries for all featured repos
 */
export async function fetchActivityFeed(
  repos: string[] = FEATURED_REPOS
): Promise<RepoActivitySummary[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await Promise.allSettled(
    repos.map(async (fullName) => {
      const [owner, repo] = fullName.split('/') as [string, string];
      const allCommits = await fetchRepoCommits(owner, repo, { perPage: 10 });

      // Filter to last 24 hours client-side
      const commits = allCommits.filter(
        (commit) => new Date(commit.date) >= twentyFourHoursAgo
      );

      if (commits.length === 0) {
        return null;
      }

      // Fetch stats for each commit in parallel
      const commitsWithStats = await Promise.all(
        commits.map(async (commit) => {
          const stats = await fetchCommitStats(owner, repo, commit.sha);
          return {
            ...commit,
            additions: stats?.additions,
            deletions: stats?.deletions,
            filesChanged: stats?.filesChanged,
            files: stats?.files,
          };
        })
      );

      const summary: RepoActivitySummary = {
        owner,
        repo,
        fullName,
        commits: commitsWithStats,
        latestCommitAt: new Date(commits[0]!.date),
        commitCount: commits.length,
      };

      return summary;
    })
  );

  // Filter successful results with commits
  return results
    .filter(
      (result): result is PromiseFulfilledResult<RepoActivitySummary> =>
        result.status === 'fulfilled' && result.value !== null
    )
    .map((result) => result.value)
    .sort((a, b) => b.latestCommitAt.getTime() - a.latestCommitAt.getTime());
}

/**
 * Generates File City image URL
 */
export function getFileCityUrl(
  owner: string,
  repo: string,
  options?: { commit?: string; width?: number; height?: number }
): string {
  const params = new URLSearchParams();
  params.set('width', String(options?.width ?? 800));
  params.set('height', String(options?.height ?? 800));
  if (options?.commit) {
    params.set('commit', options.commit);
  }

  return `${API_BASE}/file-city/${owner}/${repo}?${params}`;
}
