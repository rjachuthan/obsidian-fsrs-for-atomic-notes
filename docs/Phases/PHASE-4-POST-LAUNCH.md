# Phase 4: Post-Launch Iterations

**Goal**: Iterate based on user feedback and add advanced features
**Prerequisites**: Phase 3 complete, plugin publicly released
**Success Criteria**: Active user community with high satisfaction, feature requests addressed.

---

## Milestones

### Milestone 4.1: FSRS Parameter Customization

**Objective**: Allow users to customize FSRS algorithm parameters.

#### Deliverables

- [ ] Add FSRS parameters section in settings
- [ ] Implement request_retention slider (0.70-0.97)
- [ ] Implement maximum_interval setting
- [ ] Add enable_fuzz toggle
- [ ] Show parameter effects explanation
- [ ] Add "Reset to defaults" button

#### FSRS Parameters

| Parameter           | Default | Range       | Description                            |
| ------------------- | ------- | ----------- | -------------------------------------- |
| `request_retention` | 0.90    | 0.70 - 0.97 | Target retention rate                  |
| `maximum_interval`  | 36500   | 1 - 36500   | Maximum days between reviews           |
| `enable_fuzz`       | true    | bool        | Add randomness to prevent same-day due |
| `w` (weights)       | default | 19 floats   | Advanced: FSRS algorithm weights       |

#### Settings UI

```typescript
// ui/settings/fsrs-settings.ts
class FSRSSettingsSection {
  render(container: HTMLElement): void {
    // Request Retention
    // Slider with percentage display
    // "Higher = more reviews, better retention"
    // "Lower = fewer reviews, more forgetting"
    // Maximum Interval
    // Number input with explanation
    // "Cards won't be scheduled more than X days apart"
    // Enable Fuzz
    // Toggle with explanation
    // "Adds small randomness to prevent all cards due same day"
    // Advanced: Custom Weights
    // Hidden by default, expandable
    // Text input for JSON array of 19 weights
    // "Only modify if you've trained custom parameters"
  }
}
```

#### Acceptance Criteria

- [ ] Retention slider adjusts from 70% to 97%
- [ ] Changes take effect on next review
- [ ] Maximum interval respected by scheduler
- [ ] Fuzz toggle works correctly
- [ ] Defaults easily restored

#### Test Cases

```typescript
// test/settings/fsrs-params.test.ts

describe("FSRS Parameter Customization", () => {
  describe("Request Retention", () => {
    test("PARAM-001: Retention affects scheduling", () => {
      // Given: Retention set to 0.95
      // When: Calculating next interval
      // Then: Interval shorter than with 0.90
    });

    test("PARAM-002: Retention bounded correctly", () => {
      // Given: User tries to set retention to 0.99
      // When: Saving
      // Then: Value capped at 0.97
    });

    test("PARAM-003: Retention slider shows percentage", () => {
      // Given: Slider at 0.85
      // When: Rendering
      // Then: Shows "85%"
    });
  });

  describe("Maximum Interval", () => {
    test("PARAM-004: Max interval limits scheduling", () => {
      // Given: Max interval = 180 days
      // When: Card would be scheduled 200 days out
      // Then: Scheduled at 180 days instead
    });

    test("PARAM-005: Max interval can be very long", () => {
      // Given: Max interval = 36500 (100 years)
      // When: Saving
      // Then: Value accepted
    });
  });

  describe("Fuzz", () => {
    test("PARAM-006: Fuzz adds variance", () => {
      // Given: Fuzz enabled, exact interval = 10 days
      // When: Getting scheduled date multiple times
      // Then: Dates vary slightly (9-11 days)
    });

    test("PARAM-007: Fuzz can be disabled", () => {
      // Given: Fuzz disabled
      // When: Getting scheduled date
      // Then: Exact interval used
    });
  });

  describe("Reset", () => {
    test("PARAM-008: Reset restores defaults", () => {
      // Given: Modified retention = 0.80
      // When: Clicking "Reset to defaults"
      // Then: Retention = 0.90
      // And: Other params reset too
    });
  });
});
```

---

### Milestone 4.2: Suspend and Bury Notes

**Objective**: Allow temporary or permanent exclusion of notes from review.

#### Deliverables

- [ ] Add "Suspend" action (indefinite pause)
- [ ] Add "Bury" action (skip until tomorrow)
- [ ] UI indicators for suspended/buried notes
- [ ] Unsuspend/unbury functionality
- [ ] Dashboard section for suspended notes

#### Definitions

| Action      | Duration                | Purpose                        |
| ----------- | ----------------------- | ------------------------------ |
| **Bury**    | Until next day          | "I'll deal with this tomorrow" |
| **Suspend** | Until manually unpaused | "I don't want to review this"  |

#### Key Implementation

```typescript
// types.ts
interface CardSchedule {
  // ... existing fields
  suspended: boolean;
  suspendedAt: string | null;
  buriedUntil: string | null; // ISO date
}

// fsrs/card-manager.ts
class CardManager {
  suspendCard(notePath: string, queueId: string): void {
    const card = this.getCard(notePath);
    card.schedules[queueId].suspended = true;
    card.schedules[queueId].suspendedAt = new Date().toISOString();
  }

  unsuspendCard(notePath: string, queueId: string): void {
    const card = this.getCard(notePath);
    card.schedules[queueId].suspended = false;
    card.schedules[queueId].suspendedAt = null;
  }

  buryCard(notePath: string, queueId: string): void {
    const card = this.getCard(notePath);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    card.schedules[queueId].buriedUntil = tomorrow.toISOString();
  }

  isBuried(card: CardData, queueId: string): boolean {
    const buriedUntil = card.schedules[queueId]?.buriedUntil;
    if (!buriedUntil) return false;
    return new Date(buriedUntil) > new Date();
  }
}
```

#### UI Changes

- Sidebar: Add "Suspend" and "Bury" buttons during review
- Dashboard: "Suspended Notes" section with unbury option
- Note table: Status column shows suspended/buried
- Commands: `fsrs:suspend-note`, `fsrs:bury-note`

#### Acceptance Criteria

- [ ] Suspended notes never appear in review
- [ ] Buried notes appear after midnight
- [ ] Can unsuspend from dashboard
- [ ] Bury auto-clears at midnight
- [ ] Stats exclude suspended notes

#### Test Cases

```typescript
// test/cards/suspend-bury.test.ts

describe("Suspend and Bury", () => {
  describe("Suspend", () => {
    test("SUSP-001: Suspended card excluded from due", () => {
      // Given: Card is due, then suspended
      // When: Getting due cards
      // Then: Card not included
    });

    test("SUSP-002: Unsuspend makes card available", () => {
      // Given: Suspended card that would be due
      // When: Unsuspending
      // Then: Card appears in due list
    });

    test("SUSP-003: Suspend preserves scheduling", () => {
      // Given: Card with stability 30
      // When: Suspend, then unsuspend
      // Then: Stability still 30
    });

    test("SUSP-004: Suspended at timestamp recorded", () => {
      // Given: Card suspended at time T
      // When: Checking card data
      // Then: suspendedAt = T
    });
  });

  describe("Bury", () => {
    test("BURY-001: Buried card excluded until tomorrow", () => {
      // Given: Card buried today at 2pm
      // When: Getting due cards today
      // Then: Card not included
    });

    test("BURY-002: Buried card available after midnight", () => {
      // Given: Card buried, now is next day
      // When: Getting due cards
      // Then: Card included (bury expired)
    });

    test("BURY-003: Bury doesn't affect scheduling", () => {
      // Given: Card was due today, buried
      // When: Tomorrow arrives
      // Then: Card due date unchanged
      // And: Still due (now overdue by 1 day)
    });
  });

  describe("Dashboard", () => {
    test("SUSP-005: Shows suspended count", () => {
      // Given: 5 suspended cards
      // When: Rendering dashboard
      // Then: Shows "5 suspended"
    });

    test("SUSP-006: Can unsuspend from table", () => {
      // Given: Suspended card in table
      // When: Clicking "Unsuspend"
      // Then: Card unsuspended
    });
  });
});
```

---

### Milestone 4.3: Data Export for FSRS Optimizer

**Objective**: Allow users to export review data for training custom FSRS parameters.

#### Deliverables

- [ ] Export review logs in FSRS Optimizer format
- [ ] Export as downloadable file
- [ ] Filter by date range
- [ ] Include card metadata
- [ ] Import optimized parameters

#### Export Format

```json
{
  "version": 1,
  "exportedAt": "2026-02-15T10:30:00Z",
  "reviewLogs": [
    {
      "card_id": "note-path.md",
      "rating": 3,
      "state": 2,
      "due": "2026-02-10T00:00:00Z",
      "stability": 10.5,
      "difficulty": 4.2,
      "elapsed_days": 5,
      "scheduled_days": 5,
      "review": "2026-02-15T09:00:00Z"
    }
  ],
  "metadata": {
    "total_cards": 150,
    "total_reviews": 1200,
    "date_range": {
      "from": "2026-01-01",
      "to": "2026-02-15"
    }
  }
}
```

#### FSRS Optimizer Compatibility

The export format matches [FSRS Optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer) input requirements:

- rating: 1-4
- state: 0-3
- elapsed_days: actual days since last review
- scheduled_days: scheduled interval

#### Acceptance Criteria

- [ ] Export produces valid JSON
- [ ] Format compatible with FSRS Optimizer
- [ ] Date range filtering works
- [ ] Large exports handled efficiently
- [ ] Import validated before applying

#### Test Cases

```typescript
// test/export/data-export.test.ts

describe("Data Export", () => {
  describe("Export Format", () => {
    test("EXPORT-001: Produces valid JSON", () => {
      // Given: 100 review logs
      // When: Exporting
      // Then: JSON.parse succeeds
    });

    test("EXPORT-002: All required fields present", () => {
      // Given: Review logs
      // When: Exporting
      // Then: Each log has: rating, state, due, stability, difficulty, elapsed_days, scheduled_days, review
    });

    test("EXPORT-003: Rating values correct", () => {
      // Given: Reviews with all rating types
      // When: Exporting
      // Then: Ratings are 1, 2, 3, or 4
    });
  });

  describe("Filtering", () => {
    test("EXPORT-004: Date range filters correctly", () => {
      // Given: Reviews from Jan-Mar
      // When: Exporting Feb only
      // Then: Only Feb reviews included
    });

    test("EXPORT-005: Excludes undone reviews", () => {
      // Given: Review with undone=true
      // When: Exporting
      // Then: Undone review excluded
    });
  });

  describe("Import", () => {
    test("EXPORT-006: Valid weights imported", () => {
      // Given: Valid 19-weight array
      // When: Importing
      // Then: FSRS parameters updated
    });

    test("EXPORT-007: Invalid weights rejected", () => {
      // Given: Invalid weights (wrong count or type)
      // When: Importing
      // Then: Error shown, no change made
    });
  });
});
```

---

### Milestone 4.4: Keyboard Shortcuts Customization

**Objective**: Allow full customization of plugin keyboard shortcuts.

#### Deliverables

- [ ] Document default shortcuts
- [ ] Integrate with Obsidian's hotkey system
- [ ] Add recommended shortcuts in docs
- [ ] Test for conflicts with common plugins
- [ ] Support chord shortcuts (Ctrl+K, Ctrl+R)

#### Default Shortcuts (Suggestions)

| Command        | Default      | Rationale           |
| -------------- | ------------ | ------------------- |
| Start Review   | Ctrl+Shift+R | R for Review        |
| Open Dashboard | Ctrl+Shift+D | D for Dashboard     |
| Rate Again     | 1            | Anki-style numeric  |
| Rate Hard      | 2            | Anki-style numeric  |
| Rate Good      | 3            | Anki-style numeric  |
| Rate Easy      | 4            | Anki-style numeric  |
| Skip           | S            | S for Skip          |
| Previous       | A            | Left hand, near 1-4 |
| Undo           | Ctrl+Z       | Universal undo      |
| End Session    | Escape       | Universal cancel    |

#### Implementation

```typescript
// commands/index.ts
export function registerCommands(plugin: Plugin) {
  // Commands are registered normally
  // Obsidian handles hotkey customization via Settings > Hotkeys

  plugin.addCommand({
    id: "fsrs:rate-again",
    name: "FSRS: Rate Again",
    // Obsidian automatically allows users to assign hotkeys
    callback: () => plugin.sessionManager.rate(Rating.Again),
  });

  // Users can then go to Settings > Hotkeys
  // Search for "FSRS" and assign their preferred keys
}
```

#### Documentation

Create section in user manual explaining:

1. How to access Obsidian's Hotkeys settings
2. Recommended key bindings
3. Avoiding conflicts
4. Chord shortcuts if needed

#### Acceptance Criteria

- [ ] All commands appear in Hotkeys settings
- [ ] Default suggestions documented
- [ ] No conflicts with core Obsidian shortcuts
- [ ] Shortcuts work during review session

#### Test Cases

```typescript
// test/commands/hotkeys.test.ts

describe("Keyboard Shortcuts", () => {
  test("HOTKEY-001: Commands available in Hotkeys settings", () => {
    // Given: Plugin loaded
    // When: Opening Settings > Hotkeys
    // Then: All FSRS commands searchable
  });

  test("HOTKEY-002: Rating shortcuts work in session", () => {
    // Given: Active session, hotkey "3" assigned to Rate Good
    // When: Pressing "3"
    // Then: Current note rated Good
  });

  test("HOTKEY-003: Shortcuts inactive when no session", () => {
    // Given: No active session
    // When: Pressing rating hotkey
    // Then: No action (or notice)
  });

  test("HOTKEY-004: No default conflicts", () => {
    // Given: Default Obsidian installation
    // When: Checking recommended shortcuts
    // Then: No conflicts with core shortcuts
  });
});
```

---

### Milestone 4.5: Mobile Optimizations

**Objective**: Enhance mobile experience for iOS and Android.

#### Deliverables

- [ ] Responsive sidebar layout
- [ ] Touch-friendly button sizes (44pt minimum)
- [ ] Swipe gestures for rating (optional)
- [ ] Optimized dashboard for small screens
- [ ] Reduced animations for performance
- [ ] Offline functionality verification

#### Mobile-Specific UI

```typescript
// ui/sidebar/mobile-sidebar.ts
class MobileSidebar {
  render(): void {
    // Full-width rating buttons
    // Larger touch targets
    // Simplified stats (collapsible)
    // Bottom-positioned for thumb reach
  }
}

// Swipe gestures (optional feature)
class SwipeGestureHandler {
  // Swipe left = Again
  // Swipe right = Good
  // Swipe up = Easy
  // Swipe down = Hard
}
```

#### Mobile Layout

```
┌─────────────────────────────┐
│ Queue: Computer Science     │
│ Progress: 5 of 23           │
├─────────────────────────────┤
│                             │
│  [        Again        ]    │
│  [        Hard         ]    │
│  [        Good         ]    │
│  [        Easy         ]    │
│                             │
│  [Skip]  [Back]  [Undo]     │
│                             │
├─────────────────────────────┤
│ ▸ Note Stats                │
│ ▸ Session Stats             │
├─────────────────────────────┤
│  [     End Session     ]    │
└─────────────────────────────┘
```

#### Acceptance Criteria

- [ ] Sidebar usable on phone screen (375px)
- [ ] All buttons have 44px touch target
- [ ] No horizontal scrolling needed
- [ ] Dashboard readable on mobile
- [ ] Performance smooth on mid-range devices

#### Test Cases

```typescript
// test/mobile/mobile-ui.test.ts

describe("Mobile UI", () => {
  describe("Touch Targets", () => {
    test("MOBILE-001: Rating buttons >= 44px", () => {
      // Given: Mobile layout
      // When: Measuring button height
      // Then: All >= 44px
    });

    test("MOBILE-002: Navigation buttons accessible", () => {
      // Given: Mobile layout
      // When: Checking Skip/Back/Undo buttons
      // Then: Each >= 44px and well-spaced
    });
  });

  describe("Layout", () => {
    test("MOBILE-003: No horizontal scroll at 375px", () => {
      // Given: Viewport 375px wide
      // When: Rendering sidebar
      // Then: No horizontal scrollbar
    });

    test("MOBILE-004: Stats collapsible", () => {
      // Given: Mobile layout
      // When: Tapping stats header
      // Then: Stats section collapses/expands
    });
  });

  describe("Performance", () => {
    test("MOBILE-005: Rating response under 300ms", () => {
      // Given: Mobile device
      // When: Tapping rating button
      // Then: Response < 300ms
    });

    test("MOBILE-006: Dashboard loads under 2s", () => {
      // Given: Mobile device, 200 cards
      // When: Opening dashboard
      // Then: Renders < 2000ms
    });
  });
});
```

---

### Milestone 4.6: Large Vault Optimizations

**Objective**: Handle vaults with 5,000+ notes efficiently.

#### Deliverables

- [ ] Indexed card lookup (not O(n) scan)
- [ ] Review log archival system
- [ ] Incremental statistics updates
- [ ] Background sync for large vaults
- [ ] Progress indicators for long operations
- [ ] Memory-efficient data structures

#### Optimization Strategies

```typescript
// data/card-index.ts
class CardIndex {
  // O(1) lookup by path
  private byPath: Map<string, CardData>;

  // O(1) lookup by queue
  private byQueue: Map<string, Set<string>>;

  // O(1) lookup for due cards
  private dueIndex: Map<string, string[]>; // date string → paths

  getCard(path: string): CardData | undefined {
    return this.byPath.get(path);
  }

  getDueCards(queueId: string, date: Date): CardData[] {
    // Use index instead of scanning all cards
  }
}

// data/review-archive.ts
class ReviewArchive {
  // Keep only recent logs in memory
  private recentLogs: ReviewLog[]; // Last 30 days
  private archivedCount: number; // Older logs in archive file

  // Archive old logs to separate file
  archiveOldLogs(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const toArchive = this.recentLogs.filter(
      (log) => new Date(log.review) < cutoff,
    );

    this.writeToArchive(toArchive);
    this.recentLogs = this.recentLogs.filter(
      (log) => new Date(log.review) >= cutoff,
    );
  }
}
```

#### Performance Targets (Large Vaults)

| Metric         | 5,000 cards | 10,000 cards |
| -------------- | ----------- | ------------ |
| Plugin load    | < 1s        | < 2s         |
| Start review   | < 500ms     | < 1s         |
| Rating         | < 100ms     | < 200ms      |
| Dashboard open | < 1s        | < 2s         |
| Memory usage   | < 50MB      | < 100MB      |

#### Acceptance Criteria

- [ ] 5,000 card vault performs within targets
- [ ] Memory bounded even with large history
- [ ] Background operations don't block UI
- [ ] Progress shown for long operations

#### Test Cases

```typescript
// test/performance/large-vault.test.ts

describe("Large Vault Performance", () => {
  describe("Card Index", () => {
    test("LARGE-001: Lookup by path is O(1)", () => {
      // Given: 10,000 cards
      // When: Looking up card by path
      // Then: Time consistent regardless of vault size
    });

    test("LARGE-002: Due cards query is efficient", () => {
      // Given: 5,000 cards, 100 due
      // When: getDueCards()
      // Then: < 50ms (doesn't scan all cards)
    });
  });

  describe("Review Log Archive", () => {
    test("LARGE-003: Old logs archived", () => {
      // Given: 50,000 review logs
      // When: Running archive
      // Then: Only ~30 days in memory
      // And: Older logs in archive file
    });

    test("LARGE-004: Stats still accurate with archive", () => {
      // Given: Archived older logs
      // When: Calculating total reviews
      // Then: Count includes archived + recent
    });
  });

  describe("Memory", () => {
    test("LARGE-005: Memory bounded at 10k cards", () => {
      // Given: 10,000 cards loaded
      // When: Measuring heap
      // Then: < 100MB
    });
  });
});
```

---

### Milestone 4.7: Per-Queue FSRS Parameters (Future)

**Objective**: Allow different FSRS parameters for different queues.

#### Deliverables

- [ ] Queue-level parameter overrides
- [ ] UI for per-queue settings
- [ ] Parameter inheritance (global → queue)
- [ ] Per-queue retention tracking

#### Use Case

A user might want:

- "Medical Terms" queue: 95% retention (high stakes)
- "General Knowledge" queue: 85% retention (casual)
- "Language Vocab" queue: 90% retention with trained weights

#### Implementation

```typescript
interface Queue {
  // ... existing fields
  fsrsOverrides?: Partial<FSRSParameters>;
}

class Scheduler {
  getSchedulingCards(card: CardData, queueId: string): SchedulingResult {
    const params = this.getEffectiveParams(queueId);
    const fsrs = new FSRS(params);
    return fsrs.repeat(card, new Date());
  }

  private getEffectiveParams(queueId: string): FSRSParameters {
    const globalParams = this.settings.fsrsParams;
    const queue = this.queueManager.getQueue(queueId);
    const overrides = queue?.fsrsOverrides || {};
    return { ...globalParams, ...overrides };
  }
}
```

#### Test Cases

```typescript
// test/queues/per-queue-params.test.ts

describe("Per-Queue FSRS Parameters", () => {
  test("PQP-001: Queue can override retention", () => {
    // Given: Global retention 0.90, queue override 0.95
    // When: Scheduling card in that queue
    // Then: Uses 0.95 retention
  });

  test("PQP-002: Unset overrides use global", () => {
    // Given: Global retention 0.90, queue has no override
    // When: Scheduling
    // Then: Uses 0.90
  });

  test("PQP-003: Different queues use different params", () => {
    // Given: Queue A (0.85), Queue B (0.95)
    // When: Same card in both queues
    // Then: A schedules longer intervals than B
  });
});
```

---

## Phase 4 Iteration Strategy

### Feedback Collection

```markdown
## User Feedback Template

**Feature Request / Bug Report**

**Type**: [ ] Feature Request [ ] Bug [ ] Enhancement

**Description**:

**Use Case** (for features):

**Steps to Reproduce** (for bugs):

**Current Behavior**:

**Expected Behavior**:

**Priority** (user perspective):
[ ] Critical - Can't use plugin
[ ] High - Major inconvenience
[ ] Medium - Would be nice
[ ] Low - Minor improvement
```

### Prioritization Matrix

| Impact | Effort Low | Effort Medium | Effort High |
| ------ | ---------- | ------------- | ----------- |
| High   | Do First   | Do Second     | Plan        |
| Medium | Do Second  | Evaluate      | Backlog     |
| Low    | Quick wins | Backlog       | Decline     |

---

## Phase 4 Completion Checklist

### Feature Additions

- [ ] FSRS parameter customization
- [ ] Suspend/Bury notes
- [ ] Data export
- [ ] Keyboard shortcuts documented
- [ ] Mobile optimizations
- [ ] Large vault support
- [ ] Per-queue parameters (optional)

### Community Engagement

- [ ] Respond to all issues within 48 hours
- [ ] Release patch versions for critical bugs
- [ ] Monthly feature releases
- [ ] Maintain changelog

### Quality Maintenance

- [ ] No regression in existing features
- [ ] Test coverage maintained
- [ ] Performance targets still met
- [ ] Documentation kept current

### Success Metrics

| Metric                  | Target (12 months) |
| ----------------------- | ------------------ |
| Active weekly users     | 1,000+             |
| GitHub stars            | 300+               |
| Average rating          | 4.5+               |
| Open critical bugs      | 0                  |
| Community contributions | 5+                 |

---

## Future Vision (Beyond Phase 4)

### Potential Phase 5 Features

| Feature                  | Complexity | Value  |
| ------------------------ | ---------- | ------ |
| Anki import/export       | High       | Medium |
| Review scheduling API    | Medium     | Medium |
| Plugin integration hooks | Medium     | High   |
| AI-powered difficulty    | High       | Medium |
| Collaborative review     | Very High  | Low    |

### Community Contributions Welcome

- Translations
- Theme-specific CSS
- Documentation improvements
- Bug reports and testing
- Feature suggestions
