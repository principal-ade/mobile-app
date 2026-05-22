import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@principal-ade/industry-theme';

import { TrailBriefCard } from './TrailBriefCard';
import type { TrailSignOff } from '../../types/Trail';

// ---------------------------------------------------------------------------
// Harness — centers the card inside the viewport with the same muted
// background the modal would paint behind it. Lets the card render at
// real size without the modal chrome on top.
//
// `presentation: 'screen'` flips the harness to a full-bleed flex View;
// the card owns its own internal route scroll, so wrapping in a
// ScrollView here would re-introduce the nested-virtualization warning.
// ---------------------------------------------------------------------------
const CardHarness: React.FC<
  React.ComponentProps<typeof TrailBriefCard>
> = (props) => {
  const { theme } = useTheme();
  if (props.presentation === 'screen') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <TrailBriefCard {...props} />
      </View>
    );
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: 16,
        justifyContent: 'center',
      }}
    >
      <TrailBriefCard {...props} />
    </View>
  );
};

const SUMMARY_BODY = `**Login currently writes the session before the API call settles** — so a network failure mid-request leaves an orphaned session row.

Walk the three markers and decide whether the call order should be inverted.`;

const STOPS = [
  {
    id: 'm-login',
    label: 'login() entry point',
    sourcePath: 'src/auth/login.ts',
    description:
      'Public entry. Validates credentials, then delegates to `createSession` before awaiting the remote `/login` call.',
  },
  {
    id: 'm-create-session',
    label: 'createSession() writes before API settles',
    sourcePath: 'src/auth/session.ts',
    kind: 'subject' as const,
    description:
      '**This is the race.** The session row is persisted *before* the API call resolves — a failure mid-flight leaves an orphan that the next login picks up.',
  },
  {
    id: 'm-api-client',
    label: 'API client retries swallow the failure',
    sourcePath: 'src/api/client.ts',
    description:
      'Retry middleware coerces any 5xx into a resolved promise after exhausting retries, masking the failure from `login()`.',
  },
];

const SIGN_OFFS: TrailSignOff[] = [
  {
    id: 'sign-1',
    author: 'Alice Hoffman',
    signedAt: '2026-05-08T14:22:00Z',
    comment: 'Direction looks right — left a note on the API ordering.',
  },
  {
    id: 'sign-2',
    author: 'Bob Chen',
    signedAt: '2026-05-09T09:10:00Z',
  },
  {
    id: 'sign-3',
    author: 'Carol Diaz',
    signedAt: '2026-05-10T16:48:00Z',
    comment: 'Agreed.',
  },
];

const BASE_ARGS: React.ComponentProps<typeof TrailBriefCard> = {
  body: SUMMARY_BODY,
  title: 'Login flow has a write-before-settle race',
  author: 'Fernando',
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
  repoCount: 1,
  fileCount: 3,
  stops: STOPS,
};

const meta: Meta<typeof CardHarness> = {
  title: 'Trails/TrailBriefCard',
  component: CardHarness,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CardHarness>;

export const InformativeUnverified: Story = {
  args: { ...BASE_ARGS, purpose: 'informative' },
};

export const SharedRequestLgtm: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
  },
};

export const SignedByCurrentUser: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    signedByCurrentUser: true,
  },
};

export const SharedWithAllRosters: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    notesByAuthor: {
      'Bob Chen': ['m-api-client'],
      'Dani Reyes': ['m-create-session'],
    },
  },
};

// Phone screen layout. The brief IS the screen — no card chrome, no
// maxWidth, body grows in flow, host ScrollView drives scrolling.
export const ScreenPresentation: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    presentation: 'screen',
  },
};

// Suppresses the REVIEWED BY / NOTES BY rows. Used when the brief is
// competing for vertical space with another zone.
export const HideCohortStrips: Story = {
  args: {
    ...BASE_ARGS,
    isShared: true,
    request: 'Verify Direction',
    purpose: 'investigation',
    signOffs: SIGN_OFFS,
    notedBy: ['Dani Reyes', 'Bob Chen'],
    hideCohortStrips: true,
  },
};
