/**
 * ReviewSidebar - Main review interface
 * Displays rating buttons, progress, and session controls
 */

import { ItemView, WorkspaceLeaf } from "obsidian";
import type { SessionManager } from "../../review/session-manager";
import type { QueueManager } from "../../queues/queue-manager";
import type { DataStore } from "../../data/data-store";
import type { SessionState, RatingValue } from "../../types";
import { QueueSelectorModal } from "../queues/queue-selector-modal";
import {
	REVIEW_SIDEBAR_VIEW_TYPE,
	REVIEW_SIDEBAR_DISPLAY_NAME,
	RATING_LABELS,
	RATING_COLORS,
	RATINGS,
	DEFAULT_QUEUE_ID,
	CARD_STATE_LABELS,
} from "../../constants";

/**
 * ReviewSidebar is the main review interface in the sidebar
 */
export class ReviewSidebar extends ItemView {
	private sessionManager: SessionManager;
	private queueManager: QueueManager;
	private dataStore: DataStore;

	private unsubscribe: (() => void) | null = null;
	private fileOpenUnsubscribe: (() => void) | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		sessionManager: SessionManager,
		queueManager: QueueManager,
		dataStore: DataStore
	) {
		super(leaf);
		this.sessionManager = sessionManager;
		this.queueManager = queueManager;
		this.dataStore = dataStore;
	}

	getViewType(): string {
		return REVIEW_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return REVIEW_SIDEBAR_DISPLAY_NAME;
	}

	getIcon(): string {
		return "brain";
	}

	async onOpen(): Promise<void> {
		// Subscribe to session state changes
		this.unsubscribe = this.sessionManager.onStateChange(() => {
			this.render();
		});

		// Subscribe to file open events to detect navigation
		this.fileOpenUnsubscribe = (() => {
			const handler = () => this.render();
			this.registerEvent(this.app.workspace.on("file-open", handler));
			return () => {}; // Cleanup handled by registerEvent
		})();

		this.render();
	}

	async onClose(): Promise<void> {
		if (this.unsubscribe) {
			this.unsubscribe();
		}
	}

	/**
	 * Main render function
	 */
	render(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass("fsrs-sidebar");

		const state = this.sessionManager.getState();

		if (state) {
			this.renderActiveSession(container, state);
		} else {
			this.renderIdleState(container);
		}
	}

	/**
	 * Render idle state (no active session)
	 */
	private renderIdleState(container: HTMLElement): void {
		const idleContainer = container.createDiv({ cls: "fsrs-idle-container" });

		// Queue info (default queue or first queue for stats summary)
		const queues = this.queueManager.getAllQueues();
		const defaultOrFirstId = queues.length > 0 ? queues[0]?.id ?? DEFAULT_QUEUE_ID : DEFAULT_QUEUE_ID;
		const queueStats = this.queueManager.getQueueStats(defaultOrFirstId);

		idleContainer.createEl("div", {
			cls: "fsrs-idle-message",
			text: "No active review session",
		});

		// Stats summary
		const statsDiv = idleContainer.createDiv({ cls: "fsrs-idle-stats" });

		this.createStatItem(statsDiv, "Due today", String(queueStats.dueNotes));
		this.createStatItem(statsDiv, "New", String(queueStats.newNotes));
		this.createStatItem(statsDiv, "Total", String(queueStats.totalNotes));

		// Start button (shows queue selector when multiple queues)
		const startBtn = idleContainer.createEl("button", {
			cls: "fsrs-start-button mod-cta",
			text: "Start review",
		});

		startBtn.addEventListener("click", () => {
			this.handleStartReview();
		});

		// Disable if no notes due in any queue
		const totalDue = queues.length === 0
			? queueStats.dueNotes
			: queues.reduce((sum, q) => sum + this.queueManager.getQueueStats(q.id).dueNotes, 0);
		if (totalDue === 0) {
			startBtn.disabled = true;
			startBtn.addClass("fsrs-button-disabled");
		}
	}

	/**
	 * Start review: show queue selector when multiple queues, otherwise start with default/first queue
	 */
	private handleStartReview(): void {
		const queues = this.queueManager.getAllQueues();
		if (queues.length === 0) {
			this.queueManager.getDefaultQueue();
			const again = this.queueManager.getAllQueues();
			if (again.length === 0) return;
		}
		const allQueues = this.queueManager.getAllQueues();
		if (allQueues.length > 1) {
			const modal = new QueueSelectorModal(this.app, this.queueManager, (queueId) => {
				void this.sessionManager.startSession(queueId);
				modal.close();
			});
			modal.open();
		} else {
			const queueId = allQueues[0]?.id ?? DEFAULT_QUEUE_ID;
			void this.sessionManager.startSession(queueId);
		}
	}

	/**
	 * Render active session state
	 */
	private renderActiveSession(container: HTMLElement, state: SessionState): void {
		// Check if current note matches expected
		const isExpectedNote = this.sessionManager.isCurrentNoteExpected();

		// Queue header
		this.renderQueueHeader(container, state);

		// Progress
		this.renderProgress(container, state);

		// Rating buttons or navigation prompt
		if (isExpectedNote) {
			this.renderRatingButtons(container, state);
		} else {
			this.renderNavigationPrompt(container);
		}

		// Navigation controls
		this.renderNavigationControls(container, state, isExpectedNote);

		// Note stats (if enabled and expected note)
		const settings = this.dataStore.getSettings();
		if (settings.showNoteStats && isExpectedNote) {
			this.renderNoteStats(container, state);
		}

		// Session stats (if enabled)
		if (settings.showSessionStats) {
			this.renderSessionStats(container, state);
		}

		// End session button
		this.renderEndSessionButton(container);
	}

	/**
	 * Render queue header
	 */
	private renderQueueHeader(container: HTMLElement, state: SessionState): void {
		const header = container.createDiv({ cls: "fsrs-queue-header" });
		const queue = this.queueManager.getQueue(state.queueId);
		header.createEl("span", {
			cls: "fsrs-queue-name",
			text: queue?.name ?? "Review",
		});
	}

	/**
	 * Render progress indicator
	 */
	private renderProgress(container: HTMLElement, state: SessionState): void {
		const progress = this.sessionManager.getProgress();
		if (!progress) return;

		const progressContainer = container.createDiv({ cls: "fsrs-progress-container" });

		progressContainer.createEl("div", {
			cls: "fsrs-progress-text",
			text: `${progress.current} of ${progress.total}`,
		});

		const progressBar = progressContainer.createDiv({ cls: "fsrs-progress-bar" });
		const progressFill = progressBar.createDiv({ cls: "fsrs-progress-fill" });
		progressFill.style.width = `${progress.percentage}%`;
	}

	/**
	 * Render rating buttons
	 */
	private renderRatingButtons(container: HTMLElement, state: SessionState): void {
		const settings = this.dataStore.getSettings();
		const preview = this.sessionManager.getCurrentSchedulingPreview();

		const buttonsContainer = container.createDiv({ cls: "fsrs-rating-buttons" });

		const ratings: RatingValue[] = [RATINGS.AGAIN, RATINGS.HARD, RATINGS.GOOD, RATINGS.EASY];

		for (const rating of ratings) {
			const btn = buttonsContainer.createEl("button", {
				cls: `fsrs-rating-button ${RATING_COLORS[rating]}`,
			});

			const labelSpan = btn.createSpan({ cls: "fsrs-rating-label" });
			labelSpan.textContent = RATING_LABELS[rating];

			if (settings.showPredictedIntervals && preview) {
				const intervalText = preview[rating]?.intervalText ?? "";
				if (intervalText) {
					const sep = btn.createSpan({ cls: "fsrs-rating-sep" });
					sep.textContent = " · ";
					const intervalSpan = btn.createSpan({ cls: "fsrs-rating-interval" });
					intervalSpan.textContent = intervalText;
				}
			}

			btn.addEventListener("click", () => {
				void this.sessionManager.rate(rating);
			});
		}
	}

	/**
	 * Render navigation prompt (when user navigated away)
	 */
	private renderNavigationPrompt(container: HTMLElement): void {
		const promptContainer = container.createDiv({ cls: "fsrs-navigation-prompt" });

		promptContainer.createEl("div", {
			cls: "fsrs-prompt-message",
			text: "Navigate to the review note to continue",
		});

		const bringBackBtn = promptContainer.createEl("button", {
			cls: "fsrs-bring-back-button mod-cta",
			text: "Bring back note",
		});

		bringBackBtn.addEventListener("click", () => {
			void this.sessionManager.bringBack();
		});
	}

	/**
	 * Render navigation controls (Skip, Back, Undo)
	 */
	private renderNavigationControls(
		container: HTMLElement,
		state: SessionState,
		isExpectedNote: boolean
	): void {
		const controlsContainer = container.createDiv({ cls: "fsrs-nav-controls" });

		// Skip button
		const skipBtn = controlsContainer.createEl("button", {
			cls: "fsrs-nav-button",
			text: "Skip",
		});
		skipBtn.addEventListener("click", () => {
			void this.sessionManager.skip();
		});
		if (!isExpectedNote) {
			skipBtn.disabled = true;
		}

		// Back button
		const backBtn = controlsContainer.createEl("button", {
			cls: "fsrs-nav-button",
			text: "Back",
		});
		backBtn.addEventListener("click", () => {
			void this.sessionManager.goBack();
		});
		if (!this.sessionManager.canGoBack()) {
			backBtn.disabled = true;
		}

		// Undo button
		const undoBtn = controlsContainer.createEl("button", {
			cls: "fsrs-nav-button",
			text: "Undo",
		});
		undoBtn.addEventListener("click", () => {
			void this.sessionManager.undoLastRating();
		});
		if (!this.sessionManager.canUndo()) {
			undoBtn.disabled = true;
		}
	}

	/**
	 * Render note statistics
	 */
	private renderNoteStats(container: HTMLElement, state: SessionState): void {
		const schedule = this.sessionManager.getCurrentSchedule();
		if (!schedule) return;

		const retrievability = this.sessionManager.getCurrentRetrievability();

		const statsSection = container.createDiv({ cls: "fsrs-stats-section" });

		const header = statsSection.createDiv({ cls: "fsrs-stats-header" });
		header.createEl("span", { text: "Note stats" });

		const statsGrid = statsSection.createDiv({ cls: "fsrs-stats-grid" });

		this.createStatItem(
			statsGrid,
			"State",
			CARD_STATE_LABELS[schedule.state as keyof typeof CARD_STATE_LABELS] ?? "Unknown"
		);
		this.createStatItem(statsGrid, "Stability", `${schedule.stability.toFixed(1)} days`);
		this.createStatItem(statsGrid, "Difficulty", schedule.difficulty.toFixed(1));
		if (retrievability !== null) {
			this.createStatItem(statsGrid, "Retrievability", `${Math.round(retrievability * 100)}%`);
		}
		this.createStatItem(statsGrid, "Reviews", String(schedule.reps));
		this.createStatItem(statsGrid, "Lapses", String(schedule.lapses));
	}

	/**
	 * Render session statistics
	 */
	private renderSessionStats(container: HTMLElement, state: SessionState): void {
		const statsSection = container.createDiv({ cls: "fsrs-stats-section" });

		const header = statsSection.createDiv({ cls: "fsrs-stats-header" });
		header.createEl("span", { text: "Session stats" });

		const statsGrid = statsSection.createDiv({ cls: "fsrs-stats-grid" });

		this.createStatItem(statsGrid, "Reviewed", String(state.reviewed));

		const ratingSummary = [
			`A:${state.ratings[1]}`,
			`H:${state.ratings[2]}`,
			`G:${state.ratings[3]}`,
			`E:${state.ratings[4]}`,
		].join(" ");

		this.createStatItem(statsGrid, "Ratings", ratingSummary);
	}

	/**
	 * Render end session button
	 */
	private renderEndSessionButton(container: HTMLElement): void {
		const endSection = container.createDiv({ cls: "fsrs-end-section" });

		const endBtn = endSection.createEl("button", {
			cls: "fsrs-end-button",
			text: "End session",
		});

		endBtn.addEventListener("click", () => {
			this.sessionManager.endSession();
		});
	}

	/**
	 * Helper to create a stat item
	 */
	private createStatItem(parent: HTMLElement, label: string, value: string): void {
		const item = parent.createDiv({ cls: "fsrs-stat-item" });
		item.createEl("span", { cls: "fsrs-stat-label", text: label });
		item.createEl("span", { cls: "fsrs-stat-value", text: value });
	}
}
