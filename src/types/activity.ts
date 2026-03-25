export interface ActivityCommit {
  repoOwner: string;
  repoName: string;
  sha: string;
  message: string;
  author: string;
  authorLogin: string | null;
  authorEmail: string;
  authorAvatarUrl: string | null;
  date: string;
  additions?: number;
  deletions?: number;
}

export interface RepoActivitySummary {
  owner: string;
  repo: string;
  fullName: string;
  commits: ActivityCommit[];
  latestCommitAt: Date;
  commitCount: number;
  description?: string;
}
