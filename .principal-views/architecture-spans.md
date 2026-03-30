# Activity Feed Telemetry

The activity feed provides a real-time view of repository activity across a user's GitHub repositories.

## Overview

The activity feed displays recent commits from featured repositories, allowing users to:
- Browse repository cards with commit summaries
- Swipe through commits within each repository
- View File City visualizations for each commit
- Tap to interact with commits and authors

## Span Conventions

### activity-feed.init
The initialization span covers the entire feed loading process, from fetching repositories to displaying the first content.

### activity-feed.refresh
The refresh span covers pull-to-refresh and background refresh operations when the app returns to foreground.

### activity-feed.interaction
The interaction span covers user interactions like card swiping, commit browsing, and tap actions.

## Design Decisions

- Batch fetch repositories in parallel for faster loading
- Prefetch File City images for smooth swiping experience
- Auto-refresh on app foreground to show latest activity
