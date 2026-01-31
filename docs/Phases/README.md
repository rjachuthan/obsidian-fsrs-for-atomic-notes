# Obsidian FSRS Plugin - Development Phases

This directory contains detailed development phases for the **Obsidian FSRS for Atomic Notes** plugin.

Each phase is broken down into milestones with:

- Clear objectives
- Tangible deliverables
- Acceptance criteria
- Comprehensive test cases

---

## Phase Overview

| Phase                                      | Name             | Goal                                      | Milestones |
| ------------------------------------------ | ---------------- | ----------------------------------------- | ---------- |
| [Phase 1](./PHASE-1-CORE-FOUNDATION.md)    | Core Foundation  | Basic working spaced repetition with FSRS | 9          |
| [Phase 2](./PHASE-2-FULL-FEATURE-SET.md)   | Full Feature Set | Complete PRD feature implementation       | 9          |
| [Phase 3](./PHASE-3-POLISH-AND-RELEASE.md) | Polish & Release | Production-ready quality                  | 7          |
| [Phase 4](./PHASE-4-POST-LAUNCH.md)        | Post-Launch      | Iterate based on feedback                 | 7          |

---

## Phase 1: Core Foundation (MVP)

**Goal**: User can configure a folder, review notes, and have schedules persist.

### Milestones

| #   | Milestone        | Key Deliverables                |
| --- | ---------------- | ------------------------------- |
| 1.1 | Plugin Skeleton  | Build setup, module structure   |
| 1.2 | Data Layer       | Persistence, schema, validation |
| 1.3 | FSRS Integration | ts-fsrs wrapper, scheduling     |
| 1.4 | Note Selection   | Folder-based criteria           |
| 1.5 | Single Queue     | Default queue, card sync        |
| 1.6 | Review Sidebar   | Rating buttons, progress        |
| 1.7 | Session Logic    | Review workflow                 |
| 1.8 | Settings Tab     | Basic configuration             |
| 1.9 | Commands         | Core command registration       |

### Key Test Suites

- `plugin-lifecycle.test.ts` - Plugin load/unload
- `data-store.test.ts` - Data persistence
- `scheduler.test.ts` - FSRS algorithm
- `card-manager.test.ts` - Card CRUD
- `folder-criterion.test.ts` - Note selection
- `queue-manager.test.ts` - Queue operations
- `review-sidebar.test.ts` - UI components
- `session-manager.test.ts` - Review flow
- `settings-tab.test.ts` - Settings UI
- `phase1-integration.test.ts` - End-to-end

---

## Phase 2: Full Feature Set

**Goal**: All PRD features functional with comprehensive testing.

### Milestones

| #   | Milestone        | Key Deliverables               |
| --- | ---------------- | ------------------------------ |
| 2.1 | Multiple Queues  | CRUD, multi-queue cards        |
| 2.2 | Tag Selection    | Tag-based criteria             |
| 2.3 | Exclusion System | Name, tag, property exclusions |
| 2.4 | Complete Sidebar | Full statistics display        |
| 2.5 | Undo             | Undo last rating               |
| 2.6 | Go Back          | Navigation history             |
| 2.7 | Dashboard        | Analytics modal                |
| 2.8 | Orphan Detection | Handle moved/deleted notes     |
| 2.9 | All Commands     | Complete command set           |

### Key Test Suites

- `multi-queue.test.ts` - Multiple queue management
- `tag-criterion.test.ts` - Tag selection
- `exclusion-criteria.test.ts` - Exclusion rules
- `note-stats.test.ts` - Statistics display
- `undo-manager.test.ts` - Undo functionality
- `navigation.test.ts` - Session navigation
- `dashboard-modal.test.ts` - Dashboard UI
- `orphan-detector.test.ts` - Orphan handling
- `phase2-integration.test.ts` - Full workflow

---

## Phase 3: Polish & Release

**Goal**: Production-ready quality for community plugin submission.

### Milestones

| #   | Milestone      | Key Deliverables              |
| --- | -------------- | ----------------------------- |
| 3.1 | Performance    | Optimization, lazy loading    |
| 3.2 | Error Handling | Recovery, user messaging      |
| 3.3 | Cross-Platform | Windows, macOS, Linux, mobile |
| 3.4 | Documentation  | README, user manual           |
| 3.5 | Beta Testing   | BRAT release, feedback        |
| 3.6 | Bug Fixes      | Polish, accessibility         |
| 3.7 | Submission     | Community plugin PR           |

### Key Test Suites

- `performance.test.ts` - Load times, memory
- `error-recovery.test.ts` - Error handling
- `cross-platform.test.ts` - Platform compatibility
- `docs-quality.test.ts` - Documentation coverage
- `beta-readiness.test.ts` - Release criteria
- `final-checks.test.ts` - Accessibility, polish

---

## Phase 4: Post-Launch

**Goal**: Iterate based on user feedback, add advanced features.

### Milestones

| #   | Milestone        | Key Deliverables                 |
| --- | ---------------- | -------------------------------- |
| 4.1 | FSRS Parameters  | Retention, max interval settings |
| 4.2 | Suspend/Bury     | Temporarily exclude notes        |
| 4.3 | Data Export      | FSRS Optimizer compatibility     |
| 4.4 | Shortcuts        | Keyboard customization docs      |
| 4.5 | Mobile           | Touch optimization               |
| 4.6 | Large Vaults     | 5,000+ note support              |
| 4.7 | Per-Queue Params | Queue-level FSRS settings        |

### Key Test Suites

- `fsrs-params.test.ts` - Parameter customization
- `suspend-bury.test.ts` - Note suspension
- `data-export.test.ts` - Export format
- `hotkeys.test.ts` - Keyboard shortcuts
- `mobile-ui.test.ts` - Mobile layout
- `large-vault.test.ts` - Scale testing
- `per-queue-params.test.ts` - Advanced settings

---

## Test Case Naming Convention

All test cases follow this pattern:

```
{CATEGORY}-{NUMBER}: {Description}
```

### Categories by Phase

| Phase | Categories                                                              |
| ----- | ----------------------------------------------------------------------- |
| 1     | SETUP, DATA, FSRS, CARD, FOLDER, QUEUE, UI, SESSION, SETTINGS, CMD, INT |
| 2     | MQUEUE, TAG, EXCL, STATS, PRED, UNDO, NAV, DASH, WATCH, ORPHAN          |
| 3     | PERF, ERR, PLAT, DOC, BETA, POLISH                                      |
| 4     | PARAM, SUSP, BURY, EXPORT, HOTKEY, MOBILE, LARGE, PQP                   |

---

## Running Tests

```bash
# Run all tests
npm test

# Run phase-specific tests
npm test -- --grep "Phase 1"
npm test -- --grep "FSRS-"

# Run integration tests
npm test -- --grep "INT-"

# Run with coverage
npm test -- --coverage
```

---

## Development Workflow

1. **Pick a milestone** from the current phase
2. **Read the milestone document** for requirements
3. **Implement features** following the deliverables
4. **Write tests** using the provided test cases
5. **Verify acceptance criteria** are met
6. **Mark milestone complete** when all tests pass

---

## Definition of Done

A milestone is complete when:

- [ ] All deliverables implemented
- [ ] All acceptance criteria met
- [ ] All test cases pass
- [ ] Code reviewed (if team)
- [ ] No regression in existing tests
- [ ] Documentation updated

---

## Quick Links

- [PRD](../PRD.md) - Full product requirements
- [Phase 1](./PHASE-1-CORE-FOUNDATION.md) - Start here
- [Phase 2](./PHASE-2-FULL-FEATURE-SET.md) - Full features
- [Phase 3](./PHASE-3-POLISH-AND-RELEASE.md) - Release prep
- [Phase 4](./PHASE-4-POST-LAUNCH.md) - Post-launch
