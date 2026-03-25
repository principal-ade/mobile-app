import type { RepoActivitySummary, ActivityCommit } from '../types/activity';

const API_BASE = 'https://app.principal-ade.com/api';

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
  files?: Array<{ filename: string }>;
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
 * Fetches stats (additions/deletions) for a specific commit
 */
export async function fetchCommitStats(
  owner: string,
  repo: string,
  sha: string
): Promise<{ additions: number; deletions: number; filesChanged: number } | null> {
  const url = `${API_BASE}/github/repo/${owner}/${repo}/commits/${sha}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data: CommitStatsResponse = await response.json();

  if (!data.stats) {
    return null;
  }

  return {
    additions: data.stats.additions,
    deletions: data.stats.deletions,
    filesChanged: data.files?.length ?? 0,
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

      const summary: RepoActivitySummary = {
        owner,
        repo,
        fullName,
        commits,
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
