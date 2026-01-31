# Phase 3: Polish & Release

**Goal**: Production-ready quality for community plugin submission
**Prerequisites**: Phase 2 complete with all features working
**Success Criteria**: Plugin approved for Obsidian community plugins directory.

---

## Milestones

### Milestone 3.1: Performance Optimization

**Objective**: Ensure smooth performance across various vault sizes.

#### Deliverables

- [ ] Profile and optimize data loading
- [ ] Implement lazy loading for large datasets
- [ ] Add pagination to note table
- [ ] Optimize review log queries
- [ ] Debounce save operations effectively
- [ ] Cache computed statistics

#### Performance Targets

| Metric                    | Target  | Maximum |
| ------------------------- | ------- | ------- |
| Plugin load time          | < 100ms | 500ms   |
| Start review session      | < 200ms | 1000ms  |
| Dashboard open            | < 300ms | 1500ms  |
| Rating processing         | < 50ms  | 200ms   |
| Note table (1000 cards)   | < 500ms | 2000ms  |
| Memory usage (1000 cards) | < 20MB  | 50MB    |

#### Key Optimizations

```typescript
// data/data-store.ts - Lazy loading
class DataStore {
  private _reviews: ReviewLog[] | null = null;

  // Load reviews only when needed
  get reviews(): ReviewLog[] {
    if (this._reviews === null) {
      this._reviews = this.loadReviewsFromDisk();
    }
    return this._reviews;
  }
}

// ui/dashboard/note-table.ts - Virtualization
class NoteTable {
  private pageSize = 50;
  private currentPage = 0;

  // Only render visible rows
  renderPage(page: number): void;
}

// utils/stats-calculator.ts - Caching
class StatsCalculator {
  private cache: Map<string, CachedStat> = new Map();
  private cacheMaxAge = 60000; // 1 minute

  getStats(queueId: string): QueueStats {
    const cached = this.cache.get(queueId);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.value;
    }
    const computed = this.computeStats(queueId);
    this.cache.set(queueId, { value: computed, timestamp: Date.now() });
    return computed;
  }
}
```

#### Acceptance Criteria

- [ ] Plugin loads instantly on typical vaults (< 500 notes)
- [ ] Large vaults (1000+ notes) load within targets
- [ ] Dashboard renders without blocking UI
- [ ] No jank during review sessions
- [ ] Memory stays bounded

#### Test Cases

```typescript
// test/performance/performance.test.ts

describe("Performance", () => {
  describe("Load Times", () => {
    test("PERF-001: Plugin loads under 500ms with 500 cards", async () => {
      // Given: Data file with 500 cards, 5000 review logs
      // When: Plugin loads
      // Then: onload() completes in < 500ms
    });

    test("PERF-002: Plugin loads under 2s with 2000 cards", async () => {
      // Given: Data file with 2000 cards, 20000 review logs
      // When: Plugin loads
      // Then: onload() completes in < 2000ms
    });

    test("PERF-003: Dashboard opens under 1.5s with 1000 cards", async () => {
      // Given: 1000 cards in system
      // When: Opening dashboard
      // Then: Modal visible in < 1500ms
    });
  });

  describe("Rating Performance", () => {
    test("PERF-004: Rating processes under 200ms", async () => {
      // Given: Active session
      // When: Rating a note
      // Then: Card updated + log saved + next note loaded < 200ms
    });

    test("PERF-005: Undo processes under 100ms", async () => {
      // Given: Rating just made
      // When: Undo
      // Then: Rollback complete < 100ms
    });
  });

  describe("Memory", () => {
    test("PERF-006: Memory bounded for large datasets", () => {
      // Given: 2000 cards loaded
      // When: Checking memory usage
      // Then: Heap increase < 50MB
    });

    test("PERF-007: No memory leak on session cycles", async () => {
      // Given: Initial memory M
      // When: Start/end 10 sessions
      // Then: Memory approximately M (no significant leak)
    });
  });

  describe("Lazy Loading", () => {
    test("PERF-008: Review logs loaded on demand", () => {
      // Given: Plugin loaded
      // When: Not accessing reviews
      // Then: Review logs not in memory
    });

    test("PERF-009: Note table paginates correctly", () => {
      // Given: 1000 cards
      // When: Rendering table page 1
      // Then: Only 50 rows rendered
      // And: Pagination controls visible
    });
  });
});
```

---

### Milestone 3.2: Error Handling & Recovery

**Objective**: Graceful handling of all error conditions.

#### Deliverables

- [ ] Wrap all async operations in try-catch
- [ ] Add error boundaries for UI components
- [ ] Implement data backup before writes
- [ ] Create recovery mechanisms for corrupted data
- [ ] Add user-friendly error messages
- [ ] Log errors for debugging

#### Error Categories

| Category          | Handling Strategy                        |
| ----------------- | ---------------------------------------- |
| Data corruption   | Restore from backup, notify user         |
| File access       | Retry with exponential backoff, notify   |
| Invalid state     | Reset to safe default, log for debugging |
| FSRS calculation  | Use safe fallback interval, log          |
| UI render failure | Show error message, allow retry          |
| Plugin conflict   | Detect and warn, provide workaround      |

#### Key Implementation

```typescript
// data/backup.ts
class BackupManager {
  // Create backup before risky operations
  async createBackup(): Promise<string>;

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<void>;

  // List available backups
  listBackups(): BackupInfo[];

  // Auto-cleanup old backups (keep last 5)
  cleanupOldBackups(): void;
}

// utils/error-handler.ts
class ErrorHandler {
  // Centralized error handling
  handle(error: Error, context: ErrorContext): void {
    this.log(error, context);
    this.notifyUser(error, context);
    this.attemptRecovery(context);
  }
}

// ui/error-boundary.ts
function withErrorBoundary<T>(component: () => T, fallback: () => T): T {
  try {
    return component();
  } catch (error) {
    ErrorHandler.handle(error, { component: component.name });
    return fallback();
  }
}
```

#### Acceptance Criteria

- [ ] No uncaught exceptions crash the plugin
- [ ] User sees helpful message on error
- [ ] Data is backed up before modifications
- [ ] Corrupted data can be recovered
- [ ] Errors are logged for debugging

#### Test Cases

```typescript
// test/error-handling/error-recovery.test.ts

describe("Error Handling", () => {
  describe("Data Corruption", () => {
    test("ERR-001: Corrupted JSON triggers recovery", async () => {
      // Given: data.json contains invalid JSON
      // When: Plugin loads
      // Then: Error logged
      // And: User notified
      // And: Backup offered or defaults used
    });

    test("ERR-002: Missing required field uses default", async () => {
      // Given: Card missing "due" field
      // When: Loading card
      // Then: Warning logged
      // And: Due set to now (treat as new)
    });

    test("ERR-003: Invalid FSRS state corrected", async () => {
      // Given: Card with state = 5 (invalid)
      // When: Loading card
      // Then: State reset to 0 (New)
      // And: Warning logged
    });
  });

  describe("File Operations", () => {
    test("ERR-004: Save failure retries", async () => {
      // Given: First save attempt fails
      // When: Saving data
      // Then: Retry attempted
      // And: After 3 failures, notify user
    });

    test("ERR-005: Load failure shows recovery options", async () => {
      // Given: data.json unreadable
      // When: Plugin loads
      // Then: Modal with options:
      //       - Use defaults
      //       - Restore from backup
      //       - Manual recovery
    });
  });

  describe("Session Errors", () => {
    test("ERR-006: Missing note during session handled", async () => {
      // Given: Active session, expected note deleted
      // When: Trying to open note
      // Then: Notice "Note not found"
      // And: Offer to skip or end session
    });

    test("ERR-007: Rating failure doesn't lose session", async () => {
      // Given: Active session
      // When: Rating save fails
      // Then: Card update retried
      // And: Session state preserved
      // And: User can retry or skip
    });
  });

  describe("Backup System", () => {
    test("ERR-008: Backup created before save", async () => {
      // Given: Existing data.json
      // When: Saving new data
      // Then: Backup created first
    });

    test("ERR-009: Backup can be restored", async () => {
      // Given: Valid backup exists
      // When: Restoring from backup
      // Then: Data matches backup
      // And: Plugin functions normally
    });

    test("ERR-010: Old backups cleaned up", async () => {
      // Given: 10 backups exist
      // When: Cleanup runs
      // Then: Only 5 most recent remain
    });
  });
});
```

---

### Milestone 3.3: Cross-Platform Testing

**Objective**: Verify functionality across all supported platforms.

#### Deliverables

- [ ] Test on Windows 10/11
- [ ] Test on macOS (Intel and Apple Silicon)
- [ ] Test on Linux (Ubuntu/Fedora)
- [ ] Test on iOS (Obsidian Mobile)
- [ ] Test on Android (Obsidian Mobile)
- [ ] Document platform-specific behaviors

#### Platform Test Matrix

| Feature            | Windows | macOS | Linux | iOS | Android |
| ------------------ | ------- | ----- | ----- | --- | ------- |
| Plugin load        | ✓       | ✓     | ✓     | ✓   | ✓       |
| Review sidebar     | ✓       | ✓     | ✓     | ✓   | ✓       |
| Rating buttons     | ✓       | ✓     | ✓     | ✓   | ✓       |
| Dashboard          | ✓       | ✓     | ✓     | ✓   | ✓       |
| Settings           | ✓       | ✓     | ✓     | ✓   | ✓       |
| Data persistence   | ✓       | ✓     | ✓     | ✓   | ✓       |
| Keyboard shortcuts | ✓       | ✓     | ✓     | N/A | N/A     |
| Touch interactions | N/A     | N/A   | N/A   | ✓   | ✓       |

#### Mobile-Specific Considerations

```typescript
// utils/platform.ts
class Platform {
  static isMobile(): boolean {
    return Platform.isMobileApp;
  }

  static isTouch(): boolean {
    return "ontouchstart" in window;
  }
}

// ui/sidebar/review-sidebar.ts
class ReviewSidebar {
  render(): void {
    if (Platform.isMobile()) {
      this.renderMobileLayout();
    } else {
      this.renderDesktopLayout();
    }
  }

  renderMobileLayout(): void {
    // Larger touch targets
    // Full-width buttons
    // Simplified stats display
  }
}
```

#### Acceptance Criteria

- [ ] Core functionality works on all platforms
- [ ] No platform-specific crashes
- [ ] Mobile UI is usable (touch targets, readability)
- [ ] Data syncs correctly across platforms
- [ ] Keyboard shortcuts work on desktop platforms

#### Test Cases

```typescript
// test/platform/cross-platform.test.ts

describe("Cross-Platform Compatibility", () => {
  describe("File Paths", () => {
    test("PLAT-001: Paths work on Windows", () => {
      // Given: Note at "Notes\Concept.md"
      // When: Storing and retrieving card
      // Then: Path handling works correctly
    });

    test("PLAT-002: Paths work on Unix", () => {
      // Given: Note at "Notes/Concept.md"
      // When: Storing and retrieving card
      // Then: Path handling works correctly
    });

    test("PLAT-003: Unicode paths supported", () => {
      // Given: Note at "笔记/概念.md"
      // When: Creating card
      // Then: Path stored and retrieved correctly
    });
  });

  describe("Mobile Layout", () => {
    test("PLAT-004: Touch targets are 44px minimum", () => {
      // Given: Mobile layout
      // When: Measuring button sizes
      // Then: All interactive elements >= 44px
    });

    test("PLAT-005: Sidebar scrollable on small screens", () => {
      // Given: Small viewport (375px wide)
      // When: Sidebar has lots of content
      // Then: Content is scrollable
    });
  });

  describe("Sync Compatibility", () => {
    test("PLAT-006: Data format compatible across platforms", () => {
      // Given: Data saved on Windows
      // When: Loading on macOS
      // Then: All data loads correctly
    });
  });
});
```

---

### Milestone 3.4: User Documentation

**Objective**: Create comprehensive documentation for users.

#### Deliverables

- [ ] README.md with quick start guide
- [ ] Detailed user manual
- [ ] Settings explanation
- [ ] FAQ section
- [ ] Troubleshooting guide
- [ ] CHANGELOG.md
- [ ] Screenshots/GIFs for visual features

#### Documentation Structure

```
docs/
├── README.md           # Quick start, installation
├── USER_MANUAL.md      # Comprehensive usage guide
├── SETTINGS.md         # All settings explained
├── FAQ.md              # Common questions
├── TROUBLESHOOTING.md  # Problem solving
├── CHANGELOG.md        # Version history
└── assets/
    ├── sidebar.png
    ├── dashboard.png
    └── review-demo.gif
```

#### README Sections

1. **What is FSRS for Atomic Notes?**
2. **Installation**
3. **Quick Start (5-minute setup)**
4. **Key Features**
5. **How It Works (brief FSRS explanation)**
6. **Configuration**
7. **FAQ**
8. **Contributing**
9. **License**

#### Acceptance Criteria

- [ ] New user can set up in < 5 minutes following docs
- [ ] All features documented
- [ ] Settings have clear explanations
- [ ] Common issues have solutions
- [ ] Screenshots are current

#### Test Cases

```typescript
// test/documentation/docs-quality.test.ts

describe("Documentation Quality", () => {
  test("DOC-001: README exists and has required sections", () => {
    // Given: README.md file
    // When: Parsing content
    // Then: Contains: Installation, Quick Start, Features
  });

  test("DOC-002: All settings documented", () => {
    // Given: Settings in plugin
    // When: Checking SETTINGS.md
    // Then: Every setting has an entry
  });

  test("DOC-003: Screenshots match current UI", () => {
    // Given: Screenshots in assets/
    // When: Comparing to current UI
    // Then: Screenshots are up to date
  });

  test("DOC-004: Internal links work", () => {
    // Given: Links in documentation
    // When: Following links
    // Then: All links resolve correctly
  });
});
```

---

### Milestone 3.5: Beta Testing (BRAT)

**Objective**: Real-world testing with beta users before public release.

#### Deliverables

- [ ] Prepare BRAT-compatible release
- [ ] Recruit beta testers (5-10 users)
- [ ] Create feedback collection mechanism
- [ ] Track and prioritize issues
- [ ] Iterate on critical feedback
- [ ] Document breaking changes

#### BRAT Setup

```json
// manifest.json (beta version)
{
  "id": "obsidian-fsrs-atomic",
  "name": "FSRS for Atomic Notes",
  "version": "0.9.0-beta.1",
  "minAppVersion": "1.0.0",
  "description": "Spaced repetition for atomic notes using FSRS algorithm",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourusername",
  "isDesktopOnly": false
}
```

#### Beta Feedback Template

```markdown
## Beta Feedback

**Version**: 0.9.0-beta.1
**Platform**: [Windows/macOS/Linux/iOS/Android]
**Vault Size**: [Small <100 / Medium 100-500 / Large 500+]

### What Worked Well

-

### Issues Encountered

-

### Feature Suggestions

-

### Usability Feedback

-
```

#### Acceptance Criteria

- [ ] At least 5 beta testers complete 1 week of use
- [ ] No critical bugs remaining
- [ ] All major usability issues addressed
- [ ] Performance acceptable for all testers
- [ ] Documentation clear to new users

#### Test Cases

```typescript
// test/beta/beta-readiness.test.ts

describe("Beta Readiness", () => {
  test("BETA-001: manifest.json is valid", () => {
    // Given: manifest.json
    // When: Validating format
    // Then: All required fields present
    // And: Version is semver compatible
  });

  test("BETA-002: No console errors in normal use", async () => {
    // Given: Plugin running
    // When: Performing typical workflow
    // Then: No errors in console
  });

  test("BETA-003: All features accessible", async () => {
    // Given: Fresh installation
    // When: Testing all features
    // Then: Each feature works as documented
  });

  test("BETA-004: Data migration works", async () => {
    // Given: Data from previous beta version
    // When: Upgrading
    // Then: All data preserved and migrated
  });
});
```

---

### Milestone 3.6: Bug Fixes & Polish

**Objective**: Address all identified issues from testing.

#### Deliverables

- [ ] Fix all critical/high severity bugs
- [ ] Address medium severity bugs
- [ ] Polish UI animations and transitions
- [ ] Improve accessibility (ARIA labels, keyboard nav)
- [ ] Optimize bundle size
- [ ] Final code cleanup

#### Bug Severity Levels

| Severity | Description               | Resolution  |
| -------- | ------------------------- | ----------- |
| Critical | Data loss, crash          | Must fix    |
| High     | Feature broken            | Must fix    |
| Medium   | Feature impaired          | Should fix  |
| Low      | Cosmetic, minor annoyance | Nice to fix |

#### Polish Checklist

- [ ] Consistent spacing throughout UI
- [ ] Icons align properly
- [ ] Loading states for async operations
- [ ] Smooth transitions (no jarring changes)
- [ ] Proper focus indicators
- [ ] Color contrast meets WCAG AA
- [ ] Error states are clear

#### Acceptance Criteria

- [ ] Zero critical/high bugs
- [ ] Medium bugs < 3 remaining
- [ ] UI feels polished and professional
- [ ] Bundle size < 300KB
- [ ] Code follows Obsidian plugin guidelines

#### Test Cases

```typescript
// test/polish/final-checks.test.ts

describe("Final Polish", () => {
  describe("Accessibility", () => {
    test("POLISH-001: Buttons have accessible names", () => {
      // Given: Rating buttons
      // When: Checking aria-label
      // Then: Each button has descriptive label
    });

    test("POLISH-002: Keyboard navigation works", () => {
      // Given: Sidebar focused
      // When: Using Tab key
      // Then: Focus moves logically through controls
    });

    test("POLISH-003: Color contrast sufficient", () => {
      // Given: Text and background colors
      // When: Calculating contrast ratio
      // Then: Ratio >= 4.5:1 (WCAG AA)
    });
  });

  describe("Bundle", () => {
    test("POLISH-004: Bundle size acceptable", () => {
      // Given: Built main.js
      // When: Checking file size
      // Then: Size < 300KB
    });

    test("POLISH-005: No unused dependencies", () => {
      // Given: Built bundle
      // When: Analyzing imports
      // Then: No dead code from unused deps
    });
  });

  describe("UI Consistency", () => {
    test("POLISH-006: Matches Obsidian theme", () => {
      // Given: Plugin UI
      // When: Comparing to native Obsidian elements
      // Then: Consistent styling (fonts, colors, spacing)
    });
  });
});
```

---

### Milestone 3.7: Community Plugin Submission

**Objective**: Submit plugin to Obsidian community plugins.

#### Deliverables

- [ ] Final version number (1.0.0)
- [ ] Create GitHub release with assets
- [ ] Submit PR to obsidian-releases repo
- [ ] Respond to review feedback
- [ ] Plugin approved and listed

#### Submission Checklist

From [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin):

- [ ] Plugin ID is unique and follows conventions
- [ ] Plugin name is clear and descriptive
- [ ] Description is concise (< 250 chars)
- [ ] README has clear installation instructions
- [ ] No obfuscated code
- [ ] No external network calls without user consent
- [ ] Follows Obsidian's security guidelines
- [ ] Works on both desktop and mobile (or marked desktop-only)
- [ ] Tested on latest Obsidian version

#### Release Artifacts

```
obsidian-fsrs-atomic/
├── main.js
├── manifest.json
├── styles.css
└── (optional) data.json template
```

#### Pull Request Template

```markdown
## Community Plugin Submission

**Plugin Name**: FSRS for Atomic Notes
**Plugin ID**: obsidian-fsrs-atomic
**Repository**: https://github.com/username/obsidian-fsrs-atomic

### Description

Spaced repetition for atomic notes using the FSRS algorithm. Maintains complete separation between notes and scheduling metadata.

### Checklist

- [x] I have tested my plugin on Windows, macOS, and mobile
- [x] I have included a README with installation instructions
- [x] My plugin follows the developer policies
- [x] I have not included any analytics or tracking
- [x] My plugin does not make network requests (or I have disclosed them)

### Screenshots

[Attach screenshots of main features]
```

#### Acceptance Criteria

- [ ] PR submitted to obsidian-releases
- [ ] All review comments addressed
- [ ] Plugin approved
- [ ] Visible in Community Plugins browser

---

## Phase 3 Quality Gates

### Pre-Release Checklist

```markdown
## Pre-Release Quality Gates

### Functionality

- [ ] All Phase 1 features work
- [ ] All Phase 2 features work
- [ ] No regression from previous versions

### Performance

- [ ] Load time under targets
- [ ] No memory leaks
- [ ] Smooth UI interactions

### Stability

- [ ] No crashes in 1 week of use
- [ ] Error handling covers all cases
- [ ] Data never corrupted

### Compatibility

- [ ] Works on Windows
- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on iOS (basic)
- [ ] Works on Android (basic)

### Documentation

- [ ] README complete
- [ ] User manual complete
- [ ] All settings documented

### Code Quality

- [ ] No TypeScript errors
- [ ] Follows Obsidian guidelines
- [ ] Code reviewed
- [ ] Bundle optimized
```

---

## Phase 3 Completion Checklist

### Deliverables

- [ ] Performance optimized
- [ ] Error handling comprehensive
- [ ] All platforms tested
- [ ] Documentation complete
- [ ] Beta testing complete
- [ ] Bugs fixed
- [ ] Plugin submitted

### Definition of Done

**Plugin is:**

1. Performant on typical vaults
2. Stable with no crashes
3. Well-documented
4. Tested by real users
5. Approved for community listing
6. Available in Obsidian's plugin browser

---

## Release Notes Template

```markdown
# FSRS for Atomic Notes v1.0.0

## What's New

First public release of FSRS for Atomic Notes!

### Features

- **FSRS v6 Algorithm**: State-of-the-art spaced repetition
- **Zero Note Pollution**: All data stored externally
- **Multiple Queues**: Organize reviews by topic
- **Rich Statistics**: Track your learning progress
- **Mobile Support**: Review on any device

### Getting Started

1. Install from Community Plugins
2. Open Settings → FSRS for Atomic Notes
3. Add your notes folder to "Tracked Folders"
4. Use Command Palette: "FSRS: Start Review"

### Documentation

See [README](https://github.com/username/obsidian-fsrs-atomic) for full documentation.

### Feedback

Report issues on [GitHub](https://github.com/username/obsidian-fsrs-atomic/issues).
```
