/**
 * Commands - Command registration and handlers
 * Registers all plugin commands with Obsidian
 */

import type { Plugin } from "obsidian";
import { Notice } from "obsidian";
import type { SessionManager } from "../review/session-manager";
import type { QueueManager } from "../queues/queue-manager";
import { QueueSelectorModal } from "../ui/queues/queue-selector-modal";
import { COMMANDS, COMMAND_NAMES, RATINGS, DEFAULT_QUEUE_ID, NOTICE_DURATION_MS } from "../constants";
import type { RatingValue } from "../types";

/** Callback to run when starting a review (e.g. start session + activate sidebar) */
export type OnStartReviewCallback = (queueId: string) => Promise<void>;

/**
 * Register all plugin commands
 */
export function registerCommands(
	plugin: Plugin,
	sessionManager: SessionManager,
	queueManager: QueueManager,
	options?: { onStartReview?: OnStartReviewCallback }
): void {
	const onStartReview = options?.onStartReview ?? (async (queueId: string) => {
		await sessionManager.startSession(queueId);
	});

	// Start Review Session (shows queue selector when multiple queues exist)
	plugin.addCommand({
		id: COMMANDS.START_REVIEW,
		name: COMMAND_NAMES[COMMANDS.START_REVIEW],
		callback: async () => {
			const queues = queueManager.getAllQueues();
			if (queues.length === 0) {
				// Ensure default queue exists
				queueManager.getDefaultQueue();
				const again = queueManager.getAllQueues();
				if (again.length === 0) {
					new Notice("No queue configured. Add tracked folders or tags in settings.", NOTICE_DURATION_MS);
					return;
				}
			}
			const allQueues = queueManager.getAllQueues();
			if (allQueues.length > 1) {
				const modal = new QueueSelectorModal(plugin.app, queueManager, (queueId) => {
					void onStartReview(queueId);
					modal.close();
				});
				modal.open();
			} else {
				const queueId = allQueues[0]?.id ?? DEFAULT_QUEUE_ID;
				await onStartReview(queueId);
			}
		},
	});

	// Rate: Again
	plugin.addCommand({
		id: COMMANDS.RATE_AGAIN,
		name: COMMAND_NAMES[COMMANDS.RATE_AGAIN],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				void rateNote(sessionManager, RATINGS.AGAIN);
			}
			return true;
		},
	});

	// Rate: Hard
	plugin.addCommand({
		id: COMMANDS.RATE_HARD,
		name: COMMAND_NAMES[COMMANDS.RATE_HARD],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				void rateNote(sessionManager, RATINGS.HARD);
			}
			return true;
		},
	});

	// Rate: Good
	plugin.addCommand({
		id: COMMANDS.RATE_GOOD,
		name: COMMAND_NAMES[COMMANDS.RATE_GOOD],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				void rateNote(sessionManager, RATINGS.GOOD);
			}
			return true;
		},
	});

	// Rate: Easy
	plugin.addCommand({
		id: COMMANDS.RATE_EASY,
		name: COMMAND_NAMES[COMMANDS.RATE_EASY],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				void rateNote(sessionManager, RATINGS.EASY);
			}
			return true;
		},
	});

	// Skip Note
	plugin.addCommand({
		id: COMMANDS.SKIP_NOTE,
		name: COMMAND_NAMES[COMMANDS.SKIP_NOTE],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				void sessionManager.skip();
			}
			return true;
		},
	});

	// End Session
	plugin.addCommand({
		id: COMMANDS.END_SESSION,
		name: COMMAND_NAMES[COMMANDS.END_SESSION],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive()) {
				return false;
			}
			if (!checking) {
				sessionManager.endSession();
			}
			return true;
		},
	});

	// Previous Note (Go Back)
	plugin.addCommand({
		id: COMMANDS.PREVIOUS_NOTE,
		name: COMMAND_NAMES[COMMANDS.PREVIOUS_NOTE],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive() || !sessionManager.canGoBack()) {
				return false;
			}
			if (!checking) {
				void sessionManager.goBack();
			}
			return true;
		},
	});

	// Undo Last Rating
	plugin.addCommand({
		id: COMMANDS.UNDO_RATING,
		name: COMMAND_NAMES[COMMANDS.UNDO_RATING],
		checkCallback: (checking: boolean) => {
			if (!sessionManager.isActive() || !sessionManager.canUndo()) {
				return false;
			}
			if (!checking) {
				void sessionManager.undoLastRating();
			}
			return true;
		},
	});
}

/**
 * Helper to rate a note with proper error handling
 */
async function rateNote(sessionManager: SessionManager, rating: RatingValue): Promise<void> {
	if (!sessionManager.isCurrentNoteExpected()) {
		new Notice("Navigate to the review note first", NOTICE_DURATION_MS);
		return;
	}
	await sessionManager.rate(rating);
}
