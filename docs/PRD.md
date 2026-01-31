# Product Requirements Document: Obsidian FSRS for Atomic Notes

**Version:** 1.0
**Date:** January 31, 2026
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Non-Goals](#goals--non-goals)
4. [Core Principles](#core-principles)
5. [User Personas](#user-personas)
6. [Feature Specifications](#feature-specifications)
7. [Technical Architecture](#technical-architecture)
8. [Data Model](#data-model)
9. [User Interface Specifications](#user-interface-specifications)
10. [User Flows](#user-flows)
11. [Edge Cases & Error Handling](#edge-cases--error-handling)
12. [Future Considerations](#future-considerations)
13. [Success Metrics](#success-metrics)
14. [Development Phases](#development-phases)
15. [Appendix](#appendix)

## Executive Summary

**Obsidian FSRS for Atomic Notes** is an Obsidian plugin that implements spaced repetition for note review using the FSRS (Free Spaced Repetition Scheduler) algorithm. Unlike existing solutions, this plugin maintains complete separation between notes and spaced repetition metadata, ensuring notes remain pure knowledge containers without plugin-specific artifacts.

### Key Differentiators

- **Zero Note Pollution**: All scheduling data stored externally; notes contain only knowledge content
- **FSRS v6 Algorithm**: State-of-the-art spaced repetition with 20-30% fewer reviews for same retention
- **Multiple Queues**: Organize reviews into named decks without modifying note structure
- **Atomic Note Focus**: Designed specifically for single-idea notes
- **Native Experience**: Reviews happen in normal Obsidian editing environment

## Problem Statement

### Current Landscape Issues

Existing Obsidian spaced repetition plugins suffer from fundamental architectural problems:

1. **Metadata Pollution**
   - Require frontmatter properties
   - Mix system data with knowledge content
   - Violate Single Responsibility Principle

2. **Content Modification**
   - Force special syntax blocks (`#flashcard`, `?::answer` patterns)
   - Introduce non-semantic markup
   - Create plugin dependency in note structure

3. **Workflow Friction**
   - Impose rigid note structures
   - Require retrofitting existing notes
   - Break natural note-taking flow

4. **Maintenance Burden**
   - Abandoned plugins leave metadata artifacts
   - Migration requires cleanup of all affected notes
   - Updates risk breaking note formatting

### User Need

A spaced repetition system that:

- Surfaces atomic notes at optimal intervals for review
- Enables progressive refinement during review
- Maintains complete separation of concerns
- Works with existing notes without modification

## Goals & Non-Goals

### Goals

| Priority | Goal                                                    |
| -------- | ------------------------------------------------------- |
| P0       | Implement FSRS v6 algorithm for scheduling reviews      |
| P0       | Store all spaced repetition data external to notes      |
| P0       | Provide intuitive review interface with rating controls |
| P0       | Support multiple named review queues                    |
| P1       | Comprehensive analytics dashboard                       |
| P1       | Flexible note selection criteria (folder/tag-based)     |
| P1       | Undo functionality for ratings                          |
| P2       | Mobile-compatible design                                |
| P2       | Extensible criteria system for note selection           |

### Non-Goals

| Non-Goal                        | Rationale                                 |
| ------------------------------- | ----------------------------------------- |
| Flashcard-style hide/reveal     | Focus on full note review, not Q&A format |
| Integration with Daily Notes    | Maintain separation of concerns           |
| Integration with Dataview/Bases | Plugin operates independently             |
| Graph View integration          | Keep systems decoupled                    |
| Anki sync/import                | Different use case; may consider future   |
| In-note scheduling syntax       | Violates core principle                   |

## Core Principles

### 1. Note Purity (Inviolable)

Notes contain ONLY:

- Knowledge content (the idea itself)
- Standard organizational metadata (tags, links)
- User-chosen frontmatter properties

Notes NEVER contain:

- Plugin-specific properties
- Scheduling metadata
- Review history
- Algorithm state

### 2. Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                       USER'S VAULT                          │
├─────────────────────────────────────────────────────────────┤
│  Notes/                        │  .obsidian/plugins/        │
│  ├── Concept A.md              │  └── obsidian-fsrs/        │
│  ├── Concept B.md              │      └── data.json         │
│  └── Concept C.md              │          ├── cards[]       │
│      (Pure knowledge only)     │          ├── queues[]      │
│                                │          ├── reviews[]     │
│                                │          └── settings      │
└─────────────────────────────────────────────────────────────┘
```

### 3. Non-Destructive Operation

- Plugin can be removed without any note cleanup
- No "uninstall" process needed for notes
- All plugin data self-contained and deletable

### 4. Native Obsidian Experience

- Reviews occur in normal Obsidian editor
- Full editing capabilities during review
- Standard Obsidian navigation and features available

## User Personas

### Primary: The Knowledge Worker

**Profile**: Researchers, writers, lifelong learners building a personal knowledge base

**Behaviors**:

- Creates atomic notes (one idea per note)
- Values clean, portable note format
- Reviews and refines notes over time
- Wants to internalize key concepts

**Needs**:

- Surface important notes at optimal intervals
- Edit notes during review process
- Track learning progress
- No disruption to existing workflow

### Secondary: The Student

**Profile**: Students using Obsidian for course material

**Behaviors**:

- Creates notes from lectures/readings
- Needs to retain information for exams
- May have different subjects to review

**Needs**:

- Separate queues for different subjects
- High retention with minimal review time
- Progress tracking and analytics

---

## Feature Specifications

### F1: Note Selection System

#### F1.1: Selection Mode

Users choose ONE primary selection mode in settings:

| Mode             | Description                                     |
| ---------------- | ----------------------------------------------- |
| **Folder-based** | All notes in specified folder(s) are candidates |
| **Tag-based**    | Notes with specified tag(s) are candidates      |

#### F1.2: Exclusion Criteria

Multiple exclusion rules can be combined:

| Criterion Type       | Example          | Behavior                              |
| -------------------- | ---------------- | ------------------------------------- |
| Exact note name      | `Meeting Notes`  | Excludes note with exact title        |
| Tag                  | `#template`      | Excludes notes with this tag          |
| Frontmatter property | `type: template` | Excludes notes with matching property |

#### F1.3: Extensibility Requirements

The selection system must be architected for future extension:

```typescript
interface SelectionCriterion {
  id: string;
  type: "include" | "exclude";
  evaluate(note: TFile, metadata: CachedMetadata): boolean;
}

// Future criteria can be added:
// - Regex patterns for titles
// - Link count criteria
// - Creation/modification date filters
// - Custom property value patterns
```

### F2: Queue Management

#### F2.1: Queue Structure

| Property           | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| Name               | User-defined queue name (e.g., "Programming", "Philosophy") |
| ID                 | Plugin-generated unique identifier for the queue            |
| Selection Criteria | Which notes belong to this queue                            |
| Created Date       | When queue was created                                      |
| Note Count         | Number of notes in queue                                    |

#### F2.2: Queue Operations

| Operation    | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| Create       | New queue with name and selection criteria                       |
| Rename       | Change queue display name                                        |
| Delete       | Remove queue (notes unaffected, review data optionally retained) |
| View Stats   | See queue-specific statistics                                    |
| Start Review | Begin review session for this queue                              |

#### F2.3: Multi-Queue Membership

- A note CAN belong to multiple queues
- Each queue maintains independent scheduling for shared notes
- Example: "Concept X" can be in both "Computer Science" and "Mathematics" queues with different review schedules

### F3: Review Session

#### F3.1: Session Initiation

Users start a review session via:

- Command palette: "Start Review Session"
- Dashboard button
- Queue-specific "Review" action
- Ribbon icon (optional)

#### F3.2: Queue Order

Configurable in settings with FSRS-recommended default:

| Order Strategy               | Description                 | Default |
| ---------------------------- | --------------------------- | ------- |
| **Due Date (Overdue First)** | Oldest overdue → newest due | ✓       |
| Due Date (Chronological)     | Strictly by due date        |         |
| Difficulty (Hard First)      | Higher difficulty first     |         |
| Difficulty (Easy First)      | Lower difficulty first      |         |
| Random                       | Shuffle due notes           |         |

#### F3.3: Review Controls

During review, user can:

| Action          | Description                      | Availability                      |
| --------------- | -------------------------------- | --------------------------------- |
| **Rate: Again** | Complete failure to recall       | When note matches queue selection |
| **Rate: Hard**  | Difficult recall                 | When note matches queue selection |
| **Rate: Good**  | Successful recall with effort    | When note matches queue selection |
| **Rate: Easy**  | Effortless recall                | When note matches queue selection |
| **Skip**        | Move to next note without rating | Always                            |
| **Go Back**     | Return to previous note          | When history exists               |
| **Undo**        | Reverse last rating              | When rating just made             |
| **Bring Back**  | Re-open the expected note        | When current note differs         |
| **End Session** | Stop reviewing                   | Always                            |

#### F3.4: Overdue Note Handling

FSRS naturally handles overdue notes through `elapsed_days`:

- Longer elapsed time = lower retrievability
- Algorithm adjusts stability based on actual recall performance
- No artificial penalty needed; FSRS formula accounts for decay

### F4: Review Sidebar

#### F4.1: Sidebar Location

- Default: Right sidebar
- Configurable: Can be moved to left sidebar
- Collapsible: Can be hidden when not reviewing

#### F4.2: Sidebar Sections

##### Primary Section (Always Visible)

| Element        | Description                 |
| -------------- | --------------------------- |
| Current Queue  | Name of active review queue |
| Progress       | "5 of 23 notes reviewed"    |
| Rating Buttons | Again / Hard / Good / Easy  |
| Navigation     | Skip / Go Back / Undo       |

##### Note Statistics (Toggleable)

| Stat           | Description                          |
| -------------- | ------------------------------------ |
| State          | New / Learning / Review / Relearning |
| Stability      | Current stability in days            |
| Difficulty     | Difficulty rating (1-10)             |
| Retrievability | Current recall probability (%)       |
| Reviews        | Total review count                   |
| Lapses         | Number of "Again" ratings            |

##### Predicted Intervals (Toggleable)

| Rating | Shows                     |
| ------ | ------------------------- |
| Again  | "Next review: 10 minutes" |
| Hard   | "Next review: 2 days"     |
| Good   | "Next review: 5 days"     |
| Easy   | "Next review: 12 days"    |

##### Session Statistics (Toggleable)

| Stat         | Description                 |
| ------------ | --------------------------- |
| Reviewed     | Notes reviewed this session |
| Again        | Count of "Again" ratings    |
| Hard         | Count of "Hard" ratings     |
| Good         | Count of "Good" ratings     |
| Easy         | Count of "Easy" ratings     |
| Avg Response | Average rating (numeric)    |

#### F4.3: Sidebar State Handling

| Scenario                     | Sidebar Behavior                                |
| ---------------------------- | ----------------------------------------------- |
| Open note matches queue      | Full controls enabled                           |
| Open note differs from queue | "Bring Back" button prominent, ratings disabled |
| No active session            | "Start Review" button shown                     |
| Queue empty                  | "No notes due" message                          |

### F5: Dashboard

#### F5.1: Dashboard Type

- **Modal popup** opened via command or ribbon
- Non-blocking; can be closed and reopened
- Contains "Start Review" button for quick session launch

#### F5.2: Dashboard Sections

##### Overview Cards

| Card              | Content                           |
| ----------------- | --------------------------------- |
| Total Notes       | Number of notes across all queues |
| Due Today         | Notes due for review today        |
| Overdue           | Notes past their due date         |
| New               | Notes never reviewed              |
| Upcoming (7 days) | Notes due in next week            |

##### Calendar Heatmap

- 12-month view showing review activity
- Color intensity indicates review count per day
- Hover shows exact count for date
- Similar to GitHub contribution graph

##### Retention Statistics

| Metric              | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| Target Retention    | FSRS `request_retention` setting                                |
| Estimated Retention | Predicted retention based on scheduling                         |
| True Retention      | Actual retention (reviews where rating > Again / total reviews) |

##### Forecast Graph

- Line chart showing predicted review load
- X-axis: Next 30 days
- Y-axis: Number of reviews due
- Helps user plan study time

##### State Distribution

- Pie/donut chart showing notes by state:
  - New
  - Learning
  - Review
  - Relearning

##### Difficulty Distribution

- Bar chart or histogram showing notes by difficulty (1-10)
- Helps identify challenging material

##### Streak Tracking

| Metric         | Description                               |
| -------------- | ----------------------------------------- |
| Current Streak | Consecutive days with at least one review |
| Longest Streak | All-time record                           |
| Last Review    | Date of most recent review                |

##### Per-Note Table

Sortable, filterable table with columns:

| Column     | Description                    |
| ---------- | ------------------------------ |
| Note Name  | Link to open note              |
| Queue(s)   | Which queues contain this note |
| State      | Current FSRS state             |
| Due        | Next due date                  |
| Stability  | Current stability              |
| Difficulty | Current difficulty             |
| Reviews    | Total review count             |
| Lapses     | Total "Again" count            |

---

### F6: Settings

#### F6.1: General Settings

| Setting          | Type       | Default      | Description                      |
| ---------------- | ---------- | ------------ | -------------------------------- |
| Selection Mode   | Dropdown   | Folder-based | Primary note selection method    |
| Tracked Folders  | Multi-text | []           | Folders to include (folder mode) |
| Tracked Tags     | Multi-text | []           | Tags to include (tag mode)       |
| Sidebar Position | Dropdown   | Right        | Left or Right sidebar            |

#### F6.2: Exclusion Rules

| Setting             | Type           | Default | Description                               |
| ------------------- | -------------- | ------- | ----------------------------------------- |
| Excluded Note Names | Multi-text     | []      | Exact note names to exclude               |
| Excluded Tags       | Multi-text     | []      | Tags that exclude notes                   |
| Excluded Properties | Key-Value list | []      | Frontmatter properties that exclude notes |

#### F6.3: Review Settings

| Setting                  | Type     | Default                  | Description               |
| ------------------------ | -------- | ------------------------ | ------------------------- |
| Queue Order              | Dropdown | Due Date (Overdue First) | How to order review queue |
| Show Note Stats          | Toggle   | true                     | Show stats in sidebar     |
| Show Predicted Intervals | Toggle   | true                     | Show interval predictions |
| Show Session Stats       | Toggle   | true                     | Show session statistics   |

#### F6.4: FSRS Parameters (Future)

Reserved section for future FSRS parameter customization:

| Parameter         | Type   | Default | Description                      |
| ----------------- | ------ | ------- | -------------------------------- |
| Request Retention | Slider | 0.9     | Target retention rate (0.7-0.97) |
| Maximum Interval  | Number | 36500   | Maximum days between reviews     |
| Enable Fuzz       | Toggle | true    | Add randomness to intervals      |

### F7: Commands

All commands registered with Obsidian for hotkey assignment:

| Command ID            | Name                 | Description                      |
| --------------------- | -------------------- | -------------------------------- |
| `fsrs:start-review`   | Start Review Session | Begin reviewing due notes        |
| `fsrs:open-dashboard` | Open Dashboard       | Show statistics modal            |
| `fsrs:rate-again`     | Rate: Again          | Rate current note as Again       |
| `fsrs:rate-hard`      | Rate: Hard           | Rate current note as Hard        |
| `fsrs:rate-good`      | Rate: Good           | Rate current note as Good        |
| `fsrs:rate-easy`      | Rate: Easy           | Rate current note as Easy        |
| `fsrs:skip-note`      | Skip Note            | Move to next note without rating |
| `fsrs:previous-note`  | Previous Note        | Go back to previous note         |
| `fsrs:undo-rating`    | Undo Last Rating     | Reverse the last rating          |
| `fsrs:end-session`    | End Review Session   | Stop current review session      |
| `fsrs:manage-queues`  | Manage Queues        | Open queue management            |
| `fsrs:add-to-queue`   | Add Note to Queue    | Add current note to a queue      |

## Technical Architecture

### Technology Stack

| Component    | Technology               | Rationale                           |
| ------------ | ------------------------ | ----------------------------------- |
| Language     | TypeScript               | Type safety, Obsidian standard      |
| Algorithm    | ts-fsrs                  | FSRS v6 implementation, MIT license |
| UI Framework | Native Obsidian          | Consistency, no extra dependencies  |
| Data Storage | Obsidian Plugin Data API | Standard approach, automatic sync   |
| Build        | esbuild                  | Obsidian sample plugin standard     |

### Module Structure

```
src/
├── main.ts                 # Plugin lifecycle only (~50 lines)
├── types.ts                # All TypeScript interfaces
├── constants.ts            # Default values, constants
│
├── fsrs/
│   ├── index.ts            # FSRS wrapper and exports
│   ├── scheduler.ts        # Scheduling logic using ts-fsrs
│   ├── card-manager.ts     # Card CRUD operations
│   └── review-processor.ts # Process ratings, update cards
│
├── queues/
│   ├── index.ts            # Queue management exports
│   ├── queue-manager.ts    # Queue CRUD operations
│   ├── queue-builder.ts    # Build queue from criteria
│   └── note-resolver.ts    # Resolve notes from criteria
│
├── criteria/
│   ├── index.ts            # Criteria system exports
│   ├── base-criterion.ts   # Abstract criterion interface
│   ├── folder-criterion.ts # Folder-based selection
│   ├── tag-criterion.ts    # Tag-based selection
│   ├── exclusion-criteria/ # Exclusion implementations
│   │   ├── name-exclusion.ts
│   │   ├── tag-exclusion.ts
│   │   └── property-exclusion.ts
│   └── criterion-registry.ts # Register/discover criteria
│
├── review/
│   ├── index.ts            # Review system exports
│   ├── session-manager.ts  # Review session state
│   ├── review-queue.ts     # Queue ordering, navigation
│   └── undo-manager.ts     # Undo functionality
│
├── ui/
│   ├── index.ts            # UI exports
│   ├── sidebar/
│   │   ├── review-sidebar.ts   # Main sidebar view
│   │   ├── rating-buttons.ts   # Rating UI component
│   │   ├── note-stats.ts       # Note statistics display
│   │   └── session-stats.ts    # Session statistics display
│   ├── dashboard/
│   │   ├── dashboard-modal.ts  # Main dashboard modal
│   │   ├── overview-cards.ts   # Summary cards
│   │   ├── heatmap.ts          # Calendar heatmap
│   │   ├── charts.ts           # Distribution charts
│   │   └── note-table.ts       # Sortable note table
│   ├── settings/
│   │   ├── settings-tab.ts     # Main settings tab
│   │   └── queue-settings.ts   # Queue management UI
│   └── modals/
│       ├── queue-modal.ts      # Queue create/edit modal
│       └── confirm-modal.ts    # Confirmation dialogs
│
├── data/
│   ├── index.ts            # Data layer exports
│   ├── data-store.ts       # Central data management
│   ├── migrations.ts       # Data schema migrations
│   └── backup.ts           # Export/import functionality
│
├── sync/
│   ├── index.ts            # Sync exports
│   ├── note-watcher.ts     # Watch for note changes
│   └── orphan-detector.ts  # Detect deleted/moved notes
│
├── commands/
│   ├── index.ts            # Command registration
│   └── handlers.ts         # Command implementations
│
└── utils/
    ├── date-utils.ts       # Date formatting, calculations
    ├── note-utils.ts       # Note path/metadata helpers
    └── stats-calculator.ts # Statistics calculations
```

### Class Diagram (Key Components)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   FSRSPlugin    │────▶│   DataStore     │────▶│   QueueManager  │
│   (main.ts)     │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │              ┌────────┴────────┐              │
         │              │                 │              │
         ▼              ▼                 ▼              ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ SessionManager  │  │ CardManager │  │  Scheduler  │  │NoteResolver │
│                 │  │             │  │  (ts-fsrs)  │  │             │
└────────┬────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         │
         ▼
┌─────────────────┐
│  ReviewSidebar  │
│                 │
└─────────────────┘
```

## Data Model

### Storage Location

All data stored in: `<vault>/.obsidian/plugins/obsidian-fsrs-atomic/data.json`

### Schema

```typescript
interface PluginData {
  version: number; // Schema version for migrations
  settings: PluginSettings; // User settings
  queues: Queue[]; // All queues
  cards: Map<string, CardData>; // Note path → card data
  reviews: ReviewLog[]; // Full review history
  orphans: OrphanRecord[]; // Deleted/moved notes pending resolution
}

interface PluginSettings {
  // Selection
  selectionMode: "folder" | "tag";
  trackedFolders: string[];
  trackedTags: string[];

  // Exclusions
  excludedNoteNames: string[];
  excludedTags: string[];
  excludedProperties: PropertyMatch[];

  // Review
  queueOrder: QueueOrderStrategy;
  showNoteStats: boolean;
  showPredictedIntervals: boolean;
  showSessionStats: boolean;

  // UI
  sidebarPosition: "left" | "right";

  // FSRS (future)
  fsrsParams?: Partial<FSRSParameters>;
}

interface PropertyMatch {
  key: string;
  value: string;
  operator: "equals" | "contains" | "exists";
}

interface Queue {
  id: string; // Unique identifier
  name: string; // Display name
  createdAt: string; // ISO date string
  criteria: SelectionCriteria; // What notes belong here
  stats: QueueStats; // Cached statistics
}

interface SelectionCriteria {
  type: "folder" | "tag" | "custom";
  folders?: string[];
  tags?: string[];
  customCriteria?: CriterionConfig[];
}

interface QueueStats {
  totalNotes: number;
  newNotes: number;
  dueNotes: number;
  reviewedToday: number;
  lastUpdated: string;
}

interface CardData {
  notePath: string; // Path to note file
  noteId: string; // Stable identifier (for renames)

  // Per-queue scheduling
  schedules: Map<string, CardSchedule>; // Queue ID → schedule

  createdAt: string; // When added to system
  lastModified: string; // Note's last modification
}

interface CardSchedule {
  // FSRS Card fields
  due: string; // ISO date string
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview: string | null;

  // Additional tracking
  addedToQueueAt: string;
}

interface ReviewLog {
  id: string; // Unique review ID
  cardPath: string; // Note path
  queueId: string; // Which queue

  // FSRS ReviewLog fields
  rating: Rating; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: CardState; // State at time of review
  due: string; // Scheduled due date
  stability: number; // Pre-review stability
  difficulty: number; // Pre-review difficulty
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  review: string; // ISO timestamp of review

  // Session tracking
  sessionId: string;
  undone: boolean; // True if this was undone
}

interface OrphanRecord {
  id: string;
  originalPath: string;
  cardData: CardData;
  detectedAt: string;
  status: "pending" | "resolved" | "removed";
  resolution?: {
    action: "relink" | "remove";
    newPath?: string;
    resolvedAt: string;
  };
}

type CardState = 0 | 1 | 2 | 3; // New, Learning, Review, Relearning
type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
type QueueOrderStrategy =
  | "due-overdue-first"
  | "due-chronological"
  | "random"
  | "difficulty-desc"
  | "difficulty-asc";
```

### Data Size Considerations

| Scale                 | Estimated Size | Notes                 |
| --------------------- | -------------- | --------------------- |
| 100 notes, 1 year     | ~500 KB        | Comfortable           |
| 1,000 notes, 1 year   | ~5 MB          | Acceptable            |
| 10,000 notes, 5 years | ~100 MB        | May need optimization |

For large vaults, consider:

- Archiving old review logs
- Lazy loading of historical data
- IndexedDB for review history (future)

## User Interface Specifications

### Review Sidebar Mockup

```
┌────────────────────────────────────┐
│  FSRS Review                    ≡  │
├────────────────────────────────────┤
│  Queue: Computer Science           │
│  Progress: 5 of 23                 │
│  ━━━━━━━━━░░░░░░░░░░░░░░ 22%       │
├────────────────────────────────────┤
│                                    │
│  ┌────────────────────────────┐    │
│  │         😫 Again           │     │
│  │        (10 minutes)        │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │         🤔 Hard            │   │
│  │         (2 days)           │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │         👍 Good            │   │
│  │         (5 days)           │   │
│  └────────────────────────────┘   │
│  ┌────────────────────────────┐   │
│  │         🌟 Easy            │   │
│  │        (12 days)           │   │
│  └────────────────────────────┘   │
│                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐      │
│  │ Skip │ │ Back │ │ Undo │      │
│  └──────┘ └──────┘ └──────┘      │
├────────────────────────────────────┤
│  ▼ Note Stats                      │
│  ──────────────────────            │
│  State:         Review             │
│  Stability:     45.2 days          │
│  Difficulty:    4.8                │
│  Retrievability: 87%               │
│  Reviews:       12                 │
│  Lapses:        2                  │
├────────────────────────────────────┤
│  ▼ Session Stats                   │
│  ──────────────────────            │
│  Reviewed: 5                       │
│  Again: 1 | Hard: 1 | Good: 2 | Easy: 1 │
├────────────────────────────────────┤
│  ┌────────────────────────────┐   │
│  │       End Session          │   │
│  └────────────────────────────┘   │
└────────────────────────────────────┘
```

### Dashboard Modal Mockup

```
┌──────────────────────────────────────────────────────────────────────┐
│  FSRS Dashboard                                                   ✕  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │   247    │ │    23    │ │     5    │ │    12    │ │    45    │    │
│  │  Total   │ │ Due Today│ │ Overdue  │ │   New    │ │ Next 7d  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Review Activity (Last 12 Months)                               │ │
│  │  ░░▓▓░░▓▓▓░░▓▓░░░▓▓▓░▓░░░░▓░░░▓▓░░▓░░░▓▓▓░░▓▓░░░▓░░░░▓▓▓▓▓▓     │ │
│  │  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec     │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────┐ ┌───────────────────────────────────┐ │
│  │  Retention                │ │  Forecast (30 days)               │ │
│  │  ──────────────           │ │       ╭─────╮                     │ │
│  │  Target:    90%           │ │      ╱      ╲    ╭──              │ │
│  │  Estimated: 88%           │ │  ───╯        ╰──╯                 │ │
│  │  True:      91%           │ │  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔     │ │
│  │                           │ │  Today            +15d      +30d  │ │
│  │  🔥 Streak: 15 days       │ │                                    ││
│  │  🏆 Best:   42 days       │ │                                    ││
│  └───────────────────────────┘ └───────────────────────────────────┘│
│                                                                      │
│  ┌───────────────────────────┐ ┌───────────────────────────────────┐│
│  │  Notes by State           │ │  Notes by Difficulty              ││
│  │     ╭────╮                │ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                 ││
│  │    ╱ 180 ╲ Review         │ │  ▓▓▓▓▓▓▓▓▓▓▓▓                    ││
│  │   │  45  │ Learning       │ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            ││
│  │    ╲ 12 ╱  New            │ │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               ││
│  │     ╰──╯   Relearning: 10 │ │  1  2  3  4  5  6  7  8  9  10   ││
│  └───────────────────────────┘ └───────────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  All Notes                                    🔍 Filter...      ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │  Note          │ Queue(s)   │ State   │ Due      │ Stability   ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │  Concept A     │ CS, Math   │ Review  │ Today    │ 45.2 days   ││
│  │  Concept B     │ CS         │ New     │ -        │ -           ││
│  │  Concept C     │ Philosophy │ Review  │ Tomorrow │ 12.5 days   ││
│  │  ...           │            │         │          │             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│         ┌────────────────────────────────────────┐                  │
│         │         Start Review Session            │                  │
│         └────────────────────────────────────────┘                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Settings Tab Mockup

```
┌──────────────────────────────────────────────────────────────────────┐
│  FSRS for Atomic Notes                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  NOTE SELECTION                                                      │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Selection Mode                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Folder-based                                                  ▼ ││
│  └─────────────────────────────────────────────────────────────────┘│
│  Choose how notes are selected for spaced repetition.               │
│                                                                      │
│  Tracked Folders                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Atomic Notes                                              [✕]   ││
│  │ Concepts                                                  [✕]   ││
│  └─────────────────────────────────────────────────────────────────┘│
│  [+ Add folder]                                                      │
│                                                                      │
│  EXCLUSION RULES                                                     │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Excluded Tags                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ #template                                                 [✕]   ││
│  │ #wip                                                      [✕]   ││
│  └─────────────────────────────────────────────────────────────────┘│
│  [+ Add tag]                                                         │
│                                                                      │
│  Excluded Note Names                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ (empty)                                                         ││
│  └─────────────────────────────────────────────────────────────────┘│
│  [+ Add note name]                                                   │
│                                                                      │
│  QUEUE MANAGEMENT                                                    │
│  ──────────────────────────────────────────────────────────────────  │
│  [Manage Queues...]                                                  │
│                                                                      │
│  REVIEW SETTINGS                                                     │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Queue Order                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Due Date (Overdue First) - Recommended                        ▼ ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  ┌────┐ Show note statistics in sidebar                             │
│  │ ✓  │                                                              │
│  └────┘                                                              │
│                                                                      │
│  ┌────┐ Show predicted intervals                                    │
│  │ ✓  │                                                              │
│  └────┘                                                              │
│                                                                      │
│  INTERFACE                                                           │
│  ──────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Sidebar Position                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Right                                                         ▼ ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## User Flows

### Flow 1: First-Time Setup

```
┌─────────────────┐
│ Install Plugin  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Open Settings   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Choose Selection Mode       │
│ (Folder or Tag)             │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Configure Tracked           │
│ Folders/Tags                │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ (Optional) Add Exclusions   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Create First Queue          │
│ (e.g., "Main")              │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ System scans vault,         │
│ creates cards for matching  │
│ notes (all as "New")        │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Ready! "X notes added       │
│ to queue"                   │
└─────────────────────────────┘
```

### Flow 2: Review Session

```
┌────────────────────────────────────┐
│ User: "Start Review Session"       │
│ (Command / Dashboard / Ribbon)     │
└─────────────────┬──────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Select Queue   │ (if multiple queues)
         └───────┬────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ Build review queue:                │
│ 1. Get due notes from queue        │
│ 2. Apply ordering strategy         │
│ 3. Load first note                 │
└─────────────────┬──────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│ Note opens in main pane            │
│ Sidebar shows review controls      │
└─────────────────┬──────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│ User rates   │   │ User navigates   │
│ (1-4)        │   │ away from note   │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ FSRS updates │   │ Sidebar shows    │
│ card schedule│   │ "Bring Back"     │
│ Save review  │   │ button           │
│ log          │   └────────┬─────────┘
└──────┬───────┘            │
       │           ┌────────┘
       ▼           ▼
┌────────────────────────────────────┐
│ Load next due note                 │
│ (or "Session Complete" if done)    │
└────────────────────────────────────┘
```

### Flow 3: Orphan Resolution

```
┌────────────────────────────────────┐
│ Note is deleted or renamed         │
│ (detected on next plugin load      │
│  or periodic check)                │
└─────────────────┬──────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│ Create OrphanRecord                │
│ Store original card data           │
└─────────────────┬──────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│ Show notification:                 │
│ "Note 'X' was moved/deleted.       │
│  [Resolve] [Dismiss]"              │
└─────────────────┬──────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│ User clicks  │   │ User clicks      │
│ "Resolve"    │   │ "Dismiss"        │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Show modal:  │   │ Orphan remains   │
│ - Remove     │   │ in pending state │
│ - Re-link    │   │ (can resolve     │
│   (select    │   │  later)          │
│   note)      │   └──────────────────┘
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────┐
│ If "Remove": Delete card data      │
│ If "Re-link": Update path,         │
│               preserve history     │
└────────────────────────────────────┘
```

### Flow 4: Queue Management

```
┌────────────────────────────────────┐
│ User: "Manage Queues"              │
│ (Settings or Command)              │
└─────────────────┬──────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│ Queue Management Modal             │
│ ┌────────────────────────────────┐ │
│ │ Computer Science    [Edit][Del]│ │
│ │ Philosophy          [Edit][Del]│ │
│ │ Languages           [Edit][Del]│ │
│ └────────────────────────────────┘ │
│        [+ Create Queue]            │
└─────────────────┬──────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│ Create Queue │   │ Edit Queue       │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    ▼
┌────────────────────────────────────┐
│ Queue Editor Modal                 │
│ - Name                             │
│ - Selection criteria               │
│   (inherits from global or custom) │
└─────────────────┬──────────────────┘
                  │
                  ▼
┌────────────────────────────────────┐
│ Queue created/updated              │
│ Notes matched and added            │
└────────────────────────────────────┘
```

---

## Edge Cases & Error Handling

### E1: Note Lifecycle Events

| Event                            | Detection                    | Handling                                   |
| -------------------------------- | ---------------------------- | ------------------------------------------ |
| Note deleted                     | Periodic scan + vault events | Create orphan record, notify user          |
| Note renamed                     | Vault rename event           | Auto-update path if possible, else orphan  |
| Note moved                       | Vault rename event           | Auto-update path                           |
| Note loses qualifying tag        | Metadata cache update        | Notify user, keep card (don't auto-remove) |
| Note moved out of tracked folder | Periodic scan                | Notify user, keep card                     |

### E2: Data Integrity

| Issue               | Prevention                   | Recovery                                  |
| ------------------- | ---------------------------- | ----------------------------------------- |
| Corrupted data.json | JSON validation on load      | Backup before writes, restore from backup |
| Missing review logs | Referential integrity checks | Reconstruct from card state               |
| Duplicate cards     | Unique path constraint       | Merge or prompt user                      |
| Invalid FSRS state  | Validate on load             | Reset to defaults with notification       |

### E3: Concurrent Access

| Scenario                         | Handling                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| Plugin loaded in multiple vaults | Each vault has independent data                            |
| Vault synced across devices      | Obsidian's sync handles data.json; potential for conflicts |
| Sync conflict in data.json       | Use last-write-wins; future: implement merge strategy      |

### E4: Performance Edge Cases

| Scenario                      | Mitigation                      |
| ----------------------------- | ------------------------------- |
| Very large vault (10k+ notes) | Lazy load cards, paginate table |
| Many review logs (100k+)      | Archive old logs, index recent  |
| Complex exclusion criteria    | Cache evaluation results        |
| Frequent file system events   | Debounce processing             |

---

## Future Considerations

### Phase 2 Features (Post-Launch)

| Feature                            | Priority | Complexity |
| ---------------------------------- | -------- | ---------- |
| FSRS parameter customization       | High     | Medium     |
| Suspend/Bury notes                 | Medium   | Low        |
| Export review data (for optimizer) | Medium   | Low        |
| Keyboard shortcuts customization   | Medium   | Low        |
| Mobile-specific optimizations      | Medium   | Medium     |
| Per-queue FSRS parameters          | Low      | Medium     |

### Phase 3 Features (Future)

| Feature                           | Priority | Complexity |
| --------------------------------- | -------- | ---------- |
| Anki import/export                | Low      | High       |
| Advanced analytics (ML insights)  | Low      | High       |
| Community sharing of parameters   | Low      | Medium     |
| Spaced writing prompts            | Low      | Medium     |
| Integration API for other plugins | Low      | Medium     |

### Architectural Extensibility Points

1. **Criteria System**: Abstract interface allows new selection criteria
2. **Queue Types**: Can add specialized queue behaviors
3. **Scheduler**: Wrapper around ts-fsrs allows future algorithm swaps
4. **UI Components**: Modular components can be recombined
5. **Storage**: Abstraction allows migration to IndexedDB if needed

---

## Success Metrics

### Adoption Metrics

| Metric                   | Target (6 months) |
| ------------------------ | ----------------- |
| Downloads                | 5,000+            |
| Active users (weekly)    | 1,000+            |
| GitHub stars             | 200+              |
| Community plugin listing | Yes               |

### Quality Metrics

| Metric              | Target             |
| ------------------- | ------------------ |
| Crash rate          | < 0.1% of sessions |
| Data loss incidents | 0                  |
| Average rating      | 4.5+ stars         |
| Open critical bugs  | < 3                |

### Engagement Metrics

| Metric                                | Healthy Range  |
| ------------------------------------- | -------------- |
| Reviews per active user per week      | 20-100         |
| Session completion rate               | > 70%          |
| Retention (user returns after 1 week) | > 50%          |
| Feature usage (dashboard views)       | > 30% of users |

---

## Development Phases

### Phase 1: Core Foundation (MVP)

**Goal**: Basic working spaced repetition with FSRS

**Deliverables**:

- [ ] Plugin skeleton with proper module structure
- [ ] ts-fsrs integration
- [ ] Single queue support
- [ ] Basic note selection (folder-based)
- [ ] Review sidebar with rating buttons
- [ ] Data persistence
- [ ] Basic settings tab

**Definition of Done**: User can configure a folder, review notes, and have schedules persist across sessions.

### Phase 2: Full Feature Set

**Goal**: Complete feature implementation

**Deliverables**:

- [ ] Multiple queue support
- [ ] Tag-based selection mode
- [ ] Full exclusion criteria system
- [ ] Complete sidebar (all stats, predictions)
- [ ] Dashboard modal with all visualizations
- [ ] Undo functionality
- [ ] Orphan detection and resolution
- [ ] All commands registered

**Definition of Done**: All features in this PRD are functional.

### Phase 3: Polish & Release

**Goal**: Production-ready quality

**Deliverables**:

- [ ] Performance optimization
- [ ] Error handling and recovery
- [ ] User documentation
- [ ] Beta testing (BRAT)
- [ ] Bug fixes
- [ ] Community plugin submission

**Definition of Done**: Plugin approved for community plugins directory.

### Phase 4: Post-Launch

**Goal**: Iterate based on feedback

**Deliverables**:

- [ ] FSRS parameter customization
- [ ] Suspend/Bury feature
- [ ] Mobile testing and fixes
- [ ] Export functionality
- [ ] Performance improvements for large vaults

---

## Appendix

### A1: FSRS Algorithm Summary

FSRS uses three core variables:

| Variable           | Description                                       | Range     |
| ------------------ | ------------------------------------------------- | --------- |
| Difficulty (D)     | Inherent complexity of material                   | 1-10      |
| Stability (S)      | Days for retrievability to decay from 100% to 90% | 0.1-36500 |
| Retrievability (R) | Probability of successful recall                  | 0-1       |

**Scheduling Flow**:

1. User reviews note
2. User provides rating (Again/Hard/Good/Easy)
3. FSRS calculates new D, S based on rating and elapsed time
4. New due date = now + interval (derived from S and target R)

**Key Formula** (Forgetting Curve):

```
R(t, S) = (1 + FACTOR × t / (9 × S))^DECAY
```

Where:

- t = elapsed days since last review
- S = stability
- FACTOR and DECAY are constants

### A2: ts-fsrs Key APIs

```typescript
// Create FSRS instance
const f = fsrs();

// Create new card
const card = createEmptyCard();

// Get all possible scheduling outcomes
const outcomes = f.repeat(card, new Date());

// Get outcome for specific rating
const result = f.next(card, new Date(), Rating.Good);

// Access updated card and review log
const updatedCard = result.card;
const reviewLog = result.log;

// Rollback a rating (for undo)
const previousCard = f.rollback(updatedCard, reviewLog);

// Get current retrievability
const retrievability = f.get_retrievability(card, new Date());
```

### A3: Obsidian API Key Points

**Data Storage**:

```typescript
// Save plugin data
await this.saveData(data);

// Load plugin data
const data = await this.loadData();
```

**Vault Events**:

```typescript
// Watch for file changes
this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {}));
this.registerEvent(this.app.vault.on("delete", (file) => {}));
```

**Metadata Cache**:

```typescript
// Get frontmatter and tags
const cache = this.app.metadataCache.getFileCache(file);
const frontmatter = cache?.frontmatter;
const tags = cache?.tags;
```

### A4: Glossary

| Term           | Definition                                                        |
| -------------- | ----------------------------------------------------------------- |
| Atomic Note    | A note containing a single, self-contained idea                   |
| Card           | Internal representation of a note in the spaced repetition system |
| Deck/Queue     | A collection of cards reviewed together                           |
| FSRS           | Free Spaced Repetition Scheduler algorithm                        |
| Lapse          | An instance of rating "Again" (forgetting)                        |
| Orphan         | A card whose corresponding note no longer exists                  |
| Retrievability | Probability of successful recall at a given moment                |
| Stability      | Time for retrievability to decay from 100% to 90%                 |
| State          | Card phase: New, Learning, Review, or Relearning                  |

---

_Document created: January 31, 2026_
_Last updated: January 31, 2026_
