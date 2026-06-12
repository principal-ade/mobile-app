import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import React from 'react';
import { View } from 'react-native';
import { InboxRow } from './InboxRow';
import type { InboxIndexEntry } from '../../types/Inbox';

const MobileFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{ width: 375, borderWidth: 1, borderColor: '#333' }}>
    {children}
  </View>
);

const now = Date.now();

const baseEntry: InboxIndexEntry = {
  trailId: 'trail-1',
  sender: { githubId: 1, githubLogin: 'octocat' },
  comment: 'Take a look when you get a chance — curious what you think.',
  sentAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
  readAt: null,
  owner: 'octocat',
  repo: 'hello-world',
  snapshot: {
    id: 'trail-1',
    title: 'How a request flows through the auth middleware',
    summaryPreview: 'Traces an inbound request from the route handler…',
    markerCount: 6,
    repoNames: ['octocat/hello-world'],
    hasDiffSnippets: false,
    createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    sizeBytes: 4096,
    createdBy: { githubId: 1, githubLogin: 'octocat' },
    githubRepoId: 123,
  },
};

const meta: Meta<typeof InboxRow> = {
  title: 'Trails/InboxRow',
  component: InboxRow,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof InboxRow>;

/** State 1 — never opened, no notes: dot by the title, no count. */
export const UnopenedNoNotes: Story = {
  render: () => (
    <MobileFrame>
      <InboxRow
        entry={{
          ...baseEntry,
          notification: { dot: true, unread: true, noteCount: 0, newNoteCount: 0 },
        }}
      />
    </MobileFrame>
  ),
};

/** State 2 — never opened, has notes: dot + whole "N notes" accented. */
export const UnopenedWithNotes: Story = {
  render: () => (
    <MobileFrame>
      <InboxRow
        entry={{
          ...baseEntry,
          snapshot: { ...baseEntry.snapshot, noteCount: 3 },
          notification: { dot: true, unread: true, noteCount: 3, newNoteCount: 3 },
        }}
      />
    </MobileFrame>
  ),
};

/** State 3 — opened, all notes seen: no dot, muted "N notes" (fully read). */
export const OpenedAllSeen: Story = {
  render: () => (
    <MobileFrame>
      <InboxRow
        entry={{
          ...baseEntry,
          readAt: new Date(now - 30 * 60 * 1000).toISOString(),
          notesSeenCount: 3,
          snapshot: { ...baseEntry.snapshot, noteCount: 3 },
          notification: {
            dot: false,
            unread: false,
            noteCount: 3,
            newNoteCount: 0,
          },
        }}
      />
    </MobileFrame>
  ),
};

/** State 4 — opened, new notes since: dot drops to the notes line, only
 * "(N new)" accented while the total stays muted. */
export const OpenedNewNotes: Story = {
  render: () => (
    <MobileFrame>
      <InboxRow
        entry={{
          ...baseEntry,
          readAt: new Date(now - 30 * 60 * 1000).toISOString(),
          notesSeenCount: 3,
          snapshot: { ...baseEntry.snapshot, noteCount: 5 },
          notification: {
            dot: true,
            unread: false,
            noteCount: 5,
            newNoteCount: 2,
          },
        }}
      />
    </MobileFrame>
  ),
};
