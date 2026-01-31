/**
 * Queue Selector Modal - Select queue for review session
 */

import { Modal, App } from "obsidian";
import type { QueueManager } from "../../queues/queue-manager";
import type { Queue } from "../../types";

/**
 * Modal for selecting a queue to start review
 */
export class QueueSelectorModal extends Modal {
	private queueManager: QueueManager;
	private onSelect: (queueId: string) => void;

	constructor(
		app: App,
		queueManager: QueueManager,
		onSelect: (queueId: string) => void
	) {
		super(app);
		this.queueManager = queueManager;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl, modalEl } = this;

		modalEl.addClass("fsrs-queue-selector-modal");
		contentEl.empty();

		// Header
		contentEl.createEl("h2", { text: "Select queue" });
		contentEl.createEl("p", {
			cls: "fsrs-queue-selector-desc",
			text: "Choose a queue to start reviewing",
		});

		// Queue list
		const queues = this.queueManager.getAllQueues();
		const listContainer = contentEl.createDiv({ cls: "fsrs-queue-selector-list" });

		for (const queue of queues) {
			this.renderQueueOption(listContainer, queue);
		}

		// Cancel button
		const cancelBtn = contentEl.createEl("button", {
			cls: "fsrs-queue-selector-cancel",
			text: "Cancel",
		});
		cancelBtn.addEventListener("click", () => this.close());
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Render a queue option
	 */
	private renderQueueOption(container: HTMLElement, queue: Queue): void {
		const stats = this.queueManager.getQueueStats(queue.id);
		const hasDue = stats.dueNotes > 0;

		const option = container.createDiv({
			cls: `fsrs-queue-selector-option ${hasDue ? "" : "fsrs-queue-disabled"}`,
		});

		// Queue info
		const info = option.createDiv({ cls: "fsrs-queue-selector-info" });
		info.createDiv({ cls: "fsrs-queue-selector-name", text: queue.name });

		const statsRow = info.createDiv({ cls: "fsrs-queue-selector-stats" });
		statsRow.createSpan({
			cls: `fsrs-queue-stat ${stats.dueNotes > 0 ? "fsrs-queue-stat-due" : ""}`,
			text: `${stats.dueNotes} due`,
		});
		statsRow.createSpan({ text: `${stats.newNotes} new` });
		statsRow.createSpan({ text: `${stats.totalNotes} total` });

		// Start button
		const startBtn = option.createEl("button", {
			cls: "fsrs-queue-selector-start mod-cta",
			text: "Start",
		});

		if (!hasDue) {
			startBtn.disabled = true;
			startBtn.title = "No cards due for review";
		} else {
			startBtn.addEventListener("click", () => {
				this.onSelect(queue.id);
				this.close();
			});

			// Also make the entire option clickable
			option.addEventListener("click", (e) => {
				if (e.target === option || e.target === info || info.contains(e.target as Node)) {
					this.onSelect(queue.id);
					this.close();
				}
			});
		}
	}
}
