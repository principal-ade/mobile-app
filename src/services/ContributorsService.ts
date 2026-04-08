/**
 * ContributorsService - Fetches contributor data and activity stats for repositories
 */

export interface Contributor {
  login: string;
  avatarUrl: string;
  contributions: number;
}

export interface WeeklyActivity {
  week: number; // Unix timestamp of week start
  days: number[]; // Array of 7 days (Sun-Sat) with commit counts
  total: number;
}

/**
 * Fetch contributors for a repository
 */
export async function getContributors(
  owner: string,
  repo: string,
  limit: number = 30
): Promise<Contributor[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=${limit}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch contributors: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return data.map((c: { login: string; avatar_url: string; contributions: number }) => ({
    login: c.login,
    avatarUrl: c.avatar_url,
    contributions: c.contributions,
  }));
}

/**
 * Fetch weekly commit activity for a repository (last 52 weeks)
 */
interface ContributorStats {
  author: {
    login: string;
    avatar_url: string;
  };
  total: number;
  weeks: Array<{
    w: number; // week timestamp
    a: number; // additions
    d: number; // deletions
    c: number; // commits
  }>;
}

/**
 * Fetch weekly activity for the top contributor
 */
export async function getWeeklyActivity(
  owner: string,
  repo: string
): Promise<WeeklyActivity[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
  console.log('[ContributorsService] Fetching contributor stats:', url);

  let response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  });

  // Retry if 202 (computing)
  let retries = 0;
  while (response.status === 202 && retries < 5) {
    console.log('[ContributorsService] Stats computing, retry', retries + 1);
    await new Promise(resolve => setTimeout(resolve, 2000));
    response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    retries++;
  }

  if (!response.ok || response.status === 202) {
    console.log('[ContributorsService] Failed to fetch contributor stats:', response.status);
    return [];
  }

  try {
    const data: ContributorStats[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log('[ContributorsService] No contributor data');
      return [];
    }

    // Get top contributor (last in array - sorted ascending by commits)
    const topContributor = data[data.length - 1];
    console.log('[ContributorsService] Top contributor:', topContributor.author.login, 'with', topContributor.total, 'commits');

    // Convert weeks to WeeklyActivity format
    const result = topContributor.weeks.map(w => ({
      week: w.w,
      // We only have commit count per week, put on Wednesday
      days: [0, 0, 0, w.c, 0, 0, 0] as number[],
      total: w.c,
    }));

    console.log('[ContributorsService] Got', result.length, 'weeks for', topContributor.author.login);
    return result;
  } catch (err) {
    console.error('[ContributorsService] Error parsing contributor stats:', err);
    return [];
  }
}

export default {
  getContributors,
  getWeeklyActivity,
};
