/**
 * Core type definitions for FSRS for Atomic Notes plugin
 * All TypeScript interfaces and types are centralized here for maintainability
 */

import type { TFile, CachedMetadata } from "obsidian";

// Re-export ts-fsrs types for convenience
export { Rating, State } from "ts-fsrs";
export type { Card, FSRSParameters, ReviewLog as FSRSReviewLogType } from "ts-fsrs";

// ============================================================================
// Plugin Data Types
// ============================================================================

/**
 * Backup entry for recovery (stored in PluginData.backups)
 */
export interface BackupEntry {
	/** Unique backup ID */
	id: string;
	/** Timestamp when backup was created */
	timestamp: number;
	/** Full plugin data snapshot (without backups array to avoid recursion) */
	data: Omit<PluginData, "backups">;
}

/**
 * Root data structure persisted in data.json
 */
export interface PluginData {
	/** Schema version for migrations */
	version: number;
	/** User settings */
	settings: PluginSettings;
	/** All queues */
	queues: Queue[];
	/** Note path → card data mapping (stored as Record for JSON serialization) */
	cards: Record<string, CardData>;
	/** Full review history */
	reviews: ReviewLog[];
	/** Deleted/moved notes pending resolution */
	orphans: OrphanRecord[];
	/** Last N backups for recovery (optional, managed by BackupManager) */
	backups?: BackupEntry[];
}

/**
 * User-configurable settings
 */
export interface PluginSettings {
	// Note Selection
	/** Primary selection mode */
	selectionMode: SelectionMode;
	/** Folders to include (folder mode) */
	trackedFolders: string[];
	/** Tags to include (tag mode) */
	trackedTags: string[];

	// Exclusions
	/** Exact note names to exclude */
	excludedNoteNames: string[];
	/** Tags that exclude notes */
	excludedTags: string[];
	/** Frontmatter properties that exclude notes */
	excludedProperties: PropertyMatch[];

	// Review
	/** How to order review queue */
	queueOrder: QueueOrderStrategy;
	/** New cards per day (used by mixed-anki) */
	newCardsPerDay: number;
	/** Max reviews per day (used by mixed-anki and load-balancing) */
	maxReviewsPerDay: number;
	/** Show stats in sidebar */
	showNoteStats: boolean;
	/** Show interval predictions */
	showPredictedIntervals: boolean;
	/** Show session statistics */
	showSessionStats: boolean;

	// UI
	/** Left or Right sidebar */
	sidebarPosition: SidebarPosition;

	// FSRS Parameters (future extensibility)
	fsrsParams?: Partial<FSRSParams>;
}

export type SelectionMode = "folder" | "tag";
export type SidebarPosition = "left" | "right";
export type QueueOrderStrategy =
	| "mixed-anki"
	| "due-overdue-first"
	| "due-chronological"
	| "state-priority"
	| "retrievability-asc"
	| "load-balancing"
	| "random"
	| "difficulty-desc"
	| "difficulty-asc";

/**
 * FSRS algorithm parameters
 */
export interface FSRSParams {
	/** Target retention rate (0.7-0.97) */
	requestRetention: number;
	/** Maximum days between reviews */
	maximumInterval: number;
	/** Add randomness to intervals */
	enableFuzz: boolean;
}

/**
 * Frontmatter property matching for exclusions
 */
export interface PropertyMatch {
	/** Property key */
	key: string;
	/** Value to match */
	value: string;
	/** Match operator */
	operator: PropertyMatchOperator;
}

export type PropertyMatchOperator = "equals" | "contains" | "exists";

// ============================================================================
// Queue Types
// ============================================================================

/**
 * A named collection of notes for review
 */
export interface Queue {
	/** Unique identifier */
	id: string;
	/** Display name */
	name: string;
	/** ISO date string when created */
	createdAt: string;
	/** What notes belong here */
	criteria: SelectionCriteria;
	/** Cached statistics */
	stats: QueueStats;
}

/**
 * Criteria for selecting notes into a queue
 */
export interface SelectionCriteria {
	/** Criteria type */
	type: SelectionCriteriaType;
	/** Folders to include (folder mode) */
	folders?: string[];
	/** Tags to include (tag mode) */
	tags?: string[];
	/** Custom criteria configurations (future extensibility) */
	customCriteria?: CriterionConfig[];
}

export type SelectionCriteriaType = "folder" | "tag" | "custom";

/**
 * Configuration for a custom criterion (future extensibility)
 */
export interface CriterionConfig {
	/** Criterion type identifier */
	type: string;
	/** Criterion-specific parameters */
	params: Record<string, unknown>;
}

/**
 * Queue statistics (cached for performance)
 */
export interface QueueStats {
	/** Total notes in queue */
	totalNotes: number;
	/** Notes never reviewed */
	newNotes: number;
	/** Notes due for review today */
	dueNotes: number;
	/** Notes reviewed today */
	reviewedToday: number;
	/** ISO date string of last update */
	lastUpdated: string;
}

// ============================================================================
// Card Types
// ============================================================================

/**
 * Card data for a note in the spaced repetition system
 */
export interface CardData {
	/** Path to note file */
	notePath: string;
	/** Stable identifier for tracking renames (future) */
	noteId: string;
	/** Per-queue scheduling (Queue ID → schedule) */
	schedules: Record<string, CardSchedule>;
	/** ISO date string when added to system */
	createdAt: string;
	/** Note's last modification ISO date string */
	lastModified: string;
}

/**
 * Scheduling data for a card within a specific queue
 */
export interface CardSchedule {
	// FSRS Card fields
	/** ISO date string for next due date */
	due: string;
	/** Current stability in days */
	stability: number;
	/** Difficulty rating (1-10) */
	difficulty: number;
	/** Days elapsed since last review */
	elapsedDays: number;
	/** Days scheduled for this interval */
	scheduledDays: number;
	/** Total review count */
	reps: number;
	/** Number of "Again" ratings */
	lapses: number;
	/** Card state: 0=New, 1=Learning, 2=Review, 3=Relearning */
	state: CardState;
	/** ISO date string of last review, null if never reviewed */
	lastReview: string | null;

	// Additional tracking
	/** ISO date string when added to this queue */
	addedToQueueAt: string;
}

/** Card state enum matching FSRS State */
export type CardState = 0 | 1 | 2 | 3;

/** State labels for display */
export const CardStateLabels: Record<CardState, string> = {
	0: "New",
	1: "Learning",
	2: "Review",
	3: "Relearning",
};

// ============================================================================
// Review Types
// ============================================================================

/**
 * Log entry for a single review event
 */
export interface ReviewLog {
	/** Unique review ID */
	id: string;
	/** Note path */
	cardPath: string;
	/** Which queue this review was in */
	queueId: string;

	// FSRS ReviewLog fields
	/** Rating: 1=Again, 2=Hard, 3=Good, 4=Easy */
	rating: RatingValue;
	/** State at time of review */
	state: CardState;
	/** Scheduled due date (ISO string) */
	due: string;
	/** Pre-review stability */
	stability: number;
	/** Pre-review difficulty */
	difficulty: number;
	/** Days elapsed since last review */
	elapsedDays: number;
	/** Previous elapsed days */
	lastElapsedDays: number;
	/** Scheduled days for this interval */
	scheduledDays: number;
	/** ISO timestamp of review */
	review: string;

	// Session tracking
	/** Session this review belongs to */
	sessionId: string;
	/** True if this review was undone */
	undone: boolean;
}

/** Rating value matching FSRS Rating enum values */
export type RatingValue = 1 | 2 | 3 | 4;

/** Rating labels for display */
export const RatingLabels: Record<RatingValue, string> = {
	1: "Again",
	2: "Hard",
	3: "Good",
	4: "Easy",
};

// ============================================================================
// Orphan Types
// ============================================================================

/**
 * Record of a note that was deleted or moved
 */
export interface OrphanRecord {
	/** Unique identifier */
	id: string;
	/** Original note path */
	originalPath: string;
	/** Card data at time of orphaning */
	cardData: CardData;
	/** ISO date string when detected */
	detectedAt: string;
	/** Current resolution status */
	status: OrphanStatus;
	/** Resolution details (if resolved) */
	resolution?: OrphanResolution;
}

export type OrphanStatus = "pending" | "resolved" | "removed";

export interface OrphanResolution {
	/** How the orphan was resolved */
	action: OrphanResolutionAction;
	/** New path if relinked */
	newPath?: string;
	/** ISO date string when resolved */
	resolvedAt: string;
}

export type OrphanResolutionAction = "relink" | "remove";

// ============================================================================
// Session Types
// ============================================================================

/**
 * State of an active review session
 */
export interface SessionState {
	/** Queue being reviewed */
	queueId: string;
	/** Current position in review list */
	currentIndex: number;
	/** Total notes in this session */
	totalNotes: number;
	/** Path of current note */
	currentNotePath: string;
	/** Number of notes reviewed so far */
	reviewed: number;
	/** Count of each rating given */
	ratings: Record<RatingValue, number>;
	/** Unique session identifier */
	sessionId: string;
	/** When session started */
	startedAt: Date;
	/** Paths of notes to review (in order) */
	reviewQueue: string[];
	/** Stack of completed reviews for undo */
	history: SessionHistoryEntry[];
}

/**
 * Entry in session history for undo support
 */
export interface SessionHistoryEntry {
	/** Note path that was reviewed */
	notePath: string;
	/** Rating given */
	rating: RatingValue;
	/** Review log ID */
	reviewLogId: string;
	/** Card schedule before the review (for rollback) */
	previousSchedule: CardSchedule;
}

/**
 * Lightweight session snapshot for persistence across restarts.
 * History/undo data is intentionally omitted — not critical for resume.
 */
export interface PersistedSession {
	queueId: string;
	sessionId: string;
	currentIndex: number;
	reviewed: number;
	ratings: Record<RatingValue, number>;
	reviewQueue: string[];
	startedAt: string; // ISO string (Date is not serializable)
}

// ============================================================================
// Selection Criterion Interface
// ============================================================================

/**
 * Interface for note selection criteria (extensible system)
 */
export interface SelectionCriterion {
	/** Unique identifier for this criterion type */
	id: string;
	/** Whether this is an inclusion or exclusion criterion */
	type: "include" | "exclude";
	/** Evaluate whether a note matches this criterion */
	evaluate(file: TFile, metadata: CachedMetadata | null): boolean;
}

// ============================================================================
// Sync Types
// ============================================================================

/**
 * Result of syncing a queue with current vault state
 */
export interface SyncResult {
	/** Note paths added to queue */
	added: string[];
	/** Note paths removed from queue */
	removed: string[];
	/** Number of unchanged notes */
	unchanged: number;
}

// ============================================================================
// Scheduling Types
// ============================================================================

/**
 * Result of rating a card
 */
export interface RatingResult {
	/** Updated card data */
	card: CardSchedule;
	/** Review log entry */
	log: ReviewLog;
}

/**
 * Scheduling preview for all ratings
 */
export interface SchedulingPreview {
	/** Preview for each rating */
	[key: number]: {
		/** Next due date */
		due: Date;
		/** Interval in days */
		interval: number;
		/** Formatted interval string (e.g., "5 days", "10 minutes") */
		intervalText: string;
	};
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Events emitted by the plugin
 */
export interface PluginEvents {
	/** Emitted when a review session starts */
	"session-start": { queueId: string; noteCount: number };
	/** Emitted when a review session ends */
	"session-end": { queueId: string; reviewed: number; ratings: Record<RatingValue, number> };
	/** Emitted when a note is rated */
	"note-rated": { notePath: string; queueId: string; rating: RatingValue };
	/** Emitted when queue is synced */
	"queue-synced": { queueId: string; result: SyncResult };
	/** Emitted when settings change */
	"settings-changed": { settings: PluginSettings };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type for partial updates
 */
export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
