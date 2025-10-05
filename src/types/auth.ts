import { GitHubUser } from './github';

export interface GitHubAuthResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: GitHubUser | null;
}
