/**
 * SessionManager - Review session state and workflow
 * Manages the lifecycle of review sessions
 */

import type { App } from "obsidian";
import { Notice } from "obsidian";
import type {
	SessionState,
	RatingValue,
	CardSchedule,
	PersistedSession,
} from "../types";
import type { DataStore } from "../data/data-store";
import type { CardManager } from "../fsrs/card-manager";
import type { QueueManager } from "../queues/queue-manager";
import type { Scheduler } from "../fsrs/scheduler";
import type { Plugin } from "obsidian";
import { generateSessionId } from "../utils/id-generator";
import { handleError } from "../utils/error-handler";
import { NOTICE_DURATION_MS, PLUGIN_ID } from "../constants";

/** Callback type for session state changes */
export type SessionStateCallback = (state: SessionState | null) => void;

/**
 * SessionManager manages review session state and workflow
 */
export class SessionManager {
	private app: App;
	private plugin: Plugin;
	private dataStore: DataStore;
	private cardManager: CardManager;
	private queueManager: QueueManager;
	private scheduler: Scheduler;

	private session: SessionState | null = null;
	private stateCallbacks: Set<SessionStateCallback> = new Set();

	/** Path to session persistence file */
	private get sessionFilePath(): string {
		return `.obsidian/plugins/${PLUGIN_ID}/session.json`;
	}

	constructor(
		app: App,
		plugin: Plugin,
		dataStore: DataStore,
		cardManager: CardManager,
		queueManager: QueueManager,
		scheduler: Scheduler
	) {
		this.app = app;
		this.plugin = plugin;
		this.dataStore = dataStore;
		this.cardManager = cardManager;
		this.queueManager = queueManager;
		this.scheduler = scheduler;
	}

	// ============================================================================
	// State Management
	// ============================================================================

	/**
	 * Subscribe to session state changes
	 */
	onStateChange(callback: SessionStateCallback): () => void {
		this.stateCallbacks.add(callback);
		return () => {
			this.stateCallbacks.delete(callback);
		};
	}

	/**
	 * Notify all subscribers of state change
	 */
	private notifyStateChange(): void {
		for (const callback of this.stateCallbacks) {
			callback(this.session);
		}
	}

	/**
	 * Check if a session is active
	 */
	isActive(): boolean {
		return this.session !== null;
	}

	/**
	 * Get current session state
	 */
	getState(): SessionState | null {
		return this.session;
	}

	// ============================================================================
	// Session Lifecycle
	// ============================================================================

	/**
	 * Start a new review session for a queue
	 */
	async startSession(queueId: string): Promise<boolean> {
		try {
			return await this.doStartSession(queueId);
		} catch (error) {
			handleError(error, { component: "SessionManager.startSession", notifyUser: true });
			return false;
		}
	}

	private async doStartSession(queueId: string): Promise<boolean> {
		// Check if session is already active
		if (this.session) {
			new Notice("A review session is already active. End it first.", NOTICE_DURATION_MS);
			return false;
		}

		// Sync queue with vault to pick up any new/removed notes
		this.queueManager.syncQueue(queueId);

		// Get due notes for the queue
		const dueCards = this.queueManager.getDueNotes(queueId);

		if (dueCards.length === 0) {
			new Notice("No notes due for review.", NOTICE_DURATION_MS);
			return false;
		}

		// Create session state
		const firstCard = dueCards[0];
		if (!firstCard) {
			new Notice("No notes due for review.", NOTICE_DURATION_MS);
			return false;
		}

		this.session = {
			queueId,
			currentIndex: 0,
			totalNotes: dueCards.length,
			currentNotePath: firstCard.notePath,
			reviewed: 0,
			ratings: { 1: 0, 2: 0, 3: 0, 4: 0 },
			sessionId: generateSessionId(),
			startedAt: new Date(),
			reviewQueue: dueCards.map((c) => c.notePath),
			history: [],
		};

		// Open first note
		await this.openCurrentNote();

		this.notifyStateChange();
		void this.persistSession();
		return true;
	}

	/**
	 * End the current session
	 */
	endSession(): void {
		if (!this.session) {
			return;
		}

		const reviewed = this.session.reviewed;
		const total = this.session.totalNotes;

		this.session = null;
		this.notifyStateChange();
		void this.clearPersistedSession();

		if (reviewed > 0) {
			new Notice(
				`Session complete! Reviewed ${reviewed} of ${total} notes.`,
				NOTICE_DURATION_MS
			);
		}

		// Update queue stats
		// Note: This would be called after session ends
	}

	// ============================================================================
	// Rating
	// ============================================================================

	/**
	 * Rate the current note
	 */
	async rate(rating: RatingValue): Promise<boolean> {
		try {
			return await this.doRate(rating);
		} catch (error) {
			handleError(error, { component: "SessionManager.rate", notifyUser: true });
			return false;
		}
	}

	private async doRate(rating: RatingValue): Promise<boolean> {
		if (!this.session) {
			new Notice("No active review session.", NOTICE_DURATION_MS);
			return false;
		}

		const notePath = this.session.currentNotePath;
		const queueId = this.session.queueId;

		// Get current schedule for undo history
		const schedule = this.cardManager.getSchedule(notePath, queueId);
		if (!schedule) {
			console.error("[FSRS] Schedule not found for rating");
			return false;
		}

		// Store previous state for undo
		const previousSchedule = { ...schedule };

		// Process the rating
		const reviewLog = this.cardManager.updateCardSchedule(
			notePath,
			queueId,
			rating,
			this.session.sessionId
		);

		// Add to history for undo
		this.session.history.push({
			notePath,
			rating,
			reviewLogId: reviewLog.id,
			previousSchedule,
		});

		// Update session stats
		this.session.reviewed++;
		this.session.ratings[rating]++;

		// Refresh queue stats immediately so UI shows fresh numbers
		this.queueManager.updateQueueStats(queueId);

		// Move to next note
		await this.advanceToNext();

		return true;
	}

	// ============================================================================
	// Navigation
	// ============================================================================

	/**
	 * Skip current note without rating
	 */
	async skip(): Promise<void> {
		if (!this.session) {
			return;
		}

		await this.advanceToNext();
	}

	/**
	 * Go back to previous note
	 */
	async goBack(): Promise<boolean> {
		if (!this.session || this.session.currentIndex <= 0) {
			return false;
		}

		this.session.currentIndex--;
		const prevPath = this.session.reviewQueue[this.session.currentIndex];
		if (prevPath) {
			this.session.currentNotePath = prevPath;
		}

		await this.openCurrentNote();
		this.notifyStateChange();
		return true;
	}

	/**
	 * Undo the last rating
	 */
	async undoLastRating(): Promise<boolean> {
		if (!this.session || this.session.history.length === 0) {
			new Notice("Nothing to undo.", NOTICE_DURATION_MS);
			return false;
		}

		const lastEntry = this.session.history.pop()!;

		// Restore previous schedule
		const card = this.cardManager.getCard(lastEntry.notePath);
		if (card) {
			card.schedules[this.session.queueId] = lastEntry.previousSchedule;
			this.dataStore.updateCard(lastEntry.notePath, card);
		}

		// Mark review log as undone
		this.dataStore.markReviewUndone(lastEntry.reviewLogId);

		// Update session stats
		this.session.reviewed--;
		this.session.ratings[lastEntry.rating]--;

		// Go back to that note
		const noteIndex = this.session.reviewQueue.indexOf(lastEntry.notePath);
		if (noteIndex !== -1) {
			this.session.currentIndex = noteIndex;
			this.session.currentNotePath = lastEntry.notePath;
			await this.openCurrentNote();
		}

		this.notifyStateChange();
		new Notice("Rating undone.", NOTICE_DURATION_MS);
		return true;
	}

	/**
	 * Bring back the expected note (when user navigated away)
	 */
	async bringBack(): Promise<void> {
		if (!this.session) {
			return;
		}

		await this.openCurrentNote();
	}

	/**
	 * Advance to the next note in the queue
	 */
	private async advanceToNext(): Promise<void> {
		if (!this.session) {
			return;
		}

		this.session.currentIndex++;

		// Check if session is complete
		if (this.session.currentIndex >= this.session.reviewQueue.length) {
			this.endSession();
			return;
		}

		const nextPath = this.session.reviewQueue[this.session.currentIndex];
		if (nextPath) {
			this.session.currentNotePath = nextPath;
		}

		await this.openCurrentNote();
		this.notifyStateChange();
		void this.persistSession();
	}

	/**
	 * Open the current note in the editor
	 */
	private async openCurrentNote(): Promise<void> {
		if (!this.session) {
			return;
		}

		const file = this.app.vault.getFileByPath(this.session.currentNotePath);
		if (!file) {
			console.error("[FSRS] Note file not found:", this.session.currentNotePath);
			// Skip to next note
			await this.advanceToNext();
			return;
		}

		// Open in the active leaf
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	// ============================================================================
	// Current Note State
	// ============================================================================

	/**
	 * Check if the currently open file matches the expected session note
	 */
	isCurrentNoteExpected(): boolean {
		if (!this.session) {
			return true;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return false;
		}

		return activeFile.path === this.session.currentNotePath;
	}

	/**
	 * Get the expected note path
	 */
	getExpectedNotePath(): string | null {
		return this.session?.currentNotePath ?? null;
	}

	/**
	 * Get current progress
	 */
	getProgress(): { current: number; total: number; percentage: number } | null {
		if (!this.session) {
			return null;
		}

		const current = this.session.currentIndex + 1;
		const total = this.session.totalNotes;
		const percentage = Math.round((current / total) * 100);

		return { current, total, percentage };
	}

	/**
	 * Get current card schedule for display
	 */
	getCurrentSchedule(): CardSchedule | null {
		if (!this.session) {
			return null;
		}

		return this.cardManager.getSchedule(
			this.session.currentNotePath,
			this.session.queueId
		) ?? null;
	}

	/**
	 * Get scheduling preview for current card
	 */
	getCurrentSchedulingPreview() {
		if (!this.session) {
			return null;
		}

		return this.cardManager.getSchedulingPreview(
			this.session.currentNotePath,
			this.session.queueId
		);
	}

	/**
	 * Get retrievability for current card
	 */
	getCurrentRetrievability(): number | null {
		if (!this.session) {
			return null;
		}

		return this.cardManager.getRetrievability(
			this.session.currentNotePath,
			this.session.queueId
		);
	}

	/**
	 * Check if undo is available
	 */
	canUndo(): boolean {
		return (this.session?.history.length ?? 0) > 0;
	}

	/**
	 * Check if go back is available
	 */
	canGoBack(): boolean {
		return (this.session?.currentIndex ?? 0) > 0;
	}

	// ============================================================================
	// Session Persistence
	// ============================================================================

	/**
	 * Persist current session state to disk
	 */
	private async persistSession(): Promise<void> {
		if (!this.session) {
			await this.clearPersistedSession();
			return;
		}

		const persisted: PersistedSession = {
			queueId: this.session.queueId,
			sessionId: this.session.sessionId,
			currentIndex: this.session.currentIndex,
			reviewed: this.session.reviewed,
			ratings: { ...this.session.ratings },
			reviewQueue: this.session.reviewQueue,
			startedAt: this.session.startedAt.toISOString(),
		};

		try {
			await this.app.vault.adapter.write(
				this.sessionFilePath,
				JSON.stringify(persisted)
			);
		} catch (error) {
			console.error("[FSRS] Failed to persist session:", error);
		}
	}

	/**
	 * Clear persisted session file
	 */
	private async clearPersistedSession(): Promise<void> {
		try {
			if (await this.app.vault.adapter.exists(this.sessionFilePath)) {
				await this.app.vault.adapter.remove(this.sessionFilePath);
			}
		} catch {
			// Ignore — file may not exist
		}
	}

	/**
	 * Try to resume a persisted session (call on startup)
	 * Returns true if a session was successfully resumed
	 */
	async tryResumeSession(): Promise<boolean> {
		try {
			if (!(await this.app.vault.adapter.exists(this.sessionFilePath))) {
				return false;
			}

			const raw = await this.app.vault.adapter.read(this.sessionFilePath);
			const persisted: unknown = JSON.parse(raw);

			if (!persisted || typeof persisted !== "object") {
				await this.clearPersistedSession();
				return false;
			}

			const p = persisted as PersistedSession;

			// Validate the queue still exists
			const queue = this.queueManager.getQueue(p.queueId);
			if (!queue) {
				await this.clearPersistedSession();
				return false;
			}

			// Validate review queue paths still have cards
			const validPaths = p.reviewQueue.filter(
				(path) => this.cardManager.getCard(path) !== undefined
			);

			if (validPaths.length === 0 || p.currentIndex >= validPaths.length) {
				await this.clearPersistedSession();
				return false;
			}

			const currentPath = validPaths[p.currentIndex];
			if (!currentPath) {
				await this.clearPersistedSession();
				return false;
			}

			// Rebuild session state
			this.session = {
				queueId: p.queueId,
				sessionId: p.sessionId,
				currentIndex: p.currentIndex,
				totalNotes: validPaths.length,
				currentNotePath: currentPath,
				reviewed: p.reviewed,
				ratings: p.ratings,
				startedAt: new Date(p.startedAt),
				reviewQueue: validPaths,
				history: [], // History is not persisted — undo not available after resume
			};

			this.notifyStateChange();
			new Notice(
				`Resumed review session (${this.session.reviewed} reviewed, ${validPaths.length - p.currentIndex} remaining)`,
				NOTICE_DURATION_MS
			);
			return true;
		} catch (error) {
			console.error("[FSRS] Failed to resume session:", error);
			await this.clearPersistedSession();
			return false;
		}
	}
}
