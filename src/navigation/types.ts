import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Feed: undefined;
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
    owner: string;
    repo: string;
    commits: Array<{
      sha: string;
      message: string;
      author: string;
      authorLogin: string | null;
      authorAvatarUrl: string | null;
      date: string;
    }>;
  };
  SavedCards: undefined;
};
