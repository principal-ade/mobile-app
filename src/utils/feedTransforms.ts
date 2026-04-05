import type { RepoActivitySummary } from '../types/activity';
import type { CommitActivityCard } from '../services/FeedApiService';

/**
 * Converts RepoActivitySummary (from ActivityFeedService) to CommitActivityCard (for SwipeFeedScreen)
 */
export function summaryToCard(summary: RepoActivitySummary): CommitActivityCard {
  const latestCommit = summary.commits[0];
  const latestDate = latestCommit ? new Date(latestCommit.date) : summary.latestCommitAt;
  const hour = latestDate.getUTCHours();

  // Create hour bucket (start of the hour in ISO format)
  const hourBucket = new Date(latestDate);
  hourBucket.setUTCMinutes(0, 0, 0);

  // Format date for itemId: YYYY-MM-DD
  const dateStr = latestDate.toISOString().split('T')[0];

  return {
    itemId: `${dateStr}:${hour.toString().padStart(2, '0')}:${summary.fullName}`,
    repo: {
      owner: summary.owner,
      name: summary.repo,
    },
    hour,
    hourBucket: hourBucket.toISOString(),
    commits: summary.commits.map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: {
        login: commit.authorLogin || commit.author,
        avatarUrl: commit.authorAvatarUrl || undefined,
      },
      committedAt: commit.date,
      url: `https://github.com/${summary.owner}/${summary.repo}/commit/${commit.sha}`,
    })),
    commitCount: summary.commitCount,
    latestCommitAt: latestDate.toISOString(),
  };
}

/**
 * Converts an array of RepoActivitySummary to CommitActivityCard[]
 */
export function summariesToCards(summaries: RepoActivitySummary[]): CommitActivityCard[] {
  return summaries.map(summaryToCard);
}
