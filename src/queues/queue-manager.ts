/**
 * QueueManager - Queue management and synchronization
 * Handles queue CRUD, syncing with vault, and statistics
 */

import type { App } from "obsidian";
import type {
	Queue,
	QueueStats,
	SelectionCriteria,
	SyncResult,
	CardData,
	QueueOrderStrategy,
	PluginSettings,
} from "../types";
import type { DataStore } from "../data/data-store";
import type { CardManager } from "../fsrs/card-manager";
import { NoteResolver } from "./note-resolver";
import { generateId } from "../utils/id-generator";
import { nowISO, parseISODate, isDue, getStartOfToday } from "../utils/date-utils";
import {
	DEFAULT_QUEUE_NAME,
	DEFAULT_QUEUE_ID,
	DEFAULT_QUEUE_STATS,
	STATS_CACHE_TTL_MS,
} from "../constants";

/**
 * QueueManager handles queue operations and synchronization
 */
export class QueueManager {
	private app: App;
	private dataStore: DataStore;
	private cardManager: CardManager;
	private noteResolver: NoteResolver;

	constructor(
		app: App,
		dataStore: DataStore,
		cardManager: CardManager,
		settings: PluginSettings
	) {
		this.app = app;
		this.dataStore = dataStore;
		this.cardManager = cardManager;
		this.noteResolver = new NoteResolver(app, settings);
	}

	/**
	 * Update settings (called when settings change)
	 */
	updateSettings(settings: PluginSettings): void {
		this.noteResolver.updateSettings(settings);
	}

	// ============================================================================
	// Queue CRUD
	// ============================================================================

	/**
	 * Get or create the default queue
	 */
	getDefaultQueue(): Queue {
		let queue = this.dataStore.getQueue(DEFAULT_QUEUE_ID);

		if (!queue) {
			// Create default queue
			const settings = this.dataStore.getSettings();
			queue = this.createQueue(DEFAULT_QUEUE_NAME, {
				type: settings.selectionMode,
				folders: settings.trackedFolders,
				tags: settings.trackedTags,
			});

			// Override the ID to be the default
			queue.id = DEFAULT_QUEUE_ID;
			this.dataStore.updateQueue(queue.id, queue);
		}

		return queue;
	}

	/**
	 * Create a new queue
	 */
	createQueue(name: string, criteria: SelectionCriteria): Queue {
		const queue: Queue = {
			id: generateId(),
			name,
			createdAt: nowISO(),
			criteria,
			stats: { ...DEFAULT_QUEUE_STATS },
		};

		this.dataStore.addQueue(queue);
		return queue;
	}

	/**
	 * Get a queue by ID
	 */
	getQueue(id: string): Queue | undefined {
		return this.dataStore.getQueue(id);
	}

	/**
	 * Get all queues
	 */
	getAllQueues(): Queue[] {
		return this.dataStore.getQueues();
	}

	/**
	 * Update a queue
	 */
	updateQueue(id: string, updates: Partial<Queue>): void {
		this.dataStore.updateQueue(id, updates);
	}

	/**
	 * Delete a queue
	 */
	deleteQueue(id: string, removeCards: boolean = false): void {
		if (removeCards) {
			// Remove all cards from this queue
			const cards = this.cardManager.getCardsForQueue(id);
			for (const card of cards) {
				this.cardManager.removeFromQueue(card.notePath, id);
			}
		}

		this.dataStore.deleteQueue(id);
	}

	/**
	 * Rename a queue
	 */
	renameQueue(id: string, newName: string): void {
		this.dataStore.updateQueue(id, { name: newName });
	}

	// ============================================================================
	// Queue Synchronization
	// ============================================================================

	/**
	 * Sync a queue with the current vault state
	 * Adds new matching notes, detects removed notes
	 */
	syncQueue(queueId: string): SyncResult {
		const queue = this.dataStore.getQueue(queueId);
		if (!queue) {
			throw new Error(`Queue not found: ${queueId}`);
		}

		// Get currently matching notes
		const matchingNotes = this.noteResolver.resolveNotesForCriteria(queue.criteria);
		const matchingPaths = new Set(matchingNotes.map((f) => f.path));

		// Get current cards in queue
		const currentCards = this.cardManager.getCardsForQueue(queueId);
		const currentPaths = new Set(currentCards.map((c) => c.notePath));

		const result: SyncResult = {
			added: [],
			removed: [],
			unchanged: 0,
		};

		// Find new notes to add
		for (const path of matchingPaths) {
			if (!currentPaths.has(path)) {
				// New note - create card
				this.cardManager.createCard(path, queueId);
				result.added.push(path);
			} else {
				result.unchanged++;
			}
		}

		// Find removed notes
		for (const path of currentPaths) {
			if (!matchingPaths.has(path)) {
				// Note no longer matches - mark for removal
				// For now, just track it; don't auto-remove to prevent data loss
				result.removed.push(path);
			}
		}

		// Update queue statistics
		this.updateQueueStats(queueId);

		return result;
	}

	/**
	 * Sync the default queue with global settings
	 */
	syncDefaultQueue(): SyncResult {
		const settings = this.dataStore.getSettings();

		// Ensure default queue exists and has correct criteria
		const queue = this.getDefaultQueue();

		// Update criteria to match current settings
		const newCriteria: SelectionCriteria = {
			type: settings.selectionMode,
			folders: settings.trackedFolders,
			tags: settings.trackedTags,
		};

		this.dataStore.updateQueue(queue.id, { criteria: newCriteria });

		return this.syncQueue(queue.id);
	}

	// ============================================================================
	// Queue Statistics
	// ============================================================================

	/**
	 * Update queue statistics
	 */
	updateQueueStats(queueId: string): QueueStats {
		const cards = this.cardManager.getCardsForQueue(queueId);
		const startOfToday = getStartOfToday();

		let newNotes = 0;
		let dueNotes = 0;
		let reviewedToday = 0;

		for (const card of cards) {
			const schedule = card.schedules[queueId];
			if (!schedule) continue;

			// Count new notes
			if (schedule.state === 0) {
				newNotes++;
			}

			// Count due notes (today or overdue)
			if (isDue(parseISODate(schedule.due))) {
				dueNotes++;
			}

			// Count reviewed today
			if (schedule.lastReview) {
				const lastReviewDate = parseISODate(schedule.lastReview);
				if (lastReviewDate >= startOfToday) {
					reviewedToday++;
				}
			}
		}

		const stats: QueueStats = {
			totalNotes: cards.length,
			newNotes,
			dueNotes,
			reviewedToday,
			lastUpdated: nowISO(),
		};

		this.dataStore.updateQueue(queueId, { stats });
		return stats;
	}

	/**
	 * Get queue statistics (cached for STATS_CACHE_TTL_MS to avoid recomputing on every render)
	 */
	getQueueStats(queueId: string): QueueStats {
		const queue = this.dataStore.getQueue(queueId);
		if (!queue) {
			return { ...DEFAULT_QUEUE_STATS };
		}
		const stats = queue.stats;
		const lastUpdatedMs = parseISODate(stats.lastUpdated).getTime();
		if (Date.now() - lastUpdatedMs < STATS_CACHE_TTL_MS) {
			return stats;
		}
		return this.updateQueueStats(queueId);
	}

	// ============================================================================
	// Due Notes
	// ============================================================================

	/**
	 * Get due notes for a queue, ordered by the specified strategy
	 */
	getDueNotes(queueId: string, orderStrategy?: QueueOrderStrategy): CardData[] {
		const settings = this.dataStore.getSettings();
		const strategy = orderStrategy ?? settings.queueOrder;

		const dueCards = this.cardManager.getDueCards(queueId);

		// Sort (and optionally cap) based on strategy
		return this.sortCards(dueCards, queueId, strategy);
	}

	/**
	 * Sort by due date (ascending) for use in multiple strategies
	 */
	private sortByDue(cards: CardData[], queueId: string): void {
		cards.sort((a, b) => {
			const aDue = parseISODate(a.schedules[queueId]!.due);
			const bDue = parseISODate(b.schedules[queueId]!.due);
			return aDue.getTime() - bDue.getTime();
		});
	}

	/**
	 * Sort cards based on order strategy
	 */
	private sortCards(
		cards: CardData[],
		queueId: string,
		strategy: QueueOrderStrategy
	): CardData[] {
		const sorted = [...cards];

		switch (strategy) {
			case "mixed-anki": {
				const settings = this.dataStore.getSettings();
				const learning = sorted.filter((c) => {
					const s = c.schedules[queueId];
					return s && (s.state === 1 || s.state === 3);
				});
				const newCards = sorted.filter((c) => {
					const s = c.schedules[queueId];
					return s && s.state === 0;
				});
				const review = sorted.filter((c) => {
					const s = c.schedules[queueId];
					return s && s.state === 2;
				});
				this.sortByDue(learning, queueId);
				this.sortByDue(newCards, queueId);
				this.sortByDue(review, queueId);
				const selectedNew = newCards.slice(0, settings.newCardsPerDay);
				const selectedReview = review.slice(0, settings.maxReviewsPerDay);
				return [...learning, ...selectedNew, ...selectedReview];
			}

			case "state-priority": {
				// Learning(1) > Relearning(3) > Review(2) > New(0), then by due
				const statePriority: Record<number, number> = {
					1: 1,
					3: 2,
					2: 3,
					0: 4,
				};
				sorted.sort((a, b) => {
					const pa = statePriority[a.schedules[queueId]!.state] ?? 5;
					const pb = statePriority[b.schedules[queueId]!.state] ?? 5;
					if (pa !== pb) return pa - pb;
					return (
						parseISODate(a.schedules[queueId]!.due).getTime() -
						parseISODate(b.schedules[queueId]!.due).getTime()
					);
				});
				break;
			}

			case "retrievability-asc": {
				const withR = sorted.map((card) => ({
					card,
					r: this.cardManager.getRetrievability(card.notePath, queueId) ?? 1,
				}));
				withR.sort((a, b) => a.r - b.r);
				return withR.map((x) => x.card);
			}

			case "load-balancing": {
				const settings = this.dataStore.getSettings();
				this.sortByDue(sorted, queueId);
				return sorted.slice(0, settings.maxReviewsPerDay);
			}

			case "due-overdue-first":
				// Sort by due date, overdue first
				sorted.sort((a, b) => {
					const aDue = parseISODate(a.schedules[queueId]!.due);
					const bDue = parseISODate(b.schedules[queueId]!.due);
					return aDue.getTime() - bDue.getTime();
				});
				break;

			case "due-chronological":
				this.sortByDue(sorted, queueId);
				break;

			case "difficulty-desc":
				// Harder cards first
				sorted.sort((a, b) => {
					const aDiff = a.schedules[queueId]!.difficulty;
					const bDiff = b.schedules[queueId]!.difficulty;
					return bDiff - aDiff;
				});
				break;

			case "difficulty-asc":
				// Easier cards first
				sorted.sort((a, b) => {
					const aDiff = a.schedules[queueId]!.difficulty;
					const bDiff = b.schedules[queueId]!.difficulty;
					return aDiff - bDiff;
				});
				break;

			case "random":
				// Fisher-Yates shuffle
				for (let i = sorted.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					const temp = sorted[i];
					const swapVal = sorted[j];
					if (temp !== undefined && swapVal !== undefined) {
						sorted[i] = swapVal;
						sorted[j] = temp;
					}
				}
				break;
		}

		return sorted;
	}

	/**
	 * Get count of due notes
	 */
	getDueCount(queueId: string): number {
		return this.cardManager.getDueCards(queueId).length;
	}

	/**
	 * Get count of new notes
	 */
	getNewCount(queueId: string): number {
		return this.cardManager.getNewCards(queueId).length;
	}

	/**
	 * Get count of overdue notes
	 */
	getOverdueCount(queueId: string): number {
		return this.cardManager.getOverdueCards(queueId).length;
	}

	// ============================================================================
	// Note Resolver Access
	// ============================================================================

	/**
	 * Get the note resolver (for external access)
	 */
	getNoteResolver(): NoteResolver {
		return this.noteResolver;
	}
}
