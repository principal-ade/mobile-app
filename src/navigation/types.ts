import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Feed: undefined;
  Saved: undefined;
  About: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  RepositoryList: undefined;
  Document: {
    owner: string;
    repo: string;
    path: string;
    fileName: string;
  };
  EmailVerification: {
    state: string;
    email: string;
  };
  FeedCustomization: {
    addedUser?: string;
    addedRepo?: { owner: string; name: string };
  } | undefined;
  AddUser: undefined;
  AddRepo: undefined;
  SwipeFeed: undefined;
  CardDetail: {
    summary: {
      owner: string;
      repo: string;
      fullName: string;
      commits: Array<{
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
      }>;
      latestCommitAt: string; // ISO string for serialization
      commitCount: number;
    };
  };
  SavedCards: undefined;
};
