# Phase 2: Full Feature Set

**Goal**: Complete feature implementation as specified in PRD
**Prerequisites**: Phase 1 complete and stable
**Success Criteria**: All features in PRD are functional with comprehensive test coverage.

---

## Milestones

### Milestone 2.1: Multiple Queue Support

**Objective**: Allow users to create and manage multiple named queues.

#### Deliverables

- [ ] Extend `QueueManager` for CRUD operations
- [ ] Create queue editor modal for create/edit
- [ ] Queue list management UI
- [ ] Queue selector when starting review
- [ ] Per-queue statistics
- [ ] Queue deletion with options (keep data / remove cards)

#### Key Features

```typescript
// queues/queue-manager.ts - Extended
class QueueManager {
  // Existing methods...

  // New CRUD operations
  createQueue(name: string, criteria: SelectionCriteria): Queue;
  updateQueue(queueId: string, updates: Partial<Queue>): Queue;
  deleteQueue(queueId: string, removeCardData?: boolean): void;
  renameQueue(queueId: string, newName: string): void;

  // Get all queues
  getAllQueues(): Queue[];

  // Get queue by ID
  getQueue(queueId: string): Queue | undefined;
}

// ui/modals/queue-modal.ts
class QueueModal extends Modal {
  constructor(app: App, queue?: Queue); // undefined = create mode

  // Render form fields
  onOpen(): void;

  // Validate and save
  onSubmit(): void;
}
```

#### Multi-Queue Card Behavior

- A note can exist in multiple queues
- Each queue maintains **independent scheduling** for the note
- Card data structure:

```typescript
interface CardData {
  notePath: string;
  noteId: string;
  schedules: Record<string, CardSchedule>; // queueId → schedule
  createdAt: string;
  lastModified: string;
}
```

#### Acceptance Criteria

- [ ] Create queue with custom name and criteria
- [ ] Edit existing queue name and criteria
- [ ] Delete queue (cards optionally preserved)
- [ ] View list of all queues with stats
- [ ] Select queue when starting review
- [ ] Same note in multiple queues has independent schedules

#### Test Cases

```typescript
// test/queues/multi-queue.test.ts

describe("Multiple Queues", () => {
  describe("Queue CRUD", () => {
    test("MQUEUE-001: Create queue with name and criteria", () => {
      // Given: QueueManager
      // When: createQueue("Philosophy", { type: "folder", folders: ["Philosophy/"] })
      // Then: Queue created with unique ID
      // And: Queue has correct name and criteria
    });

    test("MQUEUE-002: Queue names must be unique", () => {
      // Given: Queue "Math" exists
      // When: Creating queue with name "Math"
      // Then: Error thrown or name auto-incremented ("Math (2)")
    });

    test("MQUEUE-003: Update queue criteria triggers resync", () => {
      // Given: Queue "CS" with folder "Computer Science/"
      // When: Updating criteria to include "Programming/"
      // Then: Notes from "Programming/" added to queue
      // And: Existing cards preserved
    });

    test("MQUEUE-004: Delete queue removes from list", () => {
      // Given: Queue "Temp" exists
      // When: deleteQueue("Temp", false)
      // Then: Queue not in getAllQueues()
      // And: Cards for notes still exist (for other queues)
    });

    test("MQUEUE-005: Delete queue with removeCardData", () => {
      // Given: Queue "Temp" with unique note "temp.md"
      // When: deleteQueue("Temp", true)
      // Then: Card schedule for "Temp" removed
      // And: If note has no other queue schedules, card deleted
    });

    test("MQUEUE-006: Rename queue updates display name", () => {
      // Given: Queue "CS"
      // When: renameQueue(id, "Computer Science")
      // Then: Queue.name = "Computer Science"
      // And: Queue ID unchanged
    });
  });

  describe("Multi-Queue Card Scheduling", () => {
    test("MQUEUE-007: Same note in two queues has independent schedules", () => {
      // Given: "concept.md" in queues "Math" and "CS"
      // When: Reviewing in "Math", rate "Good"
      // Then: Math schedule updated
      // And: CS schedule unchanged
    });

    test("MQUEUE-008: Due status is per-queue", () => {
      // Given: "concept.md" due in "Math", not due in "CS"
      // When: Getting due notes for "CS"
      // Then: "concept.md" not included
      // When: Getting due notes for "Math"
      // Then: "concept.md" included
    });

    test("MQUEUE-009: Adding note to second queue creates new schedule", () => {
      // Given: "concept.md" has schedule in "Math"
      // When: Adding to "CS" queue
      // Then: CS schedule created as New
      // And: Math schedule preserved
    });

    test("MQUEUE-010: Card stats aggregate across queues", () => {
      // Given: "concept.md" reviewed 5 times in "Math", 3 times in "CS"
      // When: Getting total review count
      // Then: Can see per-queue counts
    });
  });

  describe("Queue Selection Modal", () => {
    test("MQUEUE-011: Shows all queues with due counts", () => {
      // Given: 3 queues with 5, 10, 0 due respectively
      // When: Opening queue selector
      // Then: All 3 queues shown
      // And: Due counts displayed next to each
    });

    test("MQUEUE-012: Single queue skips selector", () => {
      // Given: Only 1 queue exists
      // When: Starting review
      // Then: Selector not shown
      // And: Session starts immediately
    });
  });
});

// test/ui/modals/queue-modal.test.ts

describe("QueueModal", () => {
  describe("Create Mode", () => {
    test("QMODAL-001: Shows empty form for new queue", () => {
      // Given: Modal opened without queue param
      // When: Rendering
      // Then: Name field is empty
      // And: Criteria section shows defaults
    });

    test("QMODAL-002: Validates name not empty", () => {
      // Given: Name field empty
      // When: Clicking Submit
      // Then: Error shown "Queue name required"
      // And: Modal stays open
    });

    test("QMODAL-003: Preview shows matching notes", () => {
      // Given: Criteria set to folder "Notes/"
      // When: Updating criteria
      // Then: Preview shows "X notes will be added"
    });
  });

  describe("Edit Mode", () => {
    test("QMODAL-004: Pre-fills existing queue data", () => {
      // Given: Modal opened with queue "Math"
      // When: Rendering
      // Then: Name field shows "Math"
      // And: Criteria matches queue's criteria
    });

    test("QMODAL-005: Save updates queue", () => {
      // Given: Editing queue, changed name to "Mathematics"
      // When: Clicking Submit
      // Then: Queue renamed
      // And: Modal closes
    });
  });
});
```

---

### Milestone 2.2: Tag-based Selection Mode

**Objective**: Allow notes to be selected for queues based on tags.

#### Deliverables

- [ ] Implement `TagCriterion` class
- [ ] Update settings to toggle between modes
- [ ] Support multiple tags (OR logic)
- [ ] Handle nested tags
- [ ] Real-time tag suggestions in settings

#### Key Implementation

```typescript
// criteria/tag-criterion.ts
class TagCriterion implements SelectionCriterion {
  constructor(private tags: string[]);

  evaluate(file: TFile, metadata: CachedMetadata): boolean {
    const fileTags = this.extractTags(metadata);
    return this.tags.some((tag) => this.matchesTag(tag, fileTags));
  }

  private extractTags(metadata: CachedMetadata): string[] {
    // Extract from frontmatter tags and inline #tags
  }

  private matchesTag(criterion: string, noteTags: string[]): boolean {
    // Handle nested tags: #topic matches #topic/subtopic
  }
}
```

#### Tag Matching Rules

| Criterion Tag | Note Tags           | Match? |
| ------------- | ------------------- | ------ |
| `#review`     | `#review`           | Yes    |
| `#review`     | `#review/important` | Yes    |
| `#review`     | `#do-review`        | No     |
| `#cs`         | `#cs`, `#math`      | Yes    |
| `#cs/algo`    | `#cs`               | No     |

#### Acceptance Criteria

- [ ] Tag mode can be selected in settings
- [ ] Notes with tracked tags are included
- [ ] Nested tags match parent criterion
- [ ] Multiple tags use OR logic
- [ ] Both frontmatter and inline tags work

#### Test Cases

```typescript
// test/criteria/tag-criterion.test.ts

describe("TagCriterion", () => {
  describe("Basic Matching", () => {
    test("TAG-001: Matches exact tag", () => {
      // Given: Criterion ["#review"]
      // When: Note has tag "#review"
      // Then: evaluate() returns true
    });

    test("TAG-002: Matches nested tag", () => {
      // Given: Criterion ["#review"]
      // When: Note has tag "#review/important"
      // Then: evaluate() returns true
    });

    test("TAG-003: Does not match partial tag name", () => {
      // Given: Criterion ["#review"]
      // When: Note has tag "#do-review"
      // Then: evaluate() returns false
    });

    test("TAG-004: Does not match child when parent required", () => {
      // Given: Criterion ["#cs/algorithms"]
      // When: Note has only "#cs"
      // Then: evaluate() returns false
    });

    test("TAG-005: Multiple criteria use OR logic", () => {
      // Given: Criterion ["#math", "#physics"]
      // When: Note has only "#math"
      // Then: evaluate() returns true
    });

    test("TAG-006: No tags means no match", () => {
      // Given: Criterion ["#review"]
      // When: Note has no tags
      // Then: evaluate() returns false
    });
  });

  describe("Tag Sources", () => {
    test("TAG-007: Matches frontmatter tags", () => {
      // Given: Note with frontmatter: tags: [review]
      // When: Criterion ["#review"]
      // Then: evaluate() returns true
    });

    test("TAG-008: Matches inline tags", () => {
      // Given: Note with "#review" in body
      // When: Criterion ["#review"]
      // Then: evaluate() returns true
    });

    test("TAG-009: Matches both sources", () => {
      // Given: Note with frontmatter "#a" and inline "#b"
      // When: Criterion ["#b"]
      // Then: evaluate() returns true
    });
  });

  describe("Edge Cases", () => {
    test("TAG-010: Case sensitivity", () => {
      // Given: Criterion ["#Review"]
      // When: Note has "#review" (lowercase)
      // Then: Match behavior consistent with Obsidian (case-insensitive)
    });

    test("TAG-011: Tag with leading # vs without", () => {
      // Given: Criterion stored as "review" (no #)
      // When: Note has "#review"
      // Then: Still matches (normalize on comparison)
    });

    test("TAG-012: Empty tags array", () => {
      // Given: Criterion []
      // When: Any note
      // Then: evaluate() returns false
    });
  });
});
```

---

### Milestone 2.3: Full Exclusion Criteria System

**Objective**: Implement complete exclusion rule system for note filtering.

#### Deliverables

- [ ] `NameExclusionCriterion` - exclude by exact note name
- [ ] `TagExclusionCriterion` - exclude by tag presence
- [ ] `PropertyExclusionCriterion` - exclude by frontmatter property
- [ ] Combine exclusions with AND logic
- [ ] Settings UI for managing exclusions
- [ ] Preview excluded notes count

#### Key Implementation

```typescript
// criteria/exclusion-criteria/name-exclusion.ts
class NameExclusionCriterion implements SelectionCriterion {
  type = 'exclude' as const;

  constructor(private names: string[]);

  evaluate(file: TFile): boolean {
    // Returns true if note should be EXCLUDED
    return this.names.includes(file.basename);
  }
}

// criteria/exclusion-criteria/property-exclusion.ts
class PropertyExclusionCriterion implements SelectionCriterion {
  type = 'exclude' as const;

  constructor(private rules: PropertyMatch[]);

  evaluate(file: TFile, metadata: CachedMetadata): boolean {
    const frontmatter = metadata?.frontmatter;
    if (!frontmatter) return false;

    return this.rules.some((rule) => this.matchesRule(rule, frontmatter));
  }
}

interface PropertyMatch {
  key: string;
  value: string;
  operator: 'equals' | 'contains' | 'exists';
}
```

#### Exclusion Examples

| Rule Type | Value            | Effect                            |
| --------- | ---------------- | --------------------------------- |
| Name      | `Index`          | Excludes note named "Index"       |
| Tag       | `#template`      | Excludes notes with #template     |
| Property  | `type: template` | Excludes notes with type=template |
| Property  | `draft: *`       | Excludes notes with draft key     |

#### Acceptance Criteria

- [ ] Name exclusion works for exact matches
- [ ] Tag exclusion works for tags and nested tags
- [ ] Property exclusion supports equals, contains, exists
- [ ] Multiple exclusions combine (all applied)
- [ ] Exclusion takes priority over inclusion

#### Test Cases

```typescript
// test/criteria/exclusion-criteria.test.ts

describe("ExclusionCriteria", () => {
  describe("NameExclusionCriterion", () => {
    test("EXCL-001: Excludes exact name match", () => {
      // Given: Excluded names ["Index", "README"]
      // When: Evaluating "Index.md"
      // Then: Returns true (excluded)
    });

    test("EXCL-002: Does not exclude partial matches", () => {
      // Given: Excluded names ["Index"]
      // When: Evaluating "Index of Topics.md"
      // Then: Returns false (not excluded)
    });

    test("EXCL-003: Case sensitivity matches file system", () => {
      // Given: Excluded names ["index"]
      // When: Evaluating "Index.md"
      // Then: Behavior matches OS case sensitivity
    });
  });

  describe("TagExclusionCriterion", () => {
    test("EXCL-004: Excludes notes with excluded tag", () => {
      // Given: Excluded tags ["#template"]
      // When: Note has "#template"
      // Then: Returns true (excluded)
    });

    test("EXCL-005: Excludes nested tags", () => {
      // Given: Excluded tags ["#template"]
      // When: Note has "#template/daily"
      // Then: Returns true (excluded)
    });

    test("EXCL-006: Does not exclude unrelated tags", () => {
      // Given: Excluded tags ["#template"]
      // When: Note has "#note-template"
      // Then: Returns false (not excluded)
    });
  });

  describe("PropertyExclusionCriterion", () => {
    test("EXCL-007: Equals operator matches value", () => {
      // Given: Rule { key: "type", value: "template", operator: "equals" }
      // When: Note has frontmatter type: template
      // Then: Returns true (excluded)
    });

    test("EXCL-008: Equals is case-sensitive for value", () => {
      // Given: Rule { key: "type", value: "Template", operator: "equals" }
      // When: Note has type: template (lowercase)
      // Then: Returns false (not excluded)
    });

    test("EXCL-009: Contains operator matches substring", () => {
      // Given: Rule { key: "status", value: "draft", operator: "contains" }
      // When: Note has status: "first draft"
      // Then: Returns true (excluded)
    });

    test("EXCL-010: Exists operator checks key presence", () => {
      // Given: Rule { key: "exclude", value: "", operator: "exists" }
      // When: Note has frontmatter "exclude: true"
      // Then: Returns true (excluded)
    });

    test("EXCL-011: Exists works regardless of value", () => {
      // Given: Rule { key: "draft", operator: "exists" }
      // When: Note has "draft: false"
      // Then: Returns true (excluded - key exists)
    });

    test("EXCL-012: Missing property means not excluded", () => {
      // Given: Rule { key: "type", value: "template", operator: "equals" }
      // When: Note has no "type" property
      // Then: Returns false (not excluded)
    });
  });

  describe("Combined Exclusions", () => {
    test("EXCL-013: Any exclusion rule triggers exclusion", () => {
      // Given: Name exclusion ["Index"], Tag exclusion ["#template"]
      // When: Note has "#template" but name is "Concept"
      // Then: Excluded (tag rule matches)
    });

    test("EXCL-014: Must pass all inclusion AND no exclusion", () => {
      // Given: Folder inclusion "Notes/", Tag exclusion ["#draft"]
      // When: Note in "Notes/" with "#draft"
      // Then: Excluded (even though folder matches)
    });
  });
});
```

---

### Milestone 2.4: Complete Sidebar Statistics

**Objective**: Add all statistical displays to the review sidebar.

#### Deliverables

- [ ] Note statistics section (state, stability, difficulty, retrievability)
- [ ] Predicted intervals on rating buttons
- [ ] Session statistics section
- [ ] Collapsible sections with toggle
- [ ] Persist toggle states in settings

#### UI Components

```typescript
// ui/sidebar/note-stats.ts
class NoteStatsComponent {
  constructor(container: HTMLElement, card: CardData, scheduler: Scheduler);

  render(): void {
    // State: New/Learning/Review/Relearning
    // Stability: X.X days
    // Difficulty: X.X (1-10 scale)
    // Retrievability: XX%
    // Reviews: N
    // Lapses: N
  }
}

// ui/sidebar/session-stats.ts
class SessionStatsComponent {
  constructor(container: HTMLElement, sessionState: SessionState);

  render(): void {
    // Reviewed: N
    // Again: N | Hard: N | Good: N | Easy: N
    // Average: X.X
  }

  update(sessionState: SessionState): void;
}
```

#### Acceptance Criteria

- [ ] Note stats show accurate current values
- [ ] Stats update when card is rated
- [ ] Sections can be collapsed/expanded
- [ ] Collapse state persists across sessions
- [ ] Session stats reset on new session

#### Test Cases

```typescript
// test/ui/sidebar/note-stats.test.ts

describe("NoteStatsComponent", () => {
  describe("Display Values", () => {
    test("STATS-001: Shows correct state label", () => {
      // Given: Card with state = 2 (Review)
      // When: Rendering
      // Then: Shows "State: Review"
    });

    test("STATS-002: Formats stability with precision", () => {
      // Given: Card with stability = 45.234
      // When: Rendering
      // Then: Shows "Stability: 45.2 days"
    });

    test("STATS-003: Shows difficulty on 1-10 scale", () => {
      // Given: Card with FSRS difficulty = 4.5
      // When: Rendering
      // Then: Shows "Difficulty: 4.5"
    });

    test("STATS-004: Calculates retrievability percentage", () => {
      // Given: Card with certain stability, elapsed 5 days
      // When: Rendering
      // Then: Shows "Retrievability: XX%" (calculated value)
    });

    test("STATS-005: Shows review and lapse counts", () => {
      // Given: Card with reps=12, lapses=3
      // When: Rendering
      // Then: Shows "Reviews: 12"
      // And: Shows "Lapses: 3"
    });
  });

  describe("New Card Stats", () => {
    test("STATS-006: New card shows appropriate values", () => {
      // Given: New card (never reviewed)
      // When: Rendering
      // Then: State: "New"
      // And: Stability: "-" or "0"
      // And: Difficulty: "-" or initial value
      // And: Reviews: "0"
    });
  });
});

// test/ui/sidebar/session-stats.test.ts

describe("SessionStatsComponent", () => {
  describe("Session Tracking", () => {
    test("STATS-007: Shows reviewed count", () => {
      // Given: Session with 5 reviews
      // When: Rendering
      // Then: Shows "Reviewed: 5"
    });

    test("STATS-008: Shows rating breakdown", () => {
      // Given: Session with 1 Again, 2 Hard, 5 Good, 2 Easy
      // When: Rendering
      // Then: Shows "Again: 1 | Hard: 2 | Good: 5 | Easy: 2"
    });

    test("STATS-009: Calculates average rating", () => {
      // Given: Ratings [3, 3, 4, 2] (Good, Good, Easy, Hard)
      // When: Calculating average
      // Then: Average = 3.0
    });

    test("STATS-010: Updates after each rating", () => {
      // Given: Stats showing 3 reviewed
      // When: New rating made
      // Then: Shows 4 reviewed
      // And: Breakdown updated
    });
  });
});

// test/ui/sidebar/predicted-intervals.test.ts

describe("Predicted Intervals", () => {
  test("PRED-001: Shows interval for each rating", () => {
    // Given: Card with current state
    // When: Getting predictions
    // Then: All 4 ratings have predicted intervals
  });

  test("PRED-002: Intervals in human-readable format", () => {
    // Given: Predicted interval = 0.007 days (10 minutes)
    // When: Formatting
    // Then: Shows "10 minutes"
  });

  test("PRED-003: Days formatted correctly", () => {
    // Given: Interval = 5.5 days
    // When: Formatting
    // Then: Shows "5 days" or "6 days" (rounded)
  });

  test("PRED-004: Months/years for long intervals", () => {
    // Given: Interval = 180 days
    // When: Formatting
    // Then: Shows "6 months"
  });
});
```

---

### Milestone 2.5: Undo Functionality

**Objective**: Allow users to undo their last rating.

#### Deliverables

- [ ] Implement `UndoManager` class
- [ ] Store undo stack per session
- [ ] Add "Undo" button to sidebar
- [ ] Register `fsrs:undo-rating` command
- [ ] Mark undone review logs appropriately
- [ ] Limit undo to current session

#### Key Implementation

```typescript
// review/undo-manager.ts
class UndoManager {
  private undoStack: UndoEntry[] = [];

  // Record action for potential undo
  recordRating(card: CardData, log: ReviewLog): void;

  // Check if undo is available
  canUndo(): boolean;

  // Perform undo
  undo(): UndoResult | null;

  // Clear undo stack (on session end)
  clear(): void;
}

interface UndoEntry {
  previousCard: CardData;
  reviewLog: ReviewLog;
  notePath: string;
}

interface UndoResult {
  restoredCard: CardData;
  markedLog: ReviewLog; // log with undone = true
}
```

#### Acceptance Criteria

- [ ] Undo restores card to pre-rating state
- [ ] Undo reopens the undone note
- [ ] Review log marked as undone (not deleted)
- [ ] Multiple undos work (stack)
- [ ] Undo disabled when nothing to undo
- [ ] Undo stack clears on session end

#### Test Cases

```typescript
// test/review/undo-manager.test.ts

describe("UndoManager", () => {
  describe("Recording", () => {
    test("UNDO-001: Records rating for undo", () => {
      // Given: Empty undo stack
      // When: recordRating(card, log)
      // Then: canUndo() = true
    });

    test("UNDO-002: Multiple ratings create stack", () => {
      // Given: Stack with 1 entry
      // When: recordRating() again
      // Then: Stack has 2 entries
    });
  });

  describe("Undo Operation", () => {
    test("UNDO-003: Undo restores previous card state", () => {
      // Given: Card rated, original stability was 10
      // When: undo()
      // Then: Card stability is 10 again
    });

    test("UNDO-004: Undo marks log as undone", () => {
      // Given: Rating with log ID "abc"
      // When: undo()
      // Then: Log "abc" has undone = true
      // And: Log not deleted
    });

    test("UNDO-005: Multiple undos work in order", () => {
      // Given: Ratings A → B → C
      // When: undo() three times
      // Then: C undone first, then B, then A
    });

    test("UNDO-006: Undo returns null when stack empty", () => {
      // Given: Empty stack
      // When: undo()
      // Then: Returns null
      // And: No error thrown
    });
  });

  describe("State", () => {
    test("UNDO-007: canUndo reflects stack state", () => {
      // Given: Empty stack
      // Then: canUndo() = false
      // When: Rating recorded
      // Then: canUndo() = true
      // When: undo()
      // Then: canUndo() = false
    });

    test("UNDO-008: Clear empties stack", () => {
      // Given: Stack with 3 entries
      // When: clear()
      // Then: canUndo() = false
    });
  });

  describe("Session Integration", () => {
    test("UNDO-009: Undo reopens the undone note", async () => {
      // Given: Rated note A, now on note B
      // When: undo()
      // Then: Note A reopened
      // And: Session currentIndex decremented
    });

    test("UNDO-010: Session stats updated on undo", async () => {
      // Given: Session with ratings.Good = 3
      // When: Undo last Good rating
      // Then: ratings.Good = 2
    });
  });
});
```

---

### Milestone 2.6: Go Back Navigation

**Objective**: Allow users to navigate back to previously reviewed notes without undoing.

#### Deliverables

- [ ] Track navigation history in session
- [ ] Add "Go Back" button to sidebar
- [ ] Register `fsrs:previous-note` command
- [ ] Handle "Go Back" at session start (disabled)
- [ ] Re-enable rating when going back

#### Key Behavior

| Scenario              | Behavior                                 |
| --------------------- | ---------------------------------------- |
| Go Back to rated note | Note opens, rating buttons enabled       |
| Rate again            | Creates NEW review log (not replacement) |
| Skip after Go Back    | Moves forward from current position      |
| Multiple Go Backs     | Can navigate back through multiple notes |

#### Test Cases

```typescript
// test/review/navigation.test.ts

describe("Session Navigation", () => {
  describe("Go Back", () => {
    test("NAV-001: Go back shows previous note", async () => {
      // Given: Session at note 3 (after reviewing 0, 1, 2)
      // When: goBack()
      // Then: Note 2 opens
    });

    test("NAV-002: Go back at start is disabled", () => {
      // Given: Session at note 0
      // When: Checking canGoBack()
      // Then: Returns false
    });

    test("NAV-003: Can rate after going back", async () => {
      // Given: Went back to note 2
      // When: Rating note 2 again
      // Then: New review log created
      // And: Card updated with new rating
    });

    test("NAV-004: Skip after go back moves forward", async () => {
      // Given: Went back to note 2, session was at 5
      // When: skip()
      // Then: Moves to note 3
    });

    test("NAV-005: Multiple go backs work", async () => {
      // Given: Reviewed notes 0-4, at note 5
      // When: goBack() twice
      // Then: At note 3
    });

    test("NAV-006: Go back history includes skipped notes", async () => {
      // Given: Reviewed 0, skipped 1, reviewed 2, at 3
      // When: goBack()
      // Then: Note 2 shown (last visited, not last rated)
    });
  });

  describe("Bring Back", () => {
    test("NAV-007: Bring back reopens expected note", async () => {
      // Given: Session expects note A, user navigated to note B
      // When: bringBack()
      // Then: Note A opens
    });

    test("NAV-008: Bring back available when note differs", () => {
      // Given: Expected note A, open note B
      // When: Checking canBringBack()
      // Then: Returns true
    });

    test("NAV-009: Bring back not shown when on expected note", () => {
      // Given: Expected note A, open note A
      // When: Checking canBringBack()
      // Then: Returns false
    });
  });
});
```

---

### Milestone 2.7: Dashboard Modal

**Objective**: Create comprehensive analytics dashboard.

#### Deliverables

- [ ] Dashboard modal structure
- [ ] Overview cards (Total, Due Today, Overdue, New, Upcoming)
- [ ] Calendar heatmap (12-month view)
- [ ] Retention statistics
- [ ] Forecast graph (30-day)
- [ ] State distribution chart
- [ ] Difficulty distribution chart
- [ ] Streak tracking
- [ ] Per-note table with sorting/filtering

#### Key Components

```typescript
// ui/dashboard/dashboard-modal.ts
class DashboardModal extends Modal {
  onOpen(): void {
    // Render all dashboard sections
  }
}

// ui/dashboard/overview-cards.ts
class OverviewCards {
  render(container: HTMLElement, stats: OverviewStats): void;
}

// ui/dashboard/heatmap.ts
class CalendarHeatmap {
  render(container: HTMLElement, reviewData: DailyReviewData[]): void;
}

// ui/dashboard/charts.ts
class DistributionCharts {
  renderStateChart(container: HTMLElement, data: StateDistribution): void;
  renderDifficultyChart(
    container: HTMLElement,
    data: DifficultyDistribution,
  ): void;
}

// ui/dashboard/note-table.ts
class NoteTable {
  render(container: HTMLElement, cards: CardData[]): void;
  // Sortable, filterable
}
```

#### Acceptance Criteria

- [ ] Dashboard opens via command or ribbon
- [ ] All statistics are accurate
- [ ] Heatmap shows last 12 months
- [ ] Charts render correctly
- [ ] Table is sortable by all columns
- [ ] "Start Review" button works from dashboard

#### Test Cases

```typescript
// test/ui/dashboard/dashboard-modal.test.ts

describe("DashboardModal", () => {
  describe("Overview Cards", () => {
    test("DASH-001: Shows total notes count", () => {
      // Given: 100 notes across all queues
      // When: Rendering overview
      // Then: Total card shows "100"
    });

    test("DASH-002: Shows due today accurately", () => {
      // Given: 15 notes due today
      // When: Rendering overview
      // Then: Due Today card shows "15"
    });

    test("DASH-003: Shows overdue count", () => {
      // Given: 5 notes past due date
      // When: Rendering overview
      // Then: Overdue card shows "5"
    });

    test("DASH-004: Shows new notes count", () => {
      // Given: 20 notes never reviewed
      // When: Rendering overview
      // Then: New card shows "20"
    });

    test("DASH-005: Shows upcoming 7-day count", () => {
      // Given: 30 notes due in next 7 days
      // When: Rendering overview
      // Then: Upcoming card shows "30"
    });
  });

  describe("Calendar Heatmap", () => {
    test("DASH-006: Shows 12 months of data", () => {
      // Given: Review data spanning 18 months
      // When: Rendering heatmap
      // Then: Only last 12 months shown
    });

    test("DASH-007: Intensity reflects review count", () => {
      // Given: Day with 20 reviews vs day with 2 reviews
      // When: Rendering
      // Then: 20-review day has higher intensity
    });

    test("DASH-008: Hover shows exact count", () => {
      // Given: Day with 15 reviews
      // When: Hovering over day
      // Then: Tooltip shows "15 reviews on Jan 15"
    });

    test("DASH-009: Days without reviews are lowest intensity", () => {
      // Given: Day with 0 reviews
      // When: Rendering
      // Then: Cell has lowest/no intensity color
    });
  });

  describe("Retention Statistics", () => {
    test("DASH-010: Shows target retention from settings", () => {
      // Given: settings.fsrsParams.requestRetention = 0.9
      // When: Rendering
      // Then: Shows "Target: 90%"
    });

    test("DASH-011: Calculates true retention", () => {
      // Given: 100 reviews, 8 were "Again"
      // When: Calculating true retention
      // Then: True retention = 92%
    });

    test("DASH-012: Estimated retention calculated correctly", () => {
      // Given: Cards with various retrievabilities
      // When: Calculating estimated
      // Then: Weighted average of retrievabilities
    });
  });

  describe("Forecast Graph", () => {
    test("DASH-013: Shows 30-day forecast", () => {
      // Given: Cards with various due dates
      // When: Rendering forecast
      // Then: X-axis spans 30 days from today
    });

    test("DASH-014: Forecast counts are accurate", () => {
      // Given: 5 cards due tomorrow
      // When: Rendering forecast
      // Then: Day +1 shows 5
    });

    test("DASH-015: Today includes currently due", () => {
      // Given: 10 cards due today
      // When: Rendering forecast
      // Then: Day 0 shows 10
    });
  });

  describe("State Distribution", () => {
    test("DASH-016: Pie chart shows all states", () => {
      // Given: 50 Review, 20 Learning, 10 New, 5 Relearning
      // When: Rendering
      // Then: All 4 states represented
    });

    test("DASH-017: Percentages are correct", () => {
      // Given: 80 Review out of 100 total
      // When: Rendering
      // Then: Review slice is 80%
    });
  });

  describe("Note Table", () => {
    test("DASH-018: Lists all cards", () => {
      // Given: 50 cards in system
      // When: Rendering table
      // Then: 50 rows shown (or paginated)
    });

    test("DASH-019: Sortable by due date", () => {
      // Given: Table with cards
      // When: Clicking "Due" header
      // Then: Sorted by due date ascending
      // When: Clicking again
      // Then: Sorted descending
    });

    test("DASH-020: Filterable by queue", () => {
      // Given: Cards in queues A, B, C
      // When: Filtering by queue A
      // Then: Only queue A cards shown
    });

    test("DASH-021: Note name is clickable link", () => {
      // Given: Table row for "Concept.md"
      // When: Clicking note name
      // Then: Modal closes
      // And: Note opens in editor
    });
  });

  describe("Streak Tracking", () => {
    test("DASH-022: Current streak calculated correctly", () => {
      // Given: Reviews on consecutive days for 5 days
      // When: Rendering
      // Then: Current streak = 5
    });

    test("DASH-023: Streak breaks on missed day", () => {
      // Given: Reviews Jan 1-3, none Jan 4, review Jan 5
      // When: Today is Jan 5
      // Then: Current streak = 1
    });

    test("DASH-024: Longest streak tracked", () => {
      // Given: Previous streak of 20, current streak of 5
      // When: Rendering
      // Then: Best = 20, Current = 5
    });
  });
});
```

---

### Milestone 2.8: Orphan Detection and Resolution

**Objective**: Handle notes that are moved, renamed, or deleted.

#### Deliverables

- [ ] Implement `NoteWatcher` for vault events
- [ ] Implement `OrphanDetector` for periodic checks
- [ ] Create orphan resolution modal
- [ ] Handle auto-resolution when possible (rename detection)
- [ ] Add orphan management in settings/dashboard

#### Key Implementation

```typescript
// sync/note-watcher.ts
class NoteWatcher {
  constructor(app: App, cardManager: CardManager);

  // Start watching vault events
  start(): void;

  // Handle rename event
  onRename(file: TFile, oldPath: string): void;

  // Handle delete event
  onDelete(file: TFile): void;
}

// sync/orphan-detector.ts
class OrphanDetector {
  // Scan for cards without corresponding notes
  detectOrphans(): OrphanRecord[];

  // Attempt to find matching note by content/ID
  findPotentialMatch(orphan: OrphanRecord): TFile | null;
}

// ui/modals/orphan-modal.ts
class OrphanResolutionModal extends Modal {
  // Show orphan and options:
  // - Re-link to different note
  // - Remove card data
  // - Ignore for now
}
```

#### Orphan Handling Flow

```
Note Event Detected
       ↓
┌──────────────────┐
│ Is it a Rename?  │
└────────┬─────────┘
         │
    ┌────┴────┐
   Yes        No (Delete)
    │          │
    ↓          ↓
Auto-update   Create OrphanRecord
path          Notify user
```

#### Acceptance Criteria

- [ ] Renamed notes auto-update card path
- [ ] Deleted notes create orphan records
- [ ] User can re-link orphan to different note
- [ ] User can remove orphan data
- [ ] Orphan list viewable in settings

#### Test Cases

```typescript
// test/sync/note-watcher.test.ts

describe("NoteWatcher", () => {
  describe("Rename Handling", () => {
    test("WATCH-001: Rename updates card path", () => {
      // Given: Card for "old.md"
      // When: Note renamed to "new.md"
      // Then: Card path updated to "new.md"
      // And: Review history preserved
    });

    test("WATCH-002: Move to different folder updates path", () => {
      // Given: Card for "Notes/concept.md"
      // When: Moved to "Archive/concept.md"
      // Then: Card path = "Archive/concept.md"
    });

    test("WATCH-003: Rename + move combined handled", () => {
      // Given: Card for "Notes/old.md"
      // When: Renamed and moved to "Archive/new.md"
      // Then: Card path = "Archive/new.md"
    });
  });

  describe("Delete Handling", () => {
    test("WATCH-004: Delete creates orphan record", () => {
      // Given: Card for "concept.md"
      // When: Note deleted
      // Then: OrphanRecord created
      // And: Original card data preserved in orphan
    });

    test("WATCH-005: Orphan notification shown", () => {
      // Given: Note deleted
      // When: Orphan created
      // Then: Notice shown to user
    });
  });
});

// test/sync/orphan-detector.test.ts

describe("OrphanDetector", () => {
  describe("Detection", () => {
    test("ORPHAN-001: Detects cards without notes", () => {
      // Given: Card for "missing.md", note doesn't exist
      // When: detectOrphans()
      // Then: Returns orphan record for "missing.md"
    });

    test("ORPHAN-002: Does not flag existing notes", () => {
      // Given: Card for "exists.md", note exists
      // When: detectOrphans()
      // Then: "exists.md" not in results
    });
  });

  describe("Resolution", () => {
    test("ORPHAN-003: Re-link transfers card data", () => {
      // Given: Orphan for "old.md"
      // When: Re-linking to "new.md"
      // Then: Card now references "new.md"
      // And: All schedules preserved
      // And: Orphan status = resolved
    });

    test("ORPHAN-004: Remove deletes card data", () => {
      // Given: Orphan for "deleted.md"
      // When: Removing
      // Then: Card deleted from data store
      // And: Review logs preserved (for stats)
    });

    test("ORPHAN-005: Pending orphans persist", () => {
      // Given: Orphan created, not resolved
      // When: Plugin reloads
      // Then: Orphan still in pending state
    });
  });
});
```

---

### Milestone 2.9: All Commands Registered

**Objective**: Complete command registration for all PRD-specified commands.

#### Deliverables

- [ ] `fsrs:open-dashboard` command
- [ ] `fsrs:manage-queues` command
- [ ] `fsrs:add-to-queue` command (context menu style)
- [ ] Update existing commands with better names
- [ ] Verify all commands work correctly

#### Complete Command List

| Command ID            | Name                     | Hotkey Suggestion |
| --------------------- | ------------------------ | ----------------- |
| `fsrs:start-review`   | FSRS: Start Review       | Ctrl+Shift+R      |
| `fsrs:open-dashboard` | FSRS: Open Dashboard     | Ctrl+Shift+D      |
| `fsrs:rate-again`     | FSRS: Rate Again         | 1                 |
| `fsrs:rate-hard`      | FSRS: Rate Hard          | 2                 |
| `fsrs:rate-good`      | FSRS: Rate Good          | 3                 |
| `fsrs:rate-easy`      | FSRS: Rate Easy          | 4                 |
| `fsrs:skip-note`      | FSRS: Skip Note          | S                 |
| `fsrs:previous-note`  | FSRS: Previous Note      | A or Left         |
| `fsrs:undo-rating`    | FSRS: Undo Last Rating   | Ctrl+Z            |
| `fsrs:end-session`    | FSRS: End Review Session | Esc               |
| `fsrs:manage-queues`  | FSRS: Manage Queues      | -                 |
| `fsrs:add-to-queue`   | FSRS: Add Note to Queue  | -                 |

#### Test Cases

```typescript
// test/commands/all-commands.test.ts

describe("All Commands", () => {
  test("CMD-ALL-001: All 12 commands registered", () => {
    // Given: Plugin loaded
    // When: Listing commands
    // Then: All 12 commands from PRD exist
  });

  test("CMD-ALL-002: Dashboard command opens modal", async () => {
    // Given: Plugin active
    // When: Executing fsrs:open-dashboard
    // Then: Dashboard modal opens
  });

  test("CMD-ALL-003: Manage queues opens queue list", async () => {
    // Given: Plugin active
    // When: Executing fsrs:manage-queues
    // Then: Queue management modal opens
  });

  test("CMD-ALL-004: Add to queue shows queue selector", async () => {
    // Given: Note open in editor
    // When: Executing fsrs:add-to-queue
    // Then: Queue selector shown
    // And: Can add note to selected queue
  });

  test("CMD-ALL-005: Commands check preconditions", async () => {
    // Given: No active session
    // When: Executing fsrs:rate-good
    // Then: Notice "No active review session"
  });
});
```

---

## Phase 2 Integration Tests

```typescript
// test/integration/phase2-integration.test.ts

describe("Phase 2 Integration", () => {
  describe("Multi-Queue Workflow", () => {
    test("INT-P2-001: Create and use multiple queues", async () => {
      // Given: Notes in "Math/" and "CS/" folders
      // When: Creating queue "Math" for Math/
      // And: Creating queue "CS" for CS/
      // Then: Each queue has correct notes
      // When: Reviewing in "Math" queue
      // Then: Only Math notes shown
    });

    test("INT-P2-002: Same note in multiple queues", async () => {
      // Given: Note "algorithm.md" with tags #math #cs
      // When: Queue "Math" uses #math, Queue "CS" uses #cs
      // Then: Note appears in both queues
      // When: Reviewing in Math, rate "Good"
      // Then: Math schedule updated
      // And: CS schedule unchanged
    });
  });

  describe("Complete Review Session", () => {
    test("INT-P2-003: Full session with all features", async () => {
      // Given: Queue with 5 due notes
      // When: Start session
      // Then: First note opens, stats shown
      // When: Rate "Good"
      // Then: Interval preview was accurate
      // When: Undo
      // Then: Back to first note
      // When: Rate "Easy" this time
      // Then: Move to second note
      // When: Skip
      // Then: Move to third (skipped note preserved)
      // When: Go Back
      // Then: Second note shown again
      // When: Rate it, continue to end
      // Then: Session stats accurate
    });
  });

  describe("Dashboard Accuracy", () => {
    test("INT-P2-004: Dashboard reflects true state", async () => {
      // Given: 10 reviews today, 5 overdue, 3 new
      // When: Opening dashboard
      // Then: All numbers accurate
      // And: Heatmap shows today's reviews
      // And: Streak is correct
    });
  });

  describe("Orphan Handling", () => {
    test("INT-P2-005: Complete orphan workflow", async () => {
      // Given: Card for "concept.md"
      // When: Note renamed to "concept-v2.md" via Obsidian
      // Then: Card auto-updated
      // And: No orphan created
      // When: Note deleted
      // Then: Orphan created
      // When: User re-links to "different.md"
      // Then: Card references new note
      // And: History preserved
    });
  });
});
```

---

## Phase 2 Completion Checklist

### Feature Checklist

- [ ] Multiple queue CRUD working
- [ ] Tag-based selection implemented
- [ ] Full exclusion system working
- [ ] Complete sidebar statistics
- [ ] Undo functionality
- [ ] Go Back navigation
- [ ] Dashboard with all visualizations
- [ ] Orphan detection and resolution
- [ ] All 12 commands registered

### Quality Gates

- [ ] All Phase 1 tests still pass
- [ ] All Phase 2 unit tests pass
- [ ] Integration tests pass
- [ ] No performance regression
- [ ] UI works on all themes
- [ ] Mobile layout acceptable

### Definition of Done

**User can:**

1. Create multiple named queues
2. Use folder OR tag-based selection
3. Set up complex exclusion rules
4. See full statistics during review
5. Undo accidental ratings
6. Navigate review history
7. View comprehensive dashboard
8. Resolve orphaned cards
9. Use all commands with hotkeys
