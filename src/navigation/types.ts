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
};
