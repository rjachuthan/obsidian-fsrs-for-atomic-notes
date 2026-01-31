# Phase 1: Core Foundation (MVP)

**Goal**: Basic working spaced repetition with FSRS algorithm
**Duration Estimate**: Foundation release
**Success Criteria**: User can configure a folder, review notes, and have schedules persist across sessions.

---

## Milestones

### Milestone 1.1: Plugin Skeleton & Project Setup

**Objective**: Establish a properly structured Obsidian plugin with build tooling.

#### Deliverables

- [ ] Initialize plugin using Obsidian sample plugin template
- [ ] Configure TypeScript with strict mode
- [ ] Set up esbuild for bundling
- [ ] Create module structure as per PRD
- [ ] Add ts-fsrs as dependency
- [ ] Configure ESLint and Prettier

#### File Structure

```
obsidian-fsrs-atomic/
├── src/
│   ├── main.ts
│   ├── types.ts
│   ├── constants.ts
│   ├── fsrs/
│   ├── queues/
│   ├── criteria/
│   ├── review/
│   ├── ui/
│   ├── data/
│   ├── sync/
│   ├── commands/
│   └── utils/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── styles.css
```

#### Acceptance Criteria

- [ ] Plugin loads without errors in Obsidian
- [ ] Plugin appears in Community Plugins list (local)
- [ ] Plugin can be enabled/disabled without errors
- [ ] Build produces single main.js file
- [ ] No TypeScript compilation errors

#### Test Cases

```typescript
// test/setup/plugin-lifecycle.test.ts

describe("Plugin Lifecycle", () => {
  describe("Plugin Loading", () => {
    test("SETUP-001: Plugin loads without throwing errors", async () => {
      // Given: A fresh Obsidian vault
      // When: Plugin is enabled
      // Then: No errors are thrown in console
      // And: Plugin instance is created
    });

    test("SETUP-002: Plugin registers with Obsidian correctly", async () => {
      // Given: Plugin is loaded
      // When: Checking manifest
      // Then: Plugin ID matches "obsidian-fsrs-atomic"
      // And: Version follows semver
    });

    test("SETUP-003: Plugin unloads cleanly", async () => {
      // Given: Plugin is enabled and running
      // When: Plugin is disabled
      // Then: All event listeners are removed
      // And: No memory leaks (sidebar views closed)
    });
  });

  describe("Build Output", () => {
    test("SETUP-004: Build produces valid output", () => {
      // Given: Source code compiles
      // When: Running esbuild
      // Then: main.js is created
      // And: File size is under 500KB (reasonable limit)
    });

    test("SETUP-005: No external dependencies in bundle", () => {
      // Given: Build output
      // When: Analyzing bundle
      // Then: ts-fsrs is bundled inline
      // And: No require() calls for npm packages
    });
  });
});
```

---

### Milestone 1.2: Data Layer Implementation

**Objective**: Implement persistent storage for plugin data with proper schema.

#### Deliverables

- [ ] Define TypeScript interfaces in `types.ts`
- [ ] Implement `DataStore` class for CRUD operations
- [ ] Implement data loading on plugin start
- [ ] Implement data saving (debounced)
- [ ] Add schema version for future migrations
- [ ] Add basic data validation

#### Key Interfaces

```typescript
// From PRD - core interfaces to implement
interface PluginData {
  version: number;
  settings: PluginSettings;
  queues: Queue[];
  cards: Record<string, CardData>; // Use Record for JSON serialization
  reviews: ReviewLog[];
  orphans: OrphanRecord[];
}

interface PluginSettings {
  selectionMode: "folder" | "tag";
  trackedFolders: string[];
  trackedTags: string[];
  excludedNoteNames: string[];
  excludedTags: string[];
  excludedProperties: PropertyMatch[];
  queueOrder: QueueOrderStrategy;
  showNoteStats: boolean;
  showPredictedIntervals: boolean;
  showSessionStats: boolean;
  sidebarPosition: "left" | "right";
}
```

#### Acceptance Criteria

- [ ] Data persists after Obsidian restart
- [ ] Data file created at correct location (`.obsidian/plugins/obsidian-fsrs-atomic/data.json`)
- [ ] Default settings applied on first load
- [ ] Invalid JSON handled gracefully (reset to defaults)
- [ ] Save operations debounced (no excessive writes)

#### Test Cases

```typescript
// test/data/data-store.test.ts

describe("DataStore", () => {
  describe("Initialization", () => {
    test("DATA-001: Creates default data on first load", async () => {
      // Given: No existing data.json
      // When: DataStore initializes
      // Then: Default PluginData is created
      // And: version is set to current schema version
    });

    test("DATA-002: Loads existing data correctly", async () => {
      // Given: Valid data.json exists with 5 cards
      // When: DataStore initializes
      // Then: All 5 cards are loaded
      // And: Settings are preserved
    });

    test("DATA-003: Handles corrupted JSON gracefully", async () => {
      // Given: data.json contains invalid JSON
      // When: DataStore initializes
      // Then: Error is logged
      // And: Default data is used
      // And: Backup of corrupted file is created
    });

    test("DATA-004: Migrates old schema versions", async () => {
      // Given: data.json with version 1
      // When: Current schema is version 2
      // Then: Migration function is called
      // And: Data is upgraded to version 2
    });
  });

  describe("Persistence", () => {
    test("DATA-005: Saves data to correct location", async () => {
      // Given: DataStore is initialized
      // When: save() is called
      // Then: data.json is written to plugin folder
    });

    test("DATA-006: Debounces rapid save calls", async () => {
      // Given: DataStore is initialized
      // When: save() is called 10 times in 100ms
      // Then: Only 1-2 actual file writes occur
    });

    test("DATA-007: Saves on plugin unload", async () => {
      // Given: Unsaved changes exist
      // When: Plugin is disabled
      // Then: Data is saved before unload completes
    });
  });

  describe("Data Integrity", () => {
    test("DATA-008: Validates card data on load", async () => {
      // Given: Card with missing required field (notePath)
      // When: Data is loaded
      // Then: Invalid card is logged and skipped
      // And: Other valid cards are loaded
    });

    test("DATA-009: Prevents duplicate card paths", async () => {
      // Given: Card exists for "note.md"
      // When: Attempting to add another card for "note.md"
      // Then: Error is thrown or existing card is returned
    });
  });
});
```

---

### Milestone 1.3: FSRS Integration

**Objective**: Integrate ts-fsrs library for spaced repetition scheduling.

#### Deliverables

- [ ] Create FSRS wrapper in `fsrs/scheduler.ts`
- [ ] Implement `CardManager` for card CRUD
- [ ] Implement `ReviewProcessor` for rating handling
- [ ] Map ts-fsrs types to plugin types
- [ ] Implement interval preview (show next intervals for each rating)

#### Key Functions

```typescript
// fsrs/scheduler.ts
class Scheduler {
  constructor(params?: Partial<FSRSParameters>);

  // Get scheduling options for all ratings
  getSchedulingCards(card: CardData): SchedulingResult;

  // Apply a rating to a card
  rateCard(card: CardData, rating: Rating): RatingResult;

  // Undo a rating using review log
  rollback(card: CardData, log: ReviewLog): CardData;

  // Get current retrievability
  getRetrievability(card: CardData): number;
}

// fsrs/card-manager.ts
class CardManager {
  createCard(notePath: string, queueId: string): CardData;
  getCard(notePath: string): CardData | undefined;
  updateCard(card: CardData): void;
  deleteCard(notePath: string): void;
  getCardsForQueue(queueId: string): CardData[];
  getDueCards(queueId: string, now?: Date): CardData[];
}
```

#### Acceptance Criteria

- [ ] New cards start with correct initial state (State.New)
- [ ] Rating updates card scheduling correctly
- [ ] Due date calculations match FSRS algorithm
- [ ] Retrievability calculation is accurate
- [ ] Rollback restores previous card state exactly

#### Test Cases

```typescript
// test/fsrs/scheduler.test.ts

describe("Scheduler", () => {
  describe("Card Creation", () => {
    test("FSRS-001: New card has correct initial state", () => {
      // Given: Scheduler instance
      // When: Creating a new card
      // Then: state = State.New (0)
      // And: stability = 0
      // And: difficulty = 0
      // And: reps = 0
      // And: lapses = 0
    });

    test("FSRS-002: New card is due immediately", () => {
      // Given: New card created at time T
      // When: Checking due date
      // Then: due <= T (card is due now)
    });
  });

  describe("Rating Processing", () => {
    test("FSRS-003: Again rating moves to Learning state", () => {
      // Given: New card
      // When: Rated "Again" (1)
      // Then: state = State.Learning (1)
      // And: due is within minutes
      // And: lapses = 0 (first time doesn't count as lapse)
    });

    test("FSRS-004: Good rating on new card moves to Review", () => {
      // Given: New card
      // When: Rated "Good" (3)
      // Then: state = State.Review (2)
      // And: due is days away
      // And: stability > 0
    });

    test("FSRS-005: Easy rating gives longest interval", () => {
      // Given: Card in Review state
      // When: Getting scheduling preview
      // Then: Easy interval > Good interval > Hard interval > Again interval
    });

    test("FSRS-006: Again on Review card moves to Relearning", () => {
      // Given: Card with state = Review, lapses = 0
      // When: Rated "Again"
      // Then: state = State.Relearning (3)
      // And: lapses = 1
    });

    test("FSRS-007: Overdue card adjusts based on elapsed time", () => {
      // Given: Card due 30 days ago
      // When: Rated "Good" today
      // Then: elapsed_days in log = 30 + original interval
      // And: New interval accounts for successful recall despite delay
    });
  });

  describe("Rollback", () => {
    test("FSRS-008: Rollback restores exact previous state", () => {
      // Given: Card with stability=10, difficulty=5
      // When: Rated "Again", then rollback
      // Then: stability = 10
      // And: difficulty = 5
      // And: All other fields match original
    });

    test("FSRS-009: Rollback works with review log", () => {
      // Given: Card rated multiple times
      // When: Rolling back last rating using its log
      // Then: Card state matches before that rating
    });
  });

  describe("Retrievability", () => {
    test("FSRS-010: Retrievability is 100% at due date", () => {
      // Given: Card with due date = today
      // When: Calculating retrievability
      // Then: retrievability ≈ 0.9 (target retention)
    });

    test("FSRS-011: Retrievability decreases over time", () => {
      // Given: Card with stability = 10 days
      // When: Checking retrievability at day 0, 5, 10, 20
      // Then: R(0) > R(5) > R(10) > R(20)
    });
  });
});

// test/fsrs/card-manager.test.ts

describe("CardManager", () => {
  describe("CRUD Operations", () => {
    test("CARD-001: Create card with valid path", () => {
      // Given: Note path "folder/note.md"
      // When: Creating card
      // Then: Card is created with correct notePath
      // And: Card is stored in data store
    });

    test("CARD-002: Get card by path", () => {
      // Given: Card exists for "note.md"
      // When: getCard("note.md")
      // Then: Returns the card
    });

    test("CARD-003: Get card for non-existent path returns undefined", () => {
      // Given: No card for "missing.md"
      // When: getCard("missing.md")
      // Then: Returns undefined
    });

    test("CARD-004: Update card persists changes", () => {
      // Given: Card with stability = 5
      // When: Updating stability to 10
      // Then: getCard returns card with stability = 10
    });

    test("CARD-005: Delete card removes from store", () => {
      // Given: Card exists
      // When: deleteCard(path)
      // Then: getCard(path) returns undefined
    });
  });

  describe("Queue Operations", () => {
    test("CARD-006: Get cards for specific queue", () => {
      // Given: 3 cards in queue "A", 2 cards in queue "B"
      // When: getCardsForQueue("A")
      // Then: Returns exactly 3 cards
    });

    test("CARD-007: Get due cards filters correctly", () => {
      // Given: 5 cards, 2 due today, 3 due tomorrow
      // When: getDueCards(queueId, today)
      // Then: Returns exactly 2 cards
    });

    test("CARD-008: Get due cards includes overdue", () => {
      // Given: 1 card due yesterday, 1 due today, 1 due tomorrow
      // When: getDueCards(queueId, today)
      // Then: Returns 2 cards (yesterday + today)
    });
  });
});
```

---

### Milestone 1.4: Basic Note Selection (Folder-based)

**Objective**: Implement folder-based note selection for the default queue.

#### Deliverables

- [ ] Implement `NoteResolver` class
- [ ] Implement `FolderCriterion` for folder-based selection
- [ ] Create basic exclusion handling
- [ ] Integrate with Obsidian's metadata cache
- [ ] Handle nested folders correctly

#### Key Functions

```typescript
// criteria/folder-criterion.ts
class FolderCriterion implements SelectionCriterion {
  constructor(folders: string[]);
  evaluate(file: TFile, metadata: CachedMetadata): boolean;
}

// queues/note-resolver.ts
class NoteResolver {
  constructor(app: App, settings: PluginSettings);

  // Get all notes matching criteria
  resolveNotes(criteria: SelectionCriteria): TFile[];

  // Check if a specific note matches
  matchesNote(file: TFile): boolean;

  // Get count without loading all notes
  getMatchingCount(criteria: SelectionCriteria): number;
}
```

#### Acceptance Criteria

- [ ] Notes in tracked folders are selected
- [ ] Notes in subfolders are included
- [ ] Notes outside tracked folders are excluded
- [ ] Empty folders don't cause errors
- [ ] Non-markdown files are ignored

#### Test Cases

```typescript
// test/criteria/folder-criterion.test.ts

describe("FolderCriterion", () => {
  describe("Basic Matching", () => {
    test("FOLDER-001: Matches note in tracked folder", () => {
      // Given: Tracked folder "Notes/"
      // When: Evaluating "Notes/concept.md"
      // Then: Returns true
    });

    test("FOLDER-002: Matches note in subfolder", () => {
      // Given: Tracked folder "Notes/"
      // When: Evaluating "Notes/SubFolder/concept.md"
      // Then: Returns true
    });

    test("FOLDER-003: Rejects note outside tracked folders", () => {
      // Given: Tracked folder "Notes/"
      // When: Evaluating "Archive/old.md"
      // Then: Returns false
    });

    test("FOLDER-004: Handles root folder", () => {
      // Given: Tracked folder "/" or ""
      // When: Evaluating any note
      // Then: Returns true (all notes included)
    });

    test("FOLDER-005: Multiple folders - matches any", () => {
      // Given: Tracked folders ["Notes/", "Ideas/"]
      // When: Evaluating "Ideas/thought.md"
      // Then: Returns true
    });
  });

  describe("Edge Cases", () => {
    test("FOLDER-006: Case sensitivity follows OS", () => {
      // Given: Tracked folder "Notes/"
      // When: Evaluating "notes/concept.md" (lowercase)
      // Then: Behavior matches file system (macOS: insensitive, Linux: sensitive)
    });

    test("FOLDER-007: Folder with trailing slash", () => {
      // Given: Tracked folder "Notes/"
      // When: Folder stored as "Notes" (no slash)
      // Then: Still matches correctly
    });

    test("FOLDER-008: Empty tracked folders array", () => {
      // Given: Tracked folders []
      // When: Evaluating any note
      // Then: Returns false (no folders = no matches)
    });
  });
});

// test/queues/note-resolver.test.ts

describe("NoteResolver", () => {
  describe("Resolution", () => {
    test("RESOLVE-001: Returns all matching notes", () => {
      // Given: 10 notes in "Notes/", 5 in "Archive/"
      // When: Resolving with folder criterion ["Notes/"]
      // Then: Returns exactly 10 notes
    });

    test("RESOLVE-002: Applies exclusion criteria", () => {
      // Given: 10 notes in "Notes/", 2 with #template tag
      // When: Resolving with exclusion for #template
      // Then: Returns exactly 8 notes
    });

    test("RESOLVE-003: Returns TFile objects", () => {
      // Given: Matching notes exist
      // When: Resolving
      // Then: Each result is a TFile instance
      // And: file.path is accessible
    });
  });

  describe("Performance", () => {
    test("RESOLVE-004: Handles large folder efficiently", () => {
      // Given: Folder with 1000 notes
      // When: Resolving
      // Then: Completes in < 100ms
    });

    test("RESOLVE-005: Count without full resolution", () => {
      // Given: 500 matching notes
      // When: getMatchingCount()
      // Then: Returns 500
      // And: Faster than resolveNotes()
    });
  });
});
```

---

### Milestone 1.5: Single Queue Support

**Objective**: Implement a default queue that holds all matching notes.

#### Deliverables

- [ ] Implement `QueueManager` class
- [ ] Create "Default" queue on first setup
- [ ] Sync queue with resolved notes
- [ ] Calculate queue statistics
- [ ] Handle note additions/removals

#### Key Functions

```typescript
// queues/queue-manager.ts
class QueueManager {
  constructor(dataStore: DataStore, noteResolver: NoteResolver);

  // Get or create default queue
  getDefaultQueue(): Queue;

  // Sync queue with current vault state
  syncQueue(queueId: string): SyncResult;

  // Get queue statistics
  getQueueStats(queueId: string): QueueStats;

  // Get due notes for queue
  getDueNotes(queueId: string): CardData[];
}

interface SyncResult {
  added: string[]; // New notes added
  removed: string[]; // Notes no longer matching
  unchanged: number; // Notes still in queue
}
```

#### Acceptance Criteria

- [ ] Default queue created automatically on first run
- [ ] Queue contains all notes matching folder criteria
- [ ] Queue syncs when settings change
- [ ] Statistics are accurate (due, new, overdue counts)
- [ ] Removed notes are handled (orphan or remove card)

#### Test Cases

```typescript
// test/queues/queue-manager.test.ts

describe("QueueManager", () => {
  describe("Default Queue", () => {
    test("QUEUE-001: Creates default queue on first run", () => {
      // Given: Fresh plugin installation
      // When: getDefaultQueue()
      // Then: Queue exists with name "Default"
      // And: Queue ID is generated
    });

    test("QUEUE-002: Returns existing default queue", () => {
      // Given: Default queue already exists
      // When: getDefaultQueue() called twice
      // Then: Returns same queue (by ID)
    });
  });

  describe("Queue Sync", () => {
    test("QUEUE-003: Adds new matching notes", () => {
      // Given: Queue with 5 notes
      // When: 2 new notes added to tracked folder, sync called
      // Then: syncResult.added has 2 paths
      // And: Queue now has 7 notes
    });

    test("QUEUE-004: Detects removed notes", () => {
      // Given: Queue with card for "note.md"
      // When: "note.md" moved out of tracked folder, sync called
      // Then: syncResult.removed has "note.md"
    });

    test("QUEUE-005: Sync is idempotent", () => {
      // Given: Queue in sync with vault
      // When: syncQueue() called twice
      // Then: Second call has no changes
    });

    test("QUEUE-006: Creates cards for new notes", () => {
      // Given: New note "concept.md" in tracked folder
      // When: syncQueue()
      // Then: Card exists for "concept.md"
      // And: Card state is New
    });
  });

  describe("Queue Statistics", () => {
    test("QUEUE-007: Counts total notes correctly", () => {
      // Given: Queue with 10 notes
      // When: getQueueStats()
      // Then: stats.totalNotes = 10
    });

    test("QUEUE-008: Counts new notes correctly", () => {
      // Given: Queue with 3 new cards, 7 reviewed cards
      // When: getQueueStats()
      // Then: stats.newNotes = 3
    });

    test("QUEUE-009: Counts due notes correctly", () => {
      // Given: 2 cards due today, 3 overdue, 5 future
      // When: getQueueStats()
      // Then: stats.dueNotes = 5 (today + overdue)
    });

    test("QUEUE-010: Counts overdue separately", () => {
      // Given: 3 cards due before today
      // When: getQueueStats()
      // Then: Can determine overdue count = 3
    });
  });

  describe("Due Notes", () => {
    test("QUEUE-011: Returns due notes in order", () => {
      // Given: Cards with various due dates
      // When: getDueNotes() with "due-overdue-first" order
      // Then: Most overdue first, then chronological
    });

    test("QUEUE-012: Excludes future notes", () => {
      // Given: Card due tomorrow
      // When: getDueNotes() for today
      // Then: Card not included
    });
  });
});
```

---

### Milestone 1.6: Review Sidebar UI

**Objective**: Create the sidebar view with rating buttons for reviewing notes.

#### Deliverables

- [ ] Implement `ReviewSidebar` as ItemView
- [ ] Add rating buttons (Again, Hard, Good, Easy)
- [ ] Show progress indicator
- [ ] Show current queue name
- [ ] Add Skip, End Session buttons
- [ ] Handle sidebar state (active session vs idle)

#### UI Components

```typescript
// ui/sidebar/review-sidebar.ts
class ReviewSidebar extends ItemView {
  getViewType(): string;
  getDisplayText(): string;

  // Render based on session state
  render(): void;

  // Handle rating button clicks
  onRating(rating: Rating): void;

  // Update progress display
  updateProgress(current: number, total: number): void;
}
```

#### Acceptance Criteria

- [ ] Sidebar appears in right panel
- [ ] Rating buttons are visible and clickable
- [ ] Progress shows "X of Y" format
- [ ] Buttons disabled when no active session
- [ ] Sidebar updates when rating is made

#### Test Cases

```typescript
// test/ui/sidebar/review-sidebar.test.ts

describe("ReviewSidebar", () => {
  describe("Rendering", () => {
    test("UI-001: Renders idle state when no session", () => {
      // Given: No active review session
      // When: Sidebar renders
      // Then: Shows "Start Review" button
      // And: Rating buttons not visible
    });

    test("UI-002: Renders active state during session", () => {
      // Given: Active review session with 5 notes
      // When: Sidebar renders
      // Then: Shows queue name
      // And: Shows progress "1 of 5"
      // And: All 4 rating buttons visible
    });

    test("UI-003: Shows predicted intervals on buttons", () => {
      // Given: Active session, settings.showPredictedIntervals = true
      // When: Rendering buttons
      // Then: Each button shows interval (e.g., "Good (5 days)")
    });

    test("UI-004: Hides intervals when setting disabled", () => {
      // Given: settings.showPredictedIntervals = false
      // When: Rendering buttons
      // Then: Buttons show only rating name
    });
  });

  describe("Interactions", () => {
    test("UI-005: Rating button triggers rating", () => {
      // Given: Active session
      // When: Clicking "Good" button
      // Then: SessionManager.rate(Rating.Good) is called
    });

    test("UI-006: Skip button advances without rating", () => {
      // Given: Active session at note 3
      // When: Clicking "Skip"
      // Then: Session moves to note 4
      // And: Note 3 remains unrated
    });

    test("UI-007: End Session button closes session", () => {
      // Given: Active session
      // When: Clicking "End Session"
      // Then: Session is ended
      // And: Sidebar shows idle state
    });
  });

  describe("Progress", () => {
    test("UI-008: Progress updates after rating", () => {
      // Given: Session at "2 of 10"
      // When: Rating is made
      // Then: Progress shows "3 of 10"
    });

    test("UI-009: Progress bar reflects completion", () => {
      // Given: 5 of 20 reviewed
      // When: Rendering progress bar
      // Then: Bar is 25% filled
    });
  });

  describe("State Handling", () => {
    test("UI-010: Disables rating when note differs", () => {
      // Given: Session expects "note-a.md"
      // When: User navigates to "note-b.md"
      // Then: Rating buttons disabled
      // And: "Bring Back" button shown
    });

    test("UI-011: Re-enables when returning to expected note", () => {
      // Given: Rating disabled due to wrong note
      // When: User returns to expected note
      // Then: Rating buttons enabled
    });
  });
});
```

---

### Milestone 1.7: Review Session Logic

**Objective**: Implement the core review session workflow.

#### Deliverables

- [ ] Implement `SessionManager` class
- [ ] Build review queue from due notes
- [ ] Navigate between notes (open in editor)
- [ ] Process ratings and update cards
- [ ] Track session statistics
- [ ] Handle session lifecycle (start, end, resume)

#### Key Functions

```typescript
// review/session-manager.ts
class SessionManager {
  constructor(
    app: App,
    cardManager: CardManager,
    scheduler: Scheduler,
    queueManager: QueueManager,
  );

  // Start a new session for a queue
  startSession(queueId: string): Promise<void>;

  // End current session
  endSession(): void;

  // Rate current note
  rate(rating: Rating): Promise<void>;

  // Skip current note (move to next without rating)
  skip(): Promise<void>;

  // Get current session state
  getState(): SessionState;

  // Check if session is active
  isActive(): boolean;
}

interface SessionState {
  queueId: string;
  currentIndex: number;
  totalNotes: number;
  currentNotePath: string;
  reviewed: number;
  ratings: Record<Rating, number>; // Count of each rating
  sessionId: string;
  startedAt: Date;
}
```

#### Acceptance Criteria

- [ ] Session starts with due notes from queue
- [ ] First note opens in editor automatically
- [ ] Rating advances to next note
- [ ] Session ends when all notes reviewed
- [ ] Session state persists if user navigates away

#### Test Cases

```typescript
// test/review/session-manager.test.ts

describe("SessionManager", () => {
  describe("Session Start", () => {
    test("SESSION-001: Starts with due notes only", async () => {
      // Given: Queue with 5 due, 3 not due
      // When: startSession()
      // Then: Session has exactly 5 notes
    });

    test("SESSION-002: Opens first note in editor", async () => {
      // Given: Queue with notes
      // When: startSession()
      // Then: First due note is opened in active leaf
    });

    test("SESSION-003: Empty queue shows message", async () => {
      // Given: Queue with 0 due notes
      // When: startSession()
      // Then: Notice "No notes due for review"
      // And: Session not started
    });

    test("SESSION-004: Generates unique session ID", async () => {
      // Given: Starting session
      // When: Checking session state
      // Then: sessionId is unique UUID-like string
    });
  });

  describe("Rating", () => {
    test("SESSION-005: Rate updates card schedule", async () => {
      // Given: Active session, current note has stability 5
      // When: rate(Rating.Good)
      // Then: Card's schedule is updated via scheduler
    });

    test("SESSION-006: Rate creates review log", async () => {
      // Given: Active session
      // When: rate(Rating.Hard)
      // Then: ReviewLog created with rating = 2
      // And: Log saved to data store
    });

    test("SESSION-007: Rate advances to next note", async () => {
      // Given: Session at index 0
      // When: rate(Rating.Good)
      // Then: currentIndex = 1
      // And: Next note opened
    });

    test("SESSION-008: Rate at last note ends session", async () => {
      // Given: Session at last note (index = total - 1)
      // When: rate(Rating.Good)
      // Then: Session ends
      // And: Completion message shown
    });

    test("SESSION-009: Rate increments rating count", async () => {
      // Given: Session with ratings.Good = 2
      // When: rate(Rating.Good)
      // Then: ratings.Good = 3
    });
  });

  describe("Skip", () => {
    test("SESSION-010: Skip moves to next note", async () => {
      // Given: Session at index 2
      // When: skip()
      // Then: currentIndex = 3
      // And: No review log created for skipped note
    });

    test("SESSION-011: Skip at last note ends session", async () => {
      // Given: Session at last note
      // When: skip()
      // Then: Session ends
    });
  });

  describe("Session End", () => {
    test("SESSION-012: End session clears state", () => {
      // Given: Active session
      // When: endSession()
      // Then: isActive() = false
      // And: getState() returns null/empty
    });

    test("SESSION-013: Session stats available after end", () => {
      // Given: Session with 5 reviews
      // When: endSession()
      // Then: Last session stats accessible
    });
  });

  describe("Edge Cases", () => {
    test("SESSION-014: Cannot rate when no active session", async () => {
      // Given: No active session
      // When: rate(Rating.Good)
      // Then: Error thrown or no-op
    });

    test("SESSION-015: Cannot start session while one is active", async () => {
      // Given: Active session
      // When: startSession() called again
      // Then: Error or prompt to end current session
    });
  });
});
```

---

### Milestone 1.8: Basic Settings Tab

**Objective**: Create settings UI for configuring the plugin.

#### Deliverables

- [ ] Implement `SettingTab` extending PluginSettingTab
- [ ] Add selection mode dropdown (folder/tag)
- [ ] Add tracked folders input
- [ ] Add basic exclusion inputs
- [ ] Settings save automatically
- [ ] Trigger queue sync on settings change

#### UI Elements

| Setting          | Type                  | Behavior                 |
| ---------------- | --------------------- | ------------------------ |
| Selection Mode   | Dropdown              | Folder-based / Tag-based |
| Tracked Folders  | Multi-line text input | One folder per line      |
| Excluded Tags    | Multi-line text input | One tag per line         |
| Sidebar Position | Dropdown              | Left / Right             |

#### Acceptance Criteria

- [ ] Settings tab appears in Obsidian settings
- [ ] Changes persist after closing settings
- [ ] Folder suggestions appear when typing
- [ ] Invalid folder paths show warning
- [ ] Changing tracked folders triggers resync

#### Test Cases

```typescript
// test/ui/settings/settings-tab.test.ts

describe("SettingsTab", () => {
  describe("Rendering", () => {
    test("SETTINGS-001: Renders all setting sections", () => {
      // Given: Settings tab opened
      // When: Rendering
      // Then: "Note Selection" section visible
      // And: "Exclusion Rules" section visible
      // And: "Interface" section visible
    });

    test("SETTINGS-002: Shows current values", () => {
      // Given: settings.selectionMode = "folder"
      // When: Opening settings
      // Then: Dropdown shows "Folder-based"
    });
  });

  describe("Selection Mode", () => {
    test("SETTINGS-003: Changing mode shows relevant fields", () => {
      // Given: Mode = "folder"
      // When: Changing to "tag"
      // Then: "Tracked Folders" hidden
      // And: "Tracked Tags" shown
    });

    test("SETTINGS-004: Mode change triggers save", () => {
      // Given: Mode = "folder"
      // When: Selecting "tag"
      // Then: saveData() called
    });
  });

  describe("Folder Input", () => {
    test("SETTINGS-005: Folders parsed from textarea", () => {
      // Given: Input "Notes\nIdeas\nProjects"
      // When: Saving
      // Then: settings.trackedFolders = ["Notes", "Ideas", "Projects"]
    });

    test("SETTINGS-006: Empty lines ignored", () => {
      // Given: Input "Notes\n\nIdeas"
      // When: Saving
      // Then: settings.trackedFolders = ["Notes", "Ideas"]
    });

    test("SETTINGS-007: Folder change triggers sync", () => {
      // Given: Tracked folder "Notes"
      // When: Adding "Ideas"
      // Then: QueueManager.syncQueue() called
    });
  });

  describe("Validation", () => {
    test("SETTINGS-008: Warns on non-existent folder", () => {
      // Given: Input folder "NonExistent"
      // When: Blur event
      // Then: Warning message shown
      // And: Setting still saved (folder might be created later)
    });
  });
});
```

---

### Milestone 1.9: Commands Registration

**Objective**: Register all Phase 1 commands with Obsidian.

#### Deliverables

- [ ] Register `fsrs:start-review` command
- [ ] Register `fsrs:rate-*` commands (again, hard, good, easy)
- [ ] Register `fsrs:skip-note` command
- [ ] Register `fsrs:end-session` command
- [ ] Commands available in command palette
- [ ] Commands can be assigned hotkeys

#### Acceptance Criteria

- [ ] Commands appear in command palette
- [ ] Commands work when invoked
- [ ] Rating commands only work during active session
- [ ] Commands can have hotkeys assigned

#### Test Cases

```typescript
// test/commands/command-registration.test.ts

describe("Commands", () => {
  describe("Registration", () => {
    test("CMD-001: All Phase 1 commands registered", () => {
      // Given: Plugin loaded
      // When: Checking registered commands
      // Then: fsrs:start-review exists
      // And: fsrs:rate-again exists
      // And: fsrs:rate-hard exists
      // And: fsrs:rate-good exists
      // And: fsrs:rate-easy exists
      // And: fsrs:skip-note exists
      // And: fsrs:end-session exists
    });

    test("CMD-002: Commands have correct names", () => {
      // Given: Commands registered
      // When: Getting command by ID
      // Then: Command name is human-readable
      // e.g., "FSRS: Start Review Session"
    });
  });

  describe("Execution", () => {
    test("CMD-003: Start review initiates session", async () => {
      // Given: Due notes exist
      // When: Executing fsrs:start-review
      // Then: SessionManager.startSession() called
    });

    test("CMD-004: Rating commands require active session", async () => {
      // Given: No active session
      // When: Executing fsrs:rate-good
      // Then: Notice "No active review session"
      // And: No error thrown
    });

    test("CMD-005: Rating commands work during session", async () => {
      // Given: Active session
      // When: Executing fsrs:rate-good
      // Then: SessionManager.rate(Rating.Good) called
    });
  });
});
```

---

## Phase 1 Integration Tests

These tests verify the complete workflow works end-to-end.

```typescript
// test/integration/phase1-integration.test.ts

describe("Phase 1 Integration", () => {
  describe("First-Time Setup Flow", () => {
    test("INT-001: Complete setup creates reviewable queue", async () => {
      // Given: Fresh installation, vault with 10 notes in "Notes/" folder
      // When: User opens settings
      // And: Selects "Folder-based" mode
      // And: Adds "Notes/" to tracked folders
      // Then: Default queue created
      // And: Queue contains 10 cards
      // And: All cards are in New state
    });
  });

  describe("Review Session Flow", () => {
    test("INT-002: Complete review session", async () => {
      // Given: Queue with 3 new notes
      // When: User starts review session
      // Then: First note opens
      // When: User rates "Good"
      // Then: Card scheduled for future
      // And: Second note opens
      // When: User rates "Easy"
      // Then: Third note opens
      // When: User rates "Hard"
      // Then: Session completes
      // And: All 3 cards have been reviewed
      // And: 3 review logs created
    });

    test("INT-003: Session persists through navigation", async () => {
      // Given: Active session at note 2 of 5
      // When: User clicks a link to different note
      // Then: Session still active
      // And: Sidebar shows "Bring Back" button
      // When: User clicks "Bring Back"
      // Then: Expected note (2) reopens
      // And: Rating buttons enabled
    });
  });

  describe("Data Persistence", () => {
    test("INT-004: Review data survives restart", async () => {
      // Given: User reviews note, rates "Good", interval = 5 days
      // When: Plugin is reloaded
      // Then: Card still has correct due date
      // And: Review log is preserved
    });
  });

  describe("Spaced Repetition Accuracy", () => {
    test("INT-005: FSRS intervals are applied correctly", async () => {
      // Given: New card
      // When: Rated "Good" on day 0
      // Then: Due around day 1-3 (initial interval)
      // When: Rated "Good" again when due
      // Then: Due around day 5-10 (increased interval)
      // When: Rated "Easy"
      // Then: Interval increases more than Good would
    });
  });
});
```

---

## Phase 1 Completion Checklist

### Core Functionality

- [ ] Plugin loads and unloads cleanly
- [ ] Data persists in `data.json`
- [ ] ts-fsrs integrated and scheduling works
- [ ] Folder-based note selection works
- [ ] Default queue created and synced
- [ ] Review sidebar renders correctly
- [ ] Review session workflow complete
- [ ] Settings tab functional
- [ ] Core commands registered

### Quality Gates

- [ ] No TypeScript errors
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Plugin works on Windows, macOS, Linux
- [ ] No console errors during normal operation
- [ ] Data doesn't corrupt on restart

### Definition of Done

**User can:**

1. Install plugin
2. Configure a tracked folder
3. See notes added to default queue
4. Start a review session
5. Rate notes using sidebar buttons
6. Have schedules persist across sessions
7. Continue reviewing over multiple days

---

## Notes for Developers

### Testing Strategy

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test component interactions
3. **E2E Tests**: Test full user workflows (manual for now)

### Key Dependencies

- `ts-fsrs`: ^4.0.0 (or latest stable)
- Obsidian API: Use types from `obsidian` package

### Development Workflow

1. Implement feature
2. Write/update tests
3. Verify in Obsidian (hot reload)
4. Document any API limitations found

### Common Pitfalls

- Remember that `app.vault.on()` returns an event ref for cleanup
- `saveData()` is async - await it or debounce properly
- Sidebar views need to register their view type
- Test with both light and dark themes
