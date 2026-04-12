import type { NavigatorScreenParams } from '@react-navigation/native';

// Stack params for Feed tab
export type FeedStackParamList = {
  FeedHome: undefined;
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
      latestCommitAt: string;
      commitCount: number;
    };
  };
  SavedCards: undefined;
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  TourFileCity: {
    owner: string;
    name: string;
    fullName: string;
    forkOwner: string;
    forkRepo: string;
    tourPath: string;
  };
  UserProfile: {
    username: string;
  };
  FeedCustomization: {
    addedUser?: { login: string; avatarUrl: string };
    addedRepo?: { owner: string; name: string };
  } | undefined;
  AddUser: undefined;
  AddRepo: undefined;
};

// Stack params for Watch tab
export type WatchStackParamList = {
  WatchHome: undefined;
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  TourFileCity: {
    owner: string;
    name: string;
    fullName: string;
    forkOwner: string;
    forkRepo: string;
    tourPath: string;
  };
  UserProfile: {
    username: string;
  };
};

// Stack params for Search tab
export type SearchStackParamList = {
  SearchHome: undefined;
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  TourFileCity: {
    owner: string;
    name: string;
    fullName: string;
    forkOwner: string;
    forkRepo: string;
    tourPath: string;
  };
  UserProfile: {
    username: string;
  };
};

// Stack params for Starred tab
export type StarredStackParamList = {
  StarredHome: undefined;
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  TourFileCity: {
    owner: string;
    name: string;
    fullName: string;
    forkOwner: string;
    forkRepo: string;
    tourPath: string;
  };
  UserProfile: {
    username: string;
  };
};

// Stack params for About tab
export type AboutStackParamList = {
  AboutHome: undefined;
  RepositoryList: undefined;
  Document: {
    owner: string;
    repo: string;
    path: string;
    fileName: string;
  };
  FeedCustomization: {
    addedUser?: { login: string; avatarUrl: string };
    addedRepo?: { owner: string; name: string };
  } | undefined;
  AddUser: undefined;
  AddRepo: undefined;
  SavedCards: undefined;
};

export type MainTabParamList = {
  Feed: NavigatorScreenParams<FeedStackParamList>;
  Watch: NavigatorScreenParams<WatchStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Starred: NavigatorScreenParams<StarredStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EmailVerification: {
    state: string;
    email: string;
  };
};
