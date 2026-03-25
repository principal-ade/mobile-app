export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  RepositoryList: undefined;
  Document: {
    owner: string;
    repo: string;
    path: string;
    fileName: string;
  };
};
