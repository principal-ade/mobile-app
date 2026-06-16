/**
 * Topic types — curated collection of trails on a single subject.
 *
 * The read-side topic shape is the canonical `PublishedTopic` owned by
 * `@principal-ai/principal-view-core` (the server returns it and mobile reads
 * it). We no longer keep a parallel `TopicPayload` copy here — it drifted
 * (it was missing `status` and `visibility`). Imported as a type only, so it
 * is erased before Metro bundles; nothing from core ships at runtime.
 *
 * Mobile is read + bookmark + share for v1, so we only carry the response
 * envelope the detail screen needs. Owner-mutation types (create / update /
 * suggestions / comments) live on the web until mobile grows those surfaces.
 */

import type { PublishedTopic } from '@principal-ai/principal-view-core';

export type { PublishedTopic };

export interface GetTopicResponse {
  topic: PublishedTopic;
  /**
   * Whether the authenticated caller has this topic bookmarked. Always
   * `false` for anonymous callers. Drives the bookmark toggle's initial
   * state in the header without a second request.
   */
  bookmarked: boolean;
}
