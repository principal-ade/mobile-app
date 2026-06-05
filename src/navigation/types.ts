import type { NavigatorScreenParams } from '@react-navigation/native';

// Stack params for Trails tab
export type TrailsStackParamList = {
  TrailsHome: undefined;
  TrailDetail: {
    /** UUID resolved from the inbox / recently-visited list. */
    trailId: string;
  };
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  Organization: {
    orgLogin: string;
  };
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
  };
};

// Stack params for Recently Visited tab — mirrors the Trails (Inbox) stack
// since both list trails and push the same downstream screens.
export type RecentStackParamList = {
  RecentHome: undefined;
  TrailDetail: {
    /** UUID resolved from the recently-visited list. */
    trailId: string;
  };
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  Organization: {
    orgLogin: string;
  };
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
  };
};

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
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  Organization: {
    orgLogin: string;
  };
  FeedCustomization: {
    addedUser?: { login: string; avatarUrl: string };
    addedRepo?: { owner: string; name: string };
  } | undefined;
  AddUser: undefined;
  AddRepo: undefined;
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
  };
};

// Stack params for Watch tab
export type WatchStackParamList = {
  WatchHome: undefined;
  UserActivity: {
    username: string;
    avatarUrl?: string;
    repoFilter?: {
      owner: string;
      name: string;
    };
  };
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  Organization: {
    orgLogin: string;
  };
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
  };
};

// Stack params for Paste tab
export type PasteStackParamList = {
  PasteHome: undefined;
  TrailDetail: {
    /** UUID extracted from a /trail/<id> clipboard URL. */
    trailId: string;
  };
  TopicDetail: {
    /** UUID extracted from a /topic/<id> clipboard URL. */
    topicId: string;
  };
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  Organization: {
    orgLogin: string;
  };
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
  };
};

// Stack params for Bookmarked tab
export type BookmarksStackParamList = {
  BookmarksHome: undefined;
  TrailDetail: {
    /** UUID from the bookmarked-trails list. */
    trailId: string;
  };
  TopicDetail: {
    /** UUID from the bookmarked-topics list. */
    topicId: string;
  };
  RepoFileCity: {
    owner: string;
    name: string;
    fullName: string;
  };
  RepoReadme: {
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
    isOrganization?: boolean;
    isBot?: boolean;
  };
  CommitDetail: {
    commit: {
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
    };
    fullName: string;
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
  UserProfile: {
    username: string;
    isOrganization?: boolean;
    isBot?: boolean;
  };
};

export type MainTabParamList = {
  Trails: NavigatorScreenParams<TrailsStackParamList>;
  Recent: NavigatorScreenParams<RecentStackParamList>;
  Watch: NavigatorScreenParams<WatchStackParamList>;
  Paste: NavigatorScreenParams<PasteStackParamList>;
  Bookmarks: NavigatorScreenParams<BookmarksStackParamList>;
  About: NavigatorScreenParams<AboutStackParamList>;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EmailVerification: {
    state: string;
    email: string;
  };
};
