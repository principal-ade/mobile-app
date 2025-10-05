export type RootStackParamList = {
  Login: undefined;
  RepositoryList: undefined;
  Document: {
    owner: string;
    repo: string;
    path: string;
    fileName: string;
  };
};
