import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { TrailFeedCard } from './TrailFeedCard';
import type { TrailFeedCardTrail } from './TrailFeedCard';

const DEFAULT_HEIGHT = 667;

const MobileFrame: React.FC<{ children: React.ReactNode; height?: number }> = ({
  children,
  height = DEFAULT_HEIGHT,
}) => (
  <SafeAreaProvider>
    <View
      style={{
        width: 375,
        height,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  </SafeAreaProvider>
);

const baseTrail: TrailFeedCardTrail = {
  id: 'trail-1',
  title: 'How a request flows through the auth middleware',
  purpose: 'investigation',
  author: 'octocat',
  createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  repoNames: ['octocat/hello-world'],
  stops: [
    { sourcePath: 'src/routes/handler.ts' },
    { sourcePath: 'src/auth/session.ts' },
    { sourcePath: 'src/auth/policy.ts' },
    { sourcePath: 'src/middleware/auth.ts' },
    { sourcePath: 'src/lib/token.ts' },
    { sourcePath: 'src/index.ts' },
  ],
  overview:
    'Traces an inbound request from the **route handler** through `session.ts` validation to the policy check.\n\n- Entry at `routes/handler.ts`\n- Auth in `middleware/auth.ts`\n- Final gate in `auth/policy.ts`',
};

const meta: Meta<typeof TrailFeedCard> = {
  title: 'Trails/TrailFeedCard',
  component: TrailFeedCard,
  decorators: [
    (Story) => (
      <NavigationContainer>
        <Story />
      </NavigationContainer>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TrailFeedCard>;

export const Investigation: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard trail={baseTrail} />
    </MobileFrame>
  ),
};

export const Changelog: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard
        trail={{
          ...baseTrail,
          id: 'trail-2',
          purpose: 'changelog',
          title: 'Walkthrough: migrate session store to Redis',
          overview: 'Reviewer walkthrough for PR #482 — three files, one config change.',
          stops: [
            { sourcePath: 'src/auth/session.ts' },
            { sourcePath: 'src/config/redis.ts' },
            { sourcePath: 'src/index.ts' },
          ],
        }}
      />
    </MobileFrame>
  ),
};

export const InformativeVerified: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard
        trail={{
          ...baseTrail,
          id: 'trail-3',
          purpose: 'informative',
          signOffCount: 2,
          title: 'The canonical billing webhook lifecycle',
          overview: 'Durable reference for how Stripe webhooks are received, verified, and replayed.',
          repoNames: ['acme/payments', 'acme/webhooks'],
          // Spans two repos — 'acme/payments' has the most stops, so it's the primary city.
          stops: [
            { sourcePath: 'src/webhooks/receive.ts', repo: 'acme/payments' },
            { sourcePath: 'src/webhooks/verify.ts', repo: 'acme/payments' },
            { sourcePath: 'src/webhooks/replay.ts', repo: 'acme/payments' },
            { sourcePath: 'src/billing/invoice.ts', repo: 'acme/payments' },
            { sourcePath: 'src/queue/consumer.ts', repo: 'acme/webhooks' },
            { sourcePath: 'src/queue/dlq.ts', repo: 'acme/webhooks' },
          ],
        }}
      />
    </MobileFrame>
  ),
};

export const InformativeUnverified: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard
        trail={{
          ...baseTrail,
          id: 'trail-4',
          purpose: 'informative',
          signOffCount: 0,
          title: 'Notes on the rendering pipeline',
        }}
      />
    </MobileFrame>
  ),
};

export const Minimal: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard trail={{ id: 'trail-5', title: 'Untitled exploration' }} />
    </MobileFrame>
  ),
};

export const WithHourLabel: Story = {
  render: () => (
    <MobileFrame>
      <TrailFeedCard trail={baseTrail} hourLabel="Good Morning" />
    </MobileFrame>
  ),
};
