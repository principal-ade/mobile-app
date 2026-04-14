export type GitHubUrlParseResult =
  | { type: 'repo'; owner: string; repo: string }
  | { type: 'user'; username: string }
  | { type: 'invalid'; reason: string };

export function parseGitHubUrl(url: string): GitHubUrlParseResult {
  const trimmed = url.trim();

  if (!trimmed) {
    return { type: 'invalid', reason: 'Empty URL' };
  }

  // Normalize URL - add https:// if missing
  let normalized = trimmed;
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `https://${normalized}`;
  }

  try {
    const urlObj = new URL(normalized);

    // Validate GitHub domain
    if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') {
      return { type: 'invalid', reason: 'Not a GitHub URL' };
    }

    // Parse pathname segments
    const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      return { type: 'invalid', reason: 'No path segments' };
    }

    if (segments.length === 1) {
      // User URL: github.com/username
      const username = segments[0];
      if (!isValidGitHubIdentifier(username)) {
        return { type: 'invalid', reason: 'Invalid username format' };
      }
      return { type: 'user', username };
    }

    if (segments.length >= 2) {
      // Repo URL: github.com/owner/repo (ignore extra segments like /issues)
      const [owner, repo] = segments;
      if (!isValidGitHubIdentifier(owner) || !isValidGitHubIdentifier(repo)) {
        return { type: 'invalid', reason: 'Invalid owner/repo format' };
      }
      return { type: 'repo', owner, repo };
    }

    return { type: 'invalid', reason: 'Unexpected URL format' };
  } catch (error) {
    return { type: 'invalid', reason: 'Malformed URL' };
  }
}

function isValidGitHubIdentifier(identifier: string): boolean {
  // GitHub identifiers:
  // - 1-39 characters
  // - Alphanumeric, hyphens, underscores, dots
  // - Cannot start with hyphen or dot
  // - Single character identifiers are valid

  if (identifier.length === 0 || identifier.length > 39) {
    return false;
  }

  // Allow single character
  if (identifier.length === 1) {
    return /^[a-zA-Z0-9]$/.test(identifier);
  }

  // Multi-character: must start and end with alphanumeric
  // Can contain alphanumeric, hyphen, underscore, dot in between
  return /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(identifier);
}
