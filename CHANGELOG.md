# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 3 polish: performance, error handling, documentation.
- Stats caching for queue statistics (configurable TTL).
- Save retry with exponential backoff (3 attempts).
- Backup before save; keep last 5 backups; restore from backup API.
- Centralized error handler and user-facing error notices.
- Platform detection (mobile/touch) and mobile CSS (44px touch targets).
- Accessibility: aria-labels on rating buttons, pagination, filter, nav buttons.
- User documentation: README, USER_MANUAL, SETTINGS, FAQ, TROUBLESHOOTING.
- Manifest `authorUrl` for community plugin submission.

### Changed

- DataStore: create backup before each save; validate and persist `backups` array.
- QueueManager: getQueueStats returns cached stats when fresh (STATS_CACHE_TTL_MS).
- Review sidebar: adds `fsrs-mobile` class on mobile for larger touch targets.
- SessionManager: startSession and rate wrapped in try/catch with handleError.
- Main: onload and startup sync wrapped in try/catch; handleError on failure.

## [0.1.0] – Initial release

- FSRS-based scheduling for atomic notes.
- Multiple queues (folder/tag criteria).
- Review sidebar with Again/Hard/Good/Easy.
- Dashboard: overview, heatmap, forecast, note table.
- Settings: tracked folders/tags, exclusions, queue order, limits.
- Undo last rating, skip, back, end session.
- Mobile support (isDesktopOnly: false).
- Data stored externally (zero note pollution).

[Unreleased]: https://github.com/rituraj/obsidian-fsrs-for-atomic-notes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/rituraj/obsidian-fsrs-for-atomic-notes/releases/tag/v0.1.0
