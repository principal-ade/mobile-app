/**
 * Topic types — curated collection of trails on a single subject.
 *
 * Mirrors the read-side of `web-ade/src/lib/topics/types.ts`. Mobile is
 * read + star + share for v1, so we only carry the shapes the detail
 * screen needs. Owner-mutation types (create / update / suggestions /
 * comments) live on the web until mobile grows those surfaces.
 */

export interface TopicPayload {
  id: string;
  title: string;
  /** Markdown. */
  description: string;
  /** Ordered list of trail ids — foreign keys into the trails store. */
  trailIds: string[];
  createdBy: { githubId: number; githubLogin: string };
  createdAt: string;
  updatedAt: string;
}

export interface GetTopicResponse {
  topic: TopicPayload;
  /**
   * Whether the authenticated caller has this topic starred. Always
   * `false` for anonymous callers. Drives the star toggle's initial
   * state in the header without a second request.
   */
  starred: boolean;
}
