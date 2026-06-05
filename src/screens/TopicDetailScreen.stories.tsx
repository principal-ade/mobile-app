/**
 * TopicDetailScreen stories.
 *
 * The screen fetches its own data via `TopicsApiService.getTopicById` and
 * `TrailsApiService.getTrailById`, both built on `global.fetch`. Each
 * story installs a `fetch` shim that pattern-matches the route and returns
 * a canned payload, so the screen renders standalone with no live API.
 *
 * `AuthProvider` is wrapped per-story with `initialTokens` set (or null)
 * to drive the anonymous variant where the bookmark button is hidden.
 */

import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '@principal-ade/industry-theme';

import { TopicDetailScreen } from './TopicDetailScreen';
import { AuthProvider } from '../context/AuthContext';
import type { GetTopicResponse, TopicPayload } from '../types/Topic';
import type { TrailFetchResponse } from '../services/TrailsApiService';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOPIC_ID = '11111111-2222-3333-4444-555555555555';

const TRAIL_IDS = [
  'aaaaaaaa-1111-2222-3333-444444444444',
  'bbbbbbbb-1111-2222-3333-444444444444',
  'cccccccc-1111-2222-3333-444444444444',
] as const;

const TOPIC: TopicPayload = {
  id: TOPIC_ID,
  title: 'Cache invalidation strategies in HTTP edge proxies',
  description:
    '# Why this topic exists\n\nDifferent CDNs solve cache invalidation in very different ways. ' +
    'This topic curates trails through **Fastly**, **Cloudflare**, and a ' +
    'home-rolled Varnish setup so you can compare the approaches side by side.\n\n' +
    '- Surrogate keys vs. URL purges\n' +
    '- Soft purges and stale-while-revalidate\n' +
    '- How each system handles race conditions during a deploy',
  trailIds: [...TRAIL_IDS],
  createdBy: { githubId: 583231, githubLogin: 'sarah-cdn' },
  createdAt: '2026-01-12T14:00:00Z',
  updatedAt: '2026-04-30T09:15:00Z',
};

const TRAIL_FIXTURES: Record<
  (typeof TRAIL_IDS)[number],
  TrailFetchResponse
> = {
  [TRAIL_IDS[0]]: makeTrail({
    id: TRAIL_IDS[0],
    title: 'Fastly: surrogate-key purges from the deploy pipeline',
    owner: 'fastly',
    repo: 'edge-cache-invalidator',
    summaryPreview:
      'Walk through how the deploy job tags responses with surrogate keys ' +
      'and fires a bulk purge once a release is green.',
  }),
  [TRAIL_IDS[1]]: makeTrail({
    id: TRAIL_IDS[1],
    title: 'Cloudflare Workers: stale-while-revalidate without thundering herd',
    owner: 'cloudflare',
    repo: 'workers-cache-recipes',
    summaryPreview:
      'A Worker that serves stale on miss while one in-flight request ' +
      'refills the cache, with single-flight semantics per cache key.',
  }),
  [TRAIL_IDS[2]]: makeTrail({
    id: TRAIL_IDS[2],
    title: 'Varnish: VCL for soft-purge on tag mismatch',
    owner: 'acme-co',
    repo: 'varnish-config',
    summaryPreview:
      'A minimal VCL fragment that compares response tags to a manifest ' +
      'and marks the entry stale instead of evicting it outright.',
  }),
};

function makeTrail(opts: {
  id: string;
  title: string;
  owner: string;
  repo: string;
  summaryPreview: string;
}): TrailFetchResponse {
  return {
    owner: opts.owner,
    repo: opts.repo,
    bookmarked: false,
    entry: {
      id: opts.id,
      title: opts.title,
      summaryPreview: opts.summaryPreview,
      markerCount: 6,
      repoNames: [`${opts.owner}/${opts.repo}`],
      hasDiffSnippets: false,
      createdAt: '2026-02-01T12:00:00Z',
      updatedAt: '2026-04-12T09:00:00Z',
      sizeBytes: 4096,
      createdBy: { githubId: 999, githubLogin: opts.owner },
      githubRepoId: 1234567,
    },
    payload: {} as TrailFetchResponse['payload'],
  };
}

// ---------------------------------------------------------------------------
// Fetch shim
// ---------------------------------------------------------------------------

type FetchResponder = (url: string) => {
  status: number;
  body: unknown;
} | null;

/**
 * Install a fetch shim that calls each responder in order until one returns
 * a non-null payload. Falls back to the original fetch (which will fail
 * loudly under storybook) so unmocked requests are easy to spot.
 *
 * The override is installed synchronously during render, not inside
 * useEffect: child effects run before parent effects, so a parent-scoped
 * effect would lose the race against the screen's initial fetch. The
 * responders array is captured by ref so each fetch sees the latest
 * closure even though installation only happens once.
 */
function useFetchShim(responders: FetchResponder[]): void {
  const respondersRef = React.useRef(responders);
  respondersRef.current = responders;

  const originalRef = React.useRef<typeof global.fetch | null>(null);
  if (originalRef.current === null) {
    originalRef.current = global.fetch;
    global.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      for (const responder of respondersRef.current) {
        const hit = responder(url);
        if (hit) {
          return new Response(JSON.stringify(hit.body), {
            status: hit.status,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
      return originalRef.current!(input as RequestInfo);
    }) as typeof global.fetch;
  }

  React.useEffect(() => {
    return () => {
      if (originalRef.current) {
        global.fetch = originalRef.current;
        originalRef.current = null;
      }
    };
  }, []);
}

const topicResponder =
  (response: GetTopicResponse): FetchResponder =>
  (url) => {
    if (!url.includes(`/topics/by-id/${TOPIC_ID}`)) return null;
    return { status: 200, body: response };
  };

const trailResponder = (): FetchResponder => (url) => {
  const match = url.match(/\/trails\/by-id\/([0-9a-f-]+)/i);
  if (!match) return null;
  const fixture = TRAIL_FIXTURES[match[1] as (typeof TRAIL_IDS)[number]];
  if (!fixture) {
    return {
      status: 404,
      body: { error: 'Trail not found', code: 'NOT_FOUND' },
    };
  }
  return { status: 200, body: fixture };
};

const errorResponder =
  (status: number, message: string): FetchResponder =>
  (url) => {
    if (!url.includes(`/topics/by-id/${TOPIC_ID}`)) return null;
    return { status, body: { error: message } };
  };

// ---------------------------------------------------------------------------
// Frame + decorators
// ---------------------------------------------------------------------------

// The screen is rendered directly with mocked `navigation` / `route` props
// rather than under a real Stack.Navigator. The web build of
// `@react-navigation/stack` touches `document.*.contains(...)` during mount
// for focus tracking, which throws under `@storybook/react-native-web-vite`.
// The screen only uses `navigation.setOptions` (header buttons, no-op here)
// and `route.params.topicId`, so a minimal stub is enough.

type AnyNav = React.ComponentProps<typeof TopicDetailScreen>['navigation'];
type AnyRoute = React.ComponentProps<typeof TopicDetailScreen>['route'];

const stubNavigation = {
  setOptions: () => {},
  navigate: () => {},
  goBack: () => {},
  addListener: () => () => {},
  removeListener: () => {},
  isFocused: () => true,
} as unknown as AnyNav;

const stubRoute = {
  key: 'TopicDetail-story',
  name: 'TopicDetail',
  params: { topicId: TOPIC_ID },
} as unknown as AnyRoute;

interface FrameProps {
  responders: FetchResponder[];
  authed?: boolean;
}

const Frame: React.FC<FrameProps> = ({ responders, authed = true }) => {
  useFetchShim(responders);
  const { theme } = useTheme();
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <AuthProvider
        initialTokens={
          authed
            ? {
                githubAccessToken: 'storybook-fake-token',
                workosAccessToken: 'storybook-fake-workos',
                refreshToken: 'storybook-fake-refresh',
              }
            : null
        }
        initialUser={
          authed
            ? {
                id: 4242,
                login: 'storybook-viewer',
                name: 'Storybook Viewer',
                avatar_url: 'https://avatars.githubusercontent.com/u/4242?v=4',
                html_url: 'https://github.com/storybook-viewer',
              }
            : null
        }
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <TopicDetailScreen navigation={stubNavigation} route={stubRoute} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const meta: Meta<typeof TopicDetailScreen> = {
  title: 'Screens/TopicDetailScreen',
  component: TopicDetailScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Loaded: Story = {
  render: () => (
    <Frame
      responders={[
        topicResponder({ topic: TOPIC, bookmarked: false }),
        trailResponder(),
      ]}
    />
  ),
};

export const LoadedAndBookmarked: Story = {
  render: () => (
    <Frame
      responders={[
        topicResponder({ topic: TOPIC, bookmarked: true }),
        trailResponder(),
      ]}
    />
  ),
};

export const EmptyTrails: Story = {
  render: () => (
    <Frame
      responders={[
        topicResponder({
          topic: { ...TOPIC, trailIds: [] },
          bookmarked: false,
        }),
        trailResponder(),
      ]}
    />
  ),
};

export const Anonymous: Story = {
  render: () => (
    <Frame
      authed={false}
      responders={[
        topicResponder({ topic: TOPIC, bookmarked: false }),
        trailResponder(),
      ]}
    />
  ),
};

export const TopicLoadError: Story = {
  render: () => (
    <Frame
      responders={[
        errorResponder(404, 'Topic not found'),
        trailResponder(),
      ]}
    />
  ),
};

export const TrailLoadFailures: Story = {
  render: () => (
    <Frame
      responders={[
        topicResponder({ topic: TOPIC, bookmarked: false }),
        // Match the trails endpoint but always 500 — exercises each card's
        // error branch so all three rows render the "unavailable" state.
        (url) =>
          /\/trails\/by-id\//.test(url)
            ? { status: 500, body: { error: 'Storage unavailable' } }
            : null,
      ]}
    />
  ),
};
