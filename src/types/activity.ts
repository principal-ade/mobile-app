export interface CommitFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
}

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
  filesChanged?: number;
  files?: CommitFile[];
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
