/**
 * Shared utilities for OrganizationScreen components
 */

/**
 * Format a date string to a relative time string
 * e.g., "Updated 2d ago", "Updated today"
 */
export function formatUpdateTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffDays === 0) {
    return 'Updated today';
  } else if (diffDays === 1) {
    return 'Updated yesterday';
  } else if (diffDays < 30) {
    return `Updated ${diffDays}d ago`;
  } else if (diffMonths < 12) {
    return `Updated ${diffMonths}mo ago`;
  } else {
    return `Updated ${diffYears}y ago`;
  }
}

/**
 * Format a number with k/m suffixes
 * e.g., 1234 -> "1.2k", 3456789 -> "3.4m"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}m`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}
