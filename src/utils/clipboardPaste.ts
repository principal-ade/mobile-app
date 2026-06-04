import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';
import { parseGitHubUrl } from './githubUrlParser';
import { extractTrailId } from './trailUrlParser';
import { extractTopicId } from './topicUrlParser';
import { saveClickedResult } from './searchStorage';

export type ClipboardPasteTarget =
  | { type: 'trail'; trailId: string }
  | { type: 'topic'; topicId: string }
  | { type: 'repo'; owner: string; name: string; fullName: string }
  | { type: 'user'; username: string };

export type ClipboardPasteResult =
  | { status: 'ok'; target: ClipboardPasteTarget }
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'error' };

/**
 * Read the clipboard and resolve it to a navigable target.
 *
 * Shared by the Paste tab's button and the Paste tab's double-tap shortcut so
 * the two behave identically. Trail / topic share URLs and bare UUIDs are
 * checked before GitHub URLs because they can never overlap with the github.com
 * shapes parseGitHubUrl accepts. Trails are checked before topics because a
 * bare UUID is ambiguous and trails are the older / more common share target;
 * an explicit `/topic/<id>` URL still wins because extractTrailId only matches
 * `/trail/<id>`.
 *
 * Repo / user hits are recorded via saveClickedResult so they surface under
 * "Recently viewed", matching what tapping a search result used to do.
 */
export async function readClipboardTarget(): Promise<ClipboardPasteResult> {
  try {
    const clipboardContent = await Clipboard.getStringAsync();

    if (!clipboardContent?.trim()) {
      return { status: 'empty' };
    }

    const trimmed = clipboardContent.trim();

    const trailId = extractTrailId(trimmed);
    if (trailId) {
      return { status: 'ok', target: { type: 'trail', trailId } };
    }

    const topicId = extractTopicId(trimmed);
    if (topicId) {
      return { status: 'ok', target: { type: 'topic', topicId } };
    }

    const parseResult = parseGitHubUrl(trimmed);

    if (parseResult.type === 'repo') {
      const fullName = `${parseResult.owner}/${parseResult.repo}`;

      await saveClickedResult({
        type: 'repo',
        id: fullName,
        name: parseResult.repo,
        owner: parseResult.owner,
        avatarUrl: `https://github.com/${parseResult.owner}.png`,
      });

      return {
        status: 'ok',
        target: { type: 'repo', owner: parseResult.owner, name: parseResult.repo, fullName },
      };
    }

    if (parseResult.type === 'user') {
      await saveClickedResult({
        type: 'user',
        id: parseResult.username,
        name: parseResult.username,
        login: parseResult.username,
        avatarUrl: `https://github.com/${parseResult.username}.png`,
      });

      return { status: 'ok', target: { type: 'user', username: parseResult.username } };
    }

    return { status: 'invalid' };
  } catch {
    return { status: 'error' };
  }
}

/** Surface the non-ok outcomes from readClipboardTarget as user-facing alerts. */
export function alertClipboardPasteResult(status: 'empty' | 'invalid' | 'error'): void {
  switch (status) {
    case 'empty':
      Alert.alert('Clipboard Empty', 'No content found in clipboard');
      break;
    case 'invalid':
      Alert.alert(
        'Invalid URL',
        'Clipboard does not contain a valid GitHub, trail, or topic URL',
      );
      break;
    case 'error':
      Alert.alert('Error', 'Failed to read from clipboard');
      break;
  }
}
