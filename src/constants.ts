/**
 * Constants and default values for FSRS for Atomic Notes plugin
 */

import type { PluginSettings, PluginData, QueueStats, FSRSParams, RatingValue } from "./types";

// ============================================================================
// Plugin Metadata
// ============================================================================

/** Current schema version for data migrations */
export const CURRENT_SCHEMA_VERSION = 1;

/** Plugin ID (must match manifest.json) */
export const PLUGIN_ID = "obsidian-fsrs-atomic";

/** View type for the review sidebar */
export const REVIEW_SIDEBAR_VIEW_TYPE = "fsrs-review-sidebar";

/** View display name */
export const REVIEW_SIDEBAR_DISPLAY_NAME = "FSRS Review";

// ============================================================================
// Default Settings
// ============================================================================

/** Default FSRS parameters */
export const DEFAULT_FSRS_PARAMS: FSRSParams = {
	requestRetention: 0.9,
	maximumInterval: 36500,
	enableFuzz: true,
};

/** Default plugin settings */
export const DEFAULT_SETTINGS: PluginSettings = {
	// Note Selection
	selectionMode: "folder",
	trackedFolders: [],
	trackedTags: [],

	// Exclusions
	excludedNoteNames: [],
	excludedTags: [],
	excludedProperties: [],

	// Review
	queueOrder: "mixed-anki",
	newCardsPerDay: 20,
	maxReviewsPerDay: 200,
	showNoteStats: true,
	showPredictedIntervals: true,
	showSessionStats: true,

	// UI
	sidebarPosition: "right",

	// FSRS (use defaults)
	fsrsParams: undefined,
};

/** Default queue statistics */
export const DEFAULT_QUEUE_STATS: QueueStats = {
	totalNotes: 0,
	newNotes: 0,
	dueNotes: 0,
	reviewedToday: 0,
	lastUpdated: new Date().toISOString(),
};

/** Maximum number of backups to keep for recovery */
export const MAX_BACKUPS = 5;

/** Default plugin data (fresh installation) */
export const DEFAULT_PLUGIN_DATA: PluginData = {
	version: CURRENT_SCHEMA_VERSION,
	settings: DEFAULT_SETTINGS,
	queues: [],
	cards: {},
	reviews: [],
	orphans: [],
	backups: [],
};

// ============================================================================
// Queue Constants
// ============================================================================

/** Default queue name for auto-created queue */
export const DEFAULT_QUEUE_NAME = "Default";

/** Default queue ID */
export const DEFAULT_QUEUE_ID = "default";

// ============================================================================
// Review Constants
// ============================================================================

/** Rating values */
export const RATINGS = {
	AGAIN: 1 as RatingValue,
	HARD: 2 as RatingValue,
	GOOD: 3 as RatingValue,
	EASY: 4 as RatingValue,
};

/** All rating values in order */
export const ALL_RATINGS: RatingValue[] = [1, 2, 3, 4];

/** Rating display labels */
export const RATING_LABELS: Record<RatingValue, string> = {
	1: "Again",
	2: "Hard",
	3: "Good",
	4: "Easy",
};

/** Rating keyboard shortcuts (default suggestions) */
export const RATING_HOTKEYS: Record<RatingValue, string> = {
	1: "1",
	2: "2",
	3: "3",
	4: "4",
};

/** Rating button colors (CSS classes) */
export const RATING_COLORS: Record<RatingValue, string> = {
	1: "fsrs-rating-again",
	2: "fsrs-rating-hard",
	3: "fsrs-rating-good",
	4: "fsrs-rating-easy",
};

// ============================================================================
// Data Persistence Constants
// ============================================================================

/** Debounce delay for saving data (ms) */
export const SAVE_DEBOUNCE_MS = 1000;

/** Minimum time between saves (ms) */
export const MIN_SAVE_INTERVAL_MS = 500;

/** Backup file suffix */
export const BACKUP_SUFFIX = ".backup";

// ============================================================================
// Performance Constants
// ============================================================================

/** Maximum notes to process in a single batch */
export const BATCH_SIZE = 100;

/** Debounce delay for vault event processing (ms) */
export const VAULT_EVENT_DEBOUNCE_MS = 200;

/** Cache TTL for queue statistics (ms) */
export const STATS_CACHE_TTL_MS = 30000;

// ============================================================================
// UI Constants
// ============================================================================

/** Animation duration for UI transitions (ms) */
export const ANIMATION_DURATION_MS = 200;

/** Progress bar animation duration (ms) */
export const PROGRESS_ANIMATION_MS = 300;

/** Notice display duration for success messages (ms) */
export const NOTICE_DURATION_MS = 3000;

/** Notice display duration for error messages (ms) */
export const ERROR_NOTICE_DURATION_MS = 5000;

// ============================================================================
// Command IDs
// ============================================================================

/** All registered command IDs */
export const COMMANDS = {
	START_REVIEW: "fsrs:start-review",
	OPEN_DASHBOARD: "fsrs:open-dashboard",
	RATE_AGAIN: "fsrs:rate-again",
	RATE_HARD: "fsrs:rate-hard",
	RATE_GOOD: "fsrs:rate-good",
	RATE_EASY: "fsrs:rate-easy",
	SKIP_NOTE: "fsrs:skip-note",
	PREVIOUS_NOTE: "fsrs:previous-note",
	UNDO_RATING: "fsrs:undo-rating",
	END_SESSION: "fsrs:end-session",
	MANAGE_QUEUES: "fsrs:manage-queues",
	ADD_TO_QUEUE: "fsrs:add-to-queue",
} as const;

type CommandId = (typeof COMMANDS)[keyof typeof COMMANDS];

/** Command display names */
export const COMMAND_NAMES: Record<CommandId, string> = {
	[COMMANDS.START_REVIEW]: "Start review session",
	[COMMANDS.OPEN_DASHBOARD]: "Open dashboard",
	[COMMANDS.RATE_AGAIN]: "Rate: Again",
	[COMMANDS.RATE_HARD]: "Rate: Hard",
	[COMMANDS.RATE_GOOD]: "Rate: Good",
	[COMMANDS.RATE_EASY]: "Rate: Easy",
	[COMMANDS.SKIP_NOTE]: "Skip note",
	[COMMANDS.PREVIOUS_NOTE]: "Previous note",
	[COMMANDS.UNDO_RATING]: "Undo last rating",
	[COMMANDS.END_SESSION]: "End review session",
	[COMMANDS.MANAGE_QUEUES]: "Manage queues",
	[COMMANDS.ADD_TO_QUEUE]: "Add note to queue",
};

// ============================================================================
// Time Formatting Constants
// ============================================================================

/** Time unit thresholds for interval display */
export const TIME_THRESHOLDS = {
	MINUTE: 60,
	HOUR: 60 * 60,
	DAY: 60 * 60 * 24,
	MONTH: 60 * 60 * 24 * 30,
	YEAR: 60 * 60 * 24 * 365,
};

/** Time unit labels */
export const TIME_LABELS = {
	second: { singular: "second", plural: "seconds" },
	minute: { singular: "minute", plural: "minutes" },
	hour: { singular: "hour", plural: "hours" },
	day: { singular: "day", plural: "days" },
	month: { singular: "month", plural: "months" },
	year: { singular: "year", plural: "years" },
};

// ============================================================================
// Card State Constants
// ============================================================================

/** Card state values */
export const CARD_STATES = {
	NEW: 0,
	LEARNING: 1,
	REVIEW: 2,
	RELEARNING: 3,
} as const;

/** Card state labels */
export const CARD_STATE_LABELS = {
	0: "New",
	1: "Learning",
	2: "Review",
	3: "Relearning",
} as const;
