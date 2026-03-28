declare module 'expo-web-browser' {
  export interface WebBrowserResult {
    type: 'cancel' | 'dismiss' | 'opened' | 'locked';
  }

  export interface WebBrowserAuthSessionResult {
    type: 'cancel' | 'dismiss' | 'success' | 'locked';
    url?: string;
  }

  export function maybeCompleteAuthSession(): { type: string };

  export function openBrowserAsync(
    url: string,
    options?: { dismissButtonStyle?: string }
  ): Promise<WebBrowserResult>;

  export function openAuthSessionAsync(
    url: string,
    redirectUrl?: string | null,
    options?: object
  ): Promise<WebBrowserAuthSessionResult>;
}
